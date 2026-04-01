import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import type { TrainerWorkout } from "@/types/firestore";
import type { SessionSummaryData } from "@/types/sessionSummary";
import type { WorkoutSummary, SummaryAnalytics } from "@/types/workoutSummary";
import type { WeightSelection } from "@/types/autoregulation";

/**
 * Completion data passed from the CompletionModal
 */
export interface CompletionData {
  difficulty_rating?: number;
  enjoyment_rating?: number;
  completion_percentage?: number;
  user_notes?: string;
  session_rpe?: number;
  weight_selection?: WeightSelection;
  session_feedback?: string[];
  joint_pain_location?: string | null;
}

/**
 * Type for Firestore document when writing (timestamps can be FieldValue)
 */
type WorkoutSummaryWriteData = Omit<
  WorkoutSummary,
  "id" | "completed_at" | "created_at" | "updated_at"
> & {
  completed_at: Timestamp | FieldValue;
  created_at: FieldValue;
  updated_at: FieldValue;
};

export class WorkoutSummaryService {
  private static collectionName = "workout_summaries";

  /**
   * Get summaries collection reference
   */
  private static getCollection() {
    return collection(getDbInstance(), this.collectionName);
  }

  /**
   * Get summary document reference
   */
  private static getDocRef(summaryId: string) {
    return doc(getDbInstance(), this.collectionName, summaryId);
  }

