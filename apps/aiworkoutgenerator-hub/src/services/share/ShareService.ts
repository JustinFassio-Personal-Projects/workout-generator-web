import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import type { TrainerWorkout } from "@/types/firestore";
import type { WorkoutSummary } from "@/types/workoutSummary";

// ============================================
// Types
// ============================================

export type ShareOption = "summary_only" | "summary_and_workout";

export interface ShareStatus {
  summaryIsPublic: boolean;
  workoutIsPublic: boolean;
  summaryPublishedAt: Date | null;
  workoutPublishedAt: Date | null;
}

export interface PublishResult {
  success: boolean;
  summaryId: string;
  workoutId?: string;
  error?: string;
}

// ============================================
// Service Class
// ============================================

export class ShareService {
  private static summaryCollection = "workout_summaries";
  private static workoutCollection = "trainer_workouts";

  /**
   * Get summary document reference
   */
  private static getSummaryDocRef(summaryId: string) {
    return doc(getDbInstance(), this.summaryCollection, summaryId);
  }

  /**
   * Get workout document reference
   */
  private static getWorkoutDocRef(workoutId: string) {
    return doc(getDbInstance(), this.workoutCollection, workoutId);
  }

  /**
   * Convert Firestore Timestamp to Date safely
   */
  private static timestampToDate(
    timestamp: Timestamp | null | undefined
  ): Date | null {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }
    // Handle serialized timestamp (from Firestore JSON serialization)
    const serialized = timestamp as { seconds?: number };
    if (typeof serialized.seconds === "number") {
      return new Date(serialized.seconds * 1000);
    }
    return null;
  }

  /**
   * Get the current share status for a summary and optionally its workout
   */
  static async getShareStatus(
    summaryId: string,
    workoutId?: string
  ): Promise<ShareStatus> {
    const summaryDoc = await getDoc(this.getSummaryDocRef(summaryId));

    if (!summaryDoc.exists()) {
      throw new Error("Summary not found");
    }

    const summaryData = summaryDoc.data() as WorkoutSummary;

    let workoutIsPublic = false;
    let workoutPublishedAt: Date | null = null;

    if (workoutId) {
      const workoutDoc = await getDoc(this.getWorkoutDocRef(workoutId));
      if (workoutDoc.exists()) {
        const workoutData = workoutDoc.data() as TrainerWorkout;
        workoutIsPublic = workoutData.visibility === "public";
        workoutPublishedAt = this.timestampToDate(workoutData.published_at);
      }
    }

    return {
      summaryIsPublic: summaryData.visibility === "public",
      workoutIsPublic,
      summaryPublishedAt: this.timestampToDate(summaryData.published_at),
      workoutPublishedAt,
    };
  }

  /**
   * Publish a summary only (Option 1)
   * Makes the session report public while keeping the workout private
   */
  static async publishSummaryOnly(summaryId: string): Promise<PublishResult> {
    try {
      const summaryRef = this.getSummaryDocRef(summaryId);

      await updateDoc(summaryRef, {
        visibility: "public",
        published_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      return {
        success: true,
        summaryId,
      };
    } catch (error) {
      console.error("Failed to publish summary:", error);
      return {
        success: false,
        summaryId,
        error:
          error instanceof Error ? error.message : "Failed to publish summary",
      };
    }
  }

  /**
   * Publish both summary and workout (Option 2)
   * Makes both the session report and the workout public
   * Uses a batch write to ensure atomicity
   */
  static async publishSummaryAndWorkout(
    summaryId: string,
    workoutId: string
  ): Promise<PublishResult> {
    try {
      const db = getDbInstance();
      const batch = writeBatch(db);

      const summaryRef = this.getSummaryDocRef(summaryId);
      const workoutRef = this.getWorkoutDocRef(workoutId);

      // Update summary
      batch.update(summaryRef, {
        visibility: "public",
        published_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Update workout
      batch.update(workoutRef, {
        visibility: "public",
        published_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        summaryId,
        workoutId,
      };
    } catch (error) {
      console.error("Failed to publish summary and workout:", error);
      return {
        success: false,
        summaryId,
        workoutId,
        error: error instanceof Error ? error.message : "Failed to publish",
      };
    }
  }

  /**
   * Publish content based on the selected option
   */
  static async publish(
    option: ShareOption,
    summaryId: string,
    workoutId?: string
  ): Promise<PublishResult> {
    if (option === "summary_only") {
      return this.publishSummaryOnly(summaryId);
    }

    if (option === "summary_and_workout") {
      if (!workoutId) {
        return {
          success: false,
          summaryId,
          error:
            "Workout ID is required for publishing both summary and workout",
        };
      }
      return this.publishSummaryAndWorkout(summaryId, workoutId);
    }

    return {
      success: false,
      summaryId,
      error: "Invalid share option",
    };
  }

  /**
   * Unpublish a summary (and optionally its workout)
   * Reverts visibility to private
   */
  static async unpublish(
    summaryId: string,
    workoutId?: string
  ): Promise<PublishResult> {
    try {
      const db = getDbInstance();
      const batch = writeBatch(db);

      const summaryRef = this.getSummaryDocRef(summaryId);

      // Unpublish summary
      batch.update(summaryRef, {
        visibility: "private",
        updated_at: serverTimestamp(),
      });

      // Optionally unpublish workout
      if (workoutId) {
        const workoutRef = this.getWorkoutDocRef(workoutId);
        batch.update(workoutRef, {
          visibility: "private",
          updated_at: serverTimestamp(),
        });
      }

      await batch.commit();

      return {
        success: true,
        summaryId,
        workoutId,
      };
    } catch (error) {
      console.error("Failed to unpublish:", error);
      return {
        success: false,
        summaryId,
        workoutId,
        error: error instanceof Error ? error.message : "Failed to unpublish",
      };
    }
  }

  /**
   * Check if a summary exists and belongs to the current user
   * Returns the summary data if valid, throws error otherwise
   */
  static async validateSummaryOwnership(
    summaryId: string,
    userId: string
  ): Promise<WorkoutSummary> {
    const summaryDoc = await getDoc(this.getSummaryDocRef(summaryId));

    if (!summaryDoc.exists()) {
      throw new Error("Summary not found");
    }

    const summaryData = {
      ...summaryDoc.data(),
      id: summaryDoc.id,
    } as WorkoutSummary;

    if (summaryData.user_id !== userId) {
      throw new Error("You do not have permission to share this summary");
    }

    return summaryData;
  }

  /**
   * Check if a workout exists and belongs to the current user
   * Returns the workout data if valid, throws error otherwise
   */
  static async validateWorkoutOwnership(
    workoutId: string,
    userId: string
  ): Promise<TrainerWorkout> {
    const workoutDoc = await getDoc(this.getWorkoutDocRef(workoutId));

    if (!workoutDoc.exists()) {
      throw new Error("Workout not found");
    }

    const workoutData = {
      ...workoutDoc.data(),
      id: workoutDoc.id,
    } as TrainerWorkout;

    if (workoutData.user_id !== userId) {
      throw new Error("You do not have permission to share this workout");
    }

    return workoutData;
  }
}
