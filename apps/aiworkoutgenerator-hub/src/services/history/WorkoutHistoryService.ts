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
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import type { TrainerWorkout } from "@/types/firestore";
import type { WeightSelection } from "@/types/autoregulation";

// ============================================
// Types
// ============================================

export type WorkoutStatus = "completed" | "scheduled" | "draft";

export type WorkoutFocusFilter =
  | "all"
  | "strength"
  | "cardio"
  | "hiit"
  | "flexibility"
  | "yoga";

export type DurationFilter = "all" | "quick" | "standard" | "long";

export type DateRangeFilter = "7d" | "30d" | "90d" | "all";

export type SortOption =
  | "newest"
  | "oldest"
  | "duration_asc"
  | "duration_desc"
  | "difficulty";

export interface WorkoutHistoryFilters {
  status?: WorkoutStatus | "all";
  focus?: WorkoutFocusFilter;
  duration?: DurationFilter;
  dateRange?: DateRangeFilter;
  sort?: SortOption;
}

export interface WorkoutHistoryPagination {
  pageSize: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

export interface WorkoutHistoryResult {
  workouts: TrainerWorkout[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface WorkoutStats {
  totalWorkouts: number;
  completedWorkouts: number;
  workoutsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  totalCalories: number;
}

export interface CompletionRatings {
  difficulty_rating?: number; // 1-10
  enjoyment_rating?: number; // 1-10
  completion_percentage?: number; // 0-100
  user_notes?: string;
  session_rpe?: number; // 1-10 sRPE
  weight_selection?: WeightSelection;
  session_feedback?: string[];
  joint_pain_location?: string | null;
}

// ============================================
// Helper Functions
// ============================================

function getDateFromRange(range: DateRangeFilter): Date | null {
  if (range === "all") return null;

  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function getWorkoutStatus(workout: TrainerWorkout): WorkoutStatus {
  if (workout.completed) return "completed";
  if (workout.scheduled_for) return "scheduled";
  return "draft";
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function calculateStreak(completedDates: Date[]): {
  current: number;
  longest: number;
} {
  if (completedDates.length === 0) return { current: 0, longest: 0 };

  // Sort dates descending (most recent first)
  const sortedDates = [...completedDates].sort(
    (a, b) => b.getTime() - a.getTime()
  );

  // Normalize dates to start of day
  const normalizedDates = sortedDates.map((d) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized.getTime();
  });

  // Remove duplicates (multiple workouts on same day)
  const uniqueDays = [...new Set(normalizedDates)];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const yesterday = todayTime - 24 * 60 * 60 * 1000;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak
  // A streak is only valid if the most recent workout was today or yesterday
  if (uniqueDays[0] >= yesterday) {
    // Start from the most recent workout day
    let expectedDay = uniqueDays[0];

    for (const dayTime of uniqueDays) {
      // Check if this workout day matches the expected day in the streak
      if (dayTime === expectedDay) {
        currentStreak++;
        // Move expected day back by one day for next iteration
        expectedDay = dayTime - 24 * 60 * 60 * 1000;
      } else if (currentStreak > 0) {
        // Found a gap in the streak, stop counting
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 0; i < uniqueDays.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const diff = uniqueDays[i - 1] - uniqueDays[i];
      if (diff === 24 * 60 * 60 * 1000) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return { current: currentStreak, longest: longestStreak };
}

// ============================================
// Service Class
// ============================================

export class WorkoutHistoryService {
  private static collectionName = "trainer_workouts";

  /**
   * Get workouts collection reference
   */
  private static getCollection() {
    return collection(getDbInstance(), this.collectionName);
  }

  /**
   * Get workout document reference
   */
  private static getDocRef(workoutId: string) {
    return doc(getDbInstance(), this.collectionName, workoutId);
  }

  /**
   * Fetch user's workout history with filters and pagination
   */
  static async getUserWorkouts(
    userId: string,
    filters: WorkoutHistoryFilters = {},
    pagination: WorkoutHistoryPagination = { pageSize: 20 }
  ): Promise<WorkoutHistoryResult> {
    const {
      status = "all",
      focus = "all",
      duration = "all",
      dateRange = "all",
      sort = "newest",
    } = filters;

    // Build base query
    let q = query(
      this.getCollection(),
      where("user_id", "==", userId),
      orderBy("created_at", sort === "oldest" ? "asc" : "desc"),
      limit(pagination.pageSize + 1) // Fetch one extra to check hasMore
    );

    // Add date range filter
    const startDate = getDateFromRange(dateRange);
    if (startDate) {
      q = query(
        this.getCollection(),
        where("user_id", "==", userId),
        where("created_at", ">=", Timestamp.fromDate(startDate)),
        orderBy("created_at", sort === "oldest" ? "asc" : "desc"),
        limit(pagination.pageSize + 1)
      );
    }

    // Add pagination cursor
    if (pagination.lastDoc) {
      q = query(q, startAfter(pagination.lastDoc));
    }

    const snapshot = await getDocs(q);
    let workouts = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as TrainerWorkout[];

    // Client-side filtering for fields that can't be efficiently indexed together
    if (status !== "all") {
      workouts = workouts.filter((w) => getWorkoutStatus(w) === status);
    }

    if (focus !== "all") {
      workouts = workouts.filter(
        (w) => w.focus?.toLowerCase() === focus.toLowerCase()
      );
    }

    if (duration !== "all") {
      workouts = workouts.filter((w) => {
        const mins = w.duration_minutes;
        // Handle undefined/null duration_minutes
        if (mins == null) return false;
        // Use consistent ranges matching hook implementation and label expectations
        switch (duration) {
          case "quick":
            return mins < 30; // 0-29 minutes
          case "standard":
            return mins >= 30 && mins <= 45; // 30-45 minutes (inclusive)
          case "long":
            return mins > 45; // 46+ minutes
          default:
            return true;
        }
      });
    }

    // Client-side sorting for non-date fields
    if (sort === "duration_asc") {
      workouts.sort((a, b) => a.duration_minutes - b.duration_minutes);
    } else if (sort === "duration_desc") {
      workouts.sort((a, b) => b.duration_minutes - a.duration_minutes);
    } else if (sort === "difficulty") {
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
      workouts.sort(
        (a, b) =>
          (difficultyOrder[a.difficulty] || 0) -
          (difficultyOrder[b.difficulty] || 0)
      );
    }

    // Determine if there are more results based on filtered workouts
    // If we have more than pageSize after filtering, there are more results
    const hasMore = workouts.length > pagination.pageSize;
    if (hasMore) {
      workouts = workouts.slice(0, pagination.pageSize);
    }

    const lastDoc =
      snapshot.docs.length > 0
        ? snapshot.docs[
            Math.min(snapshot.docs.length - 1, pagination.pageSize - 1)
          ]
        : null;

    return {
      workouts,
      lastDoc,
      hasMore,
    };
  }

  /**
   * Get a single workout by ID
   */
  static async getWorkout(workoutId: string): Promise<TrainerWorkout | null> {
    const docSnap = await getDoc(this.getDocRef(workoutId));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), id: docSnap.id } as TrainerWorkout;
  }

  /**
   * Delete a workout
   */
  static async deleteWorkout(workoutId: string): Promise<void> {
    await deleteDoc(this.getDocRef(workoutId));
  }

  /**
   * Repeat/clone a workout for a new session
   */
  static async repeatWorkout(workoutId: string): Promise<string> {
    const original = await this.getWorkout(workoutId);
    if (!original) {
      throw new Error("Original workout not found");
    }

    // Remove id and reset status fields, timestamps will be set separately

    const workoutBase = { ...original };
    delete (workoutBase as Partial<TrainerWorkout>).id;
    delete (workoutBase as Partial<TrainerWorkout>).created_at;
    delete (workoutBase as Partial<TrainerWorkout>).updated_at;

    // Clone the workout with reset status and new timestamps
    const newWorkoutData = {
      ...workoutBase,
      completed: false,
      completed_at: null,
      scheduled_for: null,
      difficulty_rating: null,
      enjoyment_rating: null,
      completion_percentage: null,
      user_notes: null,
      session_rpe: null,
      weight_selection: null,
      session_feedback: [] as string[],
      joint_pain_location: null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    const docRef = await addDoc(this.getCollection(), newWorkoutData);
    return docRef.id;
  }

  /**
   * Mark a workout as complete with optional ratings
   */
  static async markComplete(
    workoutId: string,
    ratings: CompletionRatings = {}
  ): Promise<void> {
    // Using Record type to allow FieldValue from serverTimestamp()
    const updates: Record<string, unknown> = {
      completed: true,
      completed_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    if (ratings.difficulty_rating !== undefined) {
      updates.difficulty_rating = ratings.difficulty_rating;
    }
    if (ratings.enjoyment_rating !== undefined) {
      updates.enjoyment_rating = ratings.enjoyment_rating;
    }
    if (ratings.completion_percentage !== undefined) {
      updates.completion_percentage = ratings.completion_percentage;
    }
    if (ratings.user_notes !== undefined) {
      updates.user_notes = ratings.user_notes;
    }
    if (ratings.session_rpe !== undefined) {
      updates.session_rpe = ratings.session_rpe;
    }
    if (ratings.weight_selection !== undefined) {
      updates.weight_selection = ratings.weight_selection;
    }
    if (ratings.session_feedback !== undefined) {
      updates.session_feedback = ratings.session_feedback;
    }
    if (ratings.joint_pain_location !== undefined) {
      updates.joint_pain_location = ratings.joint_pain_location;
    }

    await updateDoc(this.getDocRef(workoutId), updates);
  }

  /**
   * Get workout statistics for a user
   */
  static async getWorkoutStats(userId: string): Promise<WorkoutStats> {
    // Fetch all user workouts (for stats calculation)
    const q = query(
      this.getCollection(),
      where("user_id", "==", userId),
      orderBy("created_at", "desc")
    );

    const snapshot = await getDocs(q);
    const workouts = snapshot.docs.map((doc) => doc.data()) as TrainerWorkout[];

    const completedWorkouts = workouts.filter((w) => w.completed);
    const startOfWeek = getStartOfWeek();

    const workoutsThisWeek = completedWorkouts.filter((w) => {
      if (!w.completed_at) return false;
      const completedDate = w.completed_at.toDate();
      return completedDate >= startOfWeek;
    });

    // Calculate streaks from completed dates
    const completedDates = completedWorkouts
      .filter((w) => w.completed_at)
      .map((w) => w.completed_at!.toDate());

    const { current: currentStreak, longest: longestStreak } =
      calculateStreak(completedDates);

    // Calculate totals
    const totalMinutes = completedWorkouts.reduce(
      (sum, w) => sum + (w.totalDuration || w.duration_minutes || 0),
      0
    );

    const totalCalories = completedWorkouts.reduce(
      (sum, w) => sum + (w.estimatedCalories || 0),
      0
    );

    return {
      totalWorkouts: workouts.length,
      completedWorkouts: completedWorkouts.length,
      workoutsThisWeek: workoutsThisWeek.length,
      currentStreak,
      longestStreak,
      totalMinutes,
      totalCalories,
    };
  }

  /**
   * Get recent workouts (for dashboard widget)
   */
  static async getRecentWorkouts(
    userId: string,
    count: number = 3
  ): Promise<TrainerWorkout[]> {
    const q = query(
      this.getCollection(),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(count)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as TrainerWorkout[];
  }
}