  /**
   * Convert SessionSummaryData to Firestore document format
   *
   * @param workout - The workout being completed
   * @param summary - The session report data
   * @param completionData - Optional completion data with ratings (passed directly from modal)
   * @param userId - Optional user ID to use (overrides workout.user_id for security rule compliance)
   */
  private static convertToFirestoreDocument(
    workout: TrainerWorkout,
    summary: SessionSummaryData,
    completionData?: CompletionData,
    userId?: string
  ): WorkoutSummaryWriteData {
    // Determine completed_at timestamp:
    // 1. If workout already has completed_at (shouldn't happen since we call this before markComplete updates)
    // 2. Use summary's completedAt if available
    // 3. Use server timestamp (most common case - workout just completed)
    let completedAtTimestamp: Timestamp | FieldValue;
    if (
      workout.completed_at &&
      typeof workout.completed_at.toDate === "function"
    ) {
      completedAtTimestamp = workout.completed_at as Timestamp;
    } else if (summary.completedAt) {
      completedAtTimestamp = Timestamp.fromDate(summary.completedAt);
    } else {
      // Use server timestamp - Firestore will convert to Timestamp on write
      completedAtTimestamp = serverTimestamp();
    }

    // Use completion data for ratings (passed directly from modal)
    // Fall back to workout data only if completion data not provided
    const difficultyRating =
      completionData?.difficulty_rating ?? workout.difficulty_rating ?? null;
    const enjoymentRating =
      completionData?.enjoyment_rating ?? workout.enjoyment_rating ?? null;
    const userNotes = completionData?.user_notes ?? summary.userNotes;
    const sessionRpe =
      completionData?.session_rpe ?? workout.session_rpe ?? null;
    const weightSelection =
      completionData?.weight_selection ?? workout.weight_selection ?? null;
    const sessionFeedback =
      completionData?.session_feedback ?? workout.session_feedback ?? [];
    const jointPainLocation =
      completionData?.joint_pain_location ??
      workout.joint_pain_location ??
      null;

    // Update stats with completion percentage from completion data if provided
    const stats = {
      ...summary.stats,
      completionPercentage:
        completionData?.completion_percentage ??
        summary.stats.completionPercentage,
    };

    return {
      // Use explicit userId if provided (for security rule compliance), otherwise fall back to workout.user_id
      user_id: userId || workout.user_id,
      workout_id: summary.workoutId,
      title: summary.title,
      focus: summary.focus,
      difficulty: summary.difficulty,
      completed_at: completedAtTimestamp,
      trainer_name: summary.trainerName,
      stats,
      sections: summary.sections,
      user_notes: userNotes,
      difficulty_rating: difficultyRating,
      enjoyment_rating: enjoymentRating,
      session_rpe: sessionRpe,
      weight_selection: weightSelection,
      session_feedback: sessionFeedback,
      joint_pain_location: jointPainLocation,
      // Public sharing fields - default to private
      visibility: "private",
      // Timestamps - serverTimestamp() returns FieldValue, Firestore converts to Timestamp on write
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
  }

  /**
   * Save a session report to Firestore
   *
   * @param workout - The workout being completed
   * @param summary - The session report data
   * @param completionData - Optional completion data with ratings (passed directly from modal)
   * @param userId - Optional user ID to use (for security rule compliance, ensures it matches authenticated user)
   * @returns The document ID of the saved report
   */
  static async saveSummary(
    workout: TrainerWorkout,
    summary: SessionSummaryData,
    completionData?: CompletionData,
    userId?: string
  ): Promise<string> {
    const summaryData = this.convertToFirestoreDocument(
      workout,
      summary,
      completionData,
      userId
    );
    const docRef = await addDoc(this.getCollection(), summaryData);
    return docRef.id;
  }

  /**
   * Filter options for getUserSummaries (optional).
   * Date range uses completed_at; trainer_name and focus require composite indexes.
   */
  static async getUserSummaries(
    userId: string,
    pagination: {
      pageSize: number;
      lastDoc?: QueryDocumentSnapshot<DocumentData>;
      dateFrom?: Date;
      dateTo?: Date;
      trainerName?: string;
      focus?: string;
    } = { pageSize: 20 }
  ): Promise<{
    summaries: WorkoutSummary[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    // Build constraints: equality first, then range on completed_at, then orderBy + limit
    const constraints: Parameters<typeof query>[1][] = [
      where("user_id", "==", userId),
    ];
    if (
      pagination.trainerName != null &&
      pagination.trainerName.trim() !== ""
    ) {
      constraints.push(
        where("trainer_name", "==", pagination.trainerName.trim())
      );
    }
    if (pagination.focus != null && pagination.focus.trim() !== "") {
      constraints.push(where("focus", "==", pagination.focus.trim()));
    }
    if (pagination.dateFrom != null) {
      constraints.push(
        where("completed_at", ">=", Timestamp.fromDate(pagination.dateFrom))
      );
    }
    if (pagination.dateTo != null) {
      constraints.push(
        where("completed_at", "<=", Timestamp.fromDate(pagination.dateTo))
      );
    }
    constraints.push(orderBy("completed_at", "desc"));
    constraints.push(limit(pagination.pageSize + 1));

    let q = query(this.getCollection(), ...constraints);

    // Add pagination cursor
    if (pagination.lastDoc) {
      q = query(q, startAfter(pagination.lastDoc));
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    const hasMore = docs.length > pagination.pageSize;

    // Remove the extra doc if we have more
    const summaries = (hasMore ? docs.slice(0, pagination.pageSize) : docs).map(
      (doc) => ({
        ...doc.data(),
        id: doc.id,
      })
    ) as WorkoutSummary[];

    const lastDoc =
      docs.length > 0
        ? docs[Math.min(docs.length - 1, pagination.pageSize - 1)]
        : null;

    return {
      summaries,
      lastDoc,
      hasMore,
    };
  }

  /**
   * Get a single session report by ID
   */
  static async getSummary(summaryId: string): Promise<WorkoutSummary | null> {
    const docSnap = await getDoc(this.getDocRef(summaryId));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), id: docSnap.id } as WorkoutSummary;
  }

  /**
   * Get session report by workout ID
   * Must filter by user_id to match Firestore security rules
   */
  static async getSummaryByWorkoutId(
    workoutId: string,
    userId: string
  ): Promise<WorkoutSummary | null> {
    const q = query(
      this.getCollection(),
      where("workout_id", "==", workoutId),
      where("user_id", "==", userId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { ...doc.data(), id: doc.id } as WorkoutSummary;
  }

  /**
   * Most recent session report for this workout (by completed_at).
   * Used for "Previous" column on the written workout surface.
   */
  static async getLatestSummaryForWorkout(
    workoutId: string,
    userId: string
  ): Promise<WorkoutSummary | null> {
    const q = query(
      this.getCollection(),
      where("user_id", "==", userId),
      where("workout_id", "==", workoutId),
      orderBy("completed_at", "desc"),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { ...d.data(), id: d.id } as WorkoutSummary;
  }

  /**
   * Update session feedback fields in a session report
   *
   * @param summaryId - The ID of the report to update
   * @param completionData - Partial completion data with session feedback fields
   */
  static async updateSessionFeedback(
    summaryId: string,
    completionData: Partial<CompletionData>
  ): Promise<void> {
    const docRef = this.getDocRef(summaryId);

    // Build update object with only the provided fields
    const updateData: Partial<{
      session_rpe: number | null;
      weight_selection: WeightSelection | null;
      session_feedback: string[];
      joint_pain_location: string | null;
      user_notes: string | null;
      updated_at: FieldValue;
    }> = {
      updated_at: serverTimestamp(),
    };

    // Only include fields that are provided
    if (completionData.session_rpe !== undefined) {
      updateData.session_rpe = completionData.session_rpe ?? null;
    }
    if (completionData.weight_selection !== undefined) {
      updateData.weight_selection = completionData.weight_selection ?? null;
    }
    if (completionData.session_feedback !== undefined) {
      updateData.session_feedback = completionData.session_feedback ?? [];
    }
    if (completionData.joint_pain_location !== undefined) {
      updateData.joint_pain_location =
        completionData.joint_pain_location ?? null;
    }
    if (completionData.user_notes !== undefined) {
      updateData.user_notes = completionData.user_notes ?? null;
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * Calculate analytics from user's session reports
   */
  static async getSummaryAnalytics(userId: string): Promise<SummaryAnalytics> {
    // Fetch all session reports for analytics calculation
    const q = query(
      this.getCollection(),
      where("user_id", "==", userId),
      orderBy("completed_at", "desc")
    );

    const snapshot = await getDocs(q);
    const summaries = snapshot.docs.map(
      (doc) => ({ ...doc.data(), id: doc.id }) as WorkoutSummary
    );

    if (summaries.length === 0) {
      return {
        totalSummaries: 0,
        totalTimeMinutes: 0,
        averageStrainScore: null,
        averageCompletionPercentage: null,
        mostCommonFocus: null,
        mostCommonDifficulty: null,
        summariesThisWeek: 0,
        summariesThisMonth: 0,
      };
    }

    // Calculate totals
    const totalTimeMinutes = summaries.reduce(
      (sum, s) => sum + (s.stats.totalTimeMinutes || 0),
      0
    );

    // Calculate averages
    const strainScores = summaries
      .map((s) => s.stats.strainScore)
      .filter(
        (score): score is number => score !== null && score !== undefined
      );
    const averageStrainScore =
      strainScores.length > 0
        ? strainScores.reduce((sum, score) => sum + score, 0) /
          strainScores.length
        : null;

    const completionPercentages = summaries
      .map((s) => s.stats.completionPercentage)
      .filter((pct): pct is number => pct !== null && pct !== undefined);
    const averageCompletionPercentage =
      completionPercentages.length > 0
        ? completionPercentages.reduce((sum, pct) => sum + pct, 0) /
          completionPercentages.length
        : null;

    // Find most common focus
    const focusCounts = new Map<string, number>();
    summaries.forEach((s) => {
      if (s.focus) {
        focusCounts.set(s.focus, (focusCounts.get(s.focus) || 0) + 1);
      }
    });
    const mostCommonFocus =
      focusCounts.size > 0
        ? Array.from(focusCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // Find most common difficulty
    const difficultyCounts = new Map<
      "beginner" | "intermediate" | "advanced",
      number
    >();
    summaries.forEach((s) => {
      difficultyCounts.set(
        s.difficulty,
        (difficultyCounts.get(s.difficulty) || 0) + 1
      );
    });
    const mostCommonDifficulty =
      difficultyCounts.size > 0
        ? (Array.from(difficultyCounts.entries()).sort(
            (a, b) => b[1] - a[1]
          )[0][0] as "beginner" | "intermediate" | "advanced")
        : null;

    // Calculate recent activity
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const summariesThisWeek = summaries.filter((s) => {
      const completedDate = s.completed_at.toDate();
      return completedDate >= weekAgo;
    }).length;

    const summariesThisMonth = summaries.filter((s) => {
      const completedDate = s.completed_at.toDate();
      return completedDate >= monthAgo;
    }).length;

    return {
      totalSummaries: summaries.length,
      totalTimeMinutes,
      averageStrainScore,
      averageCompletionPercentage,
      mostCommonFocus,
      mostCommonDifficulty,
      summariesThisWeek,
      summariesThisMonth,
    };
  }
}
