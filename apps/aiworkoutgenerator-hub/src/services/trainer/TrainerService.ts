import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { getAppCheckHeaders } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import type { TrainerWorkout, TrainerWorkoutSection } from "@/types/firestore";
import type { OverloadProtocol } from "@/types/overloadProtocol";

export type GenerateWorkoutInput = {
  trainerId: string; // AI trainer persona ID
  focus: string | null; // Specific focus or null for blend mode
  duration_minutes: number;
  equipment_access?: string[]; // Optional override (category strings)
  available_equipment?: string[]; // Optional override
  user_notes?: string; // Optional notes for AI
  model?: string; // Optional: Gemini model to use (e.g., "googleai/gemini-3-pro")

  // Iteration parameters (optional - for iterate mode)
  iteration_source_summary_id?: string; // ID of the workout summary to iterate from
  overload_protocol?: OverloadProtocol;
};

type GenerateWorkoutResponse = {
  workoutId: string;
  title: string;
  exerciseCount: number;
};

type ErrorResponse = {
  error: string;
  message?: string;
  actionable?: string;
  details?: unknown;
  tier?: string;
  remaining?: number;
  retryable?: boolean;
  /** Stable machine code from Hub (e.g. reverse-trial enforcement). */
  code?: string;
};

interface ErrorWithMetadata extends Error {
  actionable?: string;
  retryable?: boolean;
  /** Set when Hub returns 403 `reverse_trial_ai_blocked` (Phase 3 paywall UX). */
  reverseTrialAiBlocked?: boolean;
}

export class TrainerService {
  static workoutDoc(workoutId: string) {
    return doc(getDbInstance(), "trainer_workouts", workoutId);
  }

  static async getTrainerWorkout(
    workoutId: string
  ): Promise<TrainerWorkout | null> {
    const snap = await getDoc(TrainerService.workoutDoc(workoutId));
    return snap.exists() ? (snap.data() as TrainerWorkout) : null;
  }

  /**
   * Generate a new workout using AI.
   *
   * Calls the /api/workouts/generate API route which:
   * 1. Validates the request
   * 2. Fetches user profile and daily state
   * 3. Generates exercises using Genkit/Gemini
   * 4. Saves the workout to Firestore
   *
   * @param input - Workout generation parameters
   * @returns The generated workout ID
   * @throws Error if generation fails or user is not authenticated
   */
  static async generateWorkout(input: GenerateWorkoutInput): Promise<string> {
    // Get the current user's ID token for authentication
    const idToken = await getIdToken();

    if (!idToken) {
      throw new Error("You must be signed in to generate a workout");
    }

    // Call the API route (include App Check token when enabled)
    const response = await fetch("/api/workouts/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        ...(await getAppCheckHeaders()),
      },
      body: JSON.stringify(input),
    });

    // Parse response
    const data = (await response.json()) as
      | GenerateWorkoutResponse
      | ErrorResponse;

    // Handle errors
    if (!response.ok) {
      const errorData = data as ErrorResponse;

      if (
        response.status === 403 &&
        errorData.code === "reverse_trial_ai_blocked"
      ) {
        const msg =
          errorData.message ||
          "Your trial period has ended. Upgrade to continue using AI workout generation.";
        const e = new Error(msg) as ErrorWithMetadata;
        e.reverseTrialAiBlocked = true;
        throw e;
      }

      // Provide more specific error messages based on error type
      if (response.status === 429) {
        // Check if it's a subscription limit or AI service limit
        if (errorData.error === "Workout limit reached") {
          // Subscription-based rate limit
          throw new Error(
            errorData.message ||
              `You've reached your workout limit. ${errorData.remaining !== undefined ? `${errorData.remaining} remaining.` : "Upgrade for more workouts."}`
          );
        } else if (errorData.error === "AI service rate limit exceeded") {
          // AI service rate limit (transient)
          throw new Error(
            errorData.message ||
              "The AI service is temporarily at capacity. Please wait a few minutes and try again."
          );
        } else {
          // Generic 429 error
          throw new Error(
            errorData.message ||
              errorData.error ||
              "Too many requests. Please wait a moment and try again."
          );
        }
      }

      // For other errors, combine error message with actionable guidance
      const errorMessage =
        errorData.message || errorData.error || "Failed to generate workout";
      const actionableGuidance = errorData.actionable
        ? ` ${errorData.actionable}`
        : "";
      const fullMessage = errorMessage + actionableGuidance;

      // Create error with additional metadata
      const error = new Error(fullMessage) as ErrorWithMetadata;
      error.actionable = errorData.actionable;
      error.retryable = errorData.retryable ?? false;
      throw error;
    }

    // Return the workout ID
    const successData = data as GenerateWorkoutResponse;
    if (!successData.workoutId) {
      throw new Error("generateWorkout did not return workoutId");
    }

    return successData.workoutId;
  }

  /**
   * Update workout sections (for saving weight tracking data).
   *
   * @param workoutId - The workout document ID
   * @param sections - Updated sections array with set details
   */
  static async updateWorkoutSections(
    workoutId: string,
    sections: TrainerWorkoutSection[]
  ): Promise<void> {
    const ref = TrainerService.workoutDoc(workoutId);
    await updateDoc(ref, {
      sections,
      updated_at: serverTimestamp(),
    });
  }

  /**
   * Update a workout document with partial data.
   *
   * @param workoutId - The workout document ID
   * @param updates - Partial workout data to update
   */
  static async updateWorkout(
    workoutId: string,
    updates: Partial<TrainerWorkout>
  ): Promise<void> {
    const ref = TrainerService.workoutDoc(workoutId);
    await updateDoc(ref, {
      ...updates,
      updated_at: serverTimestamp(),
    });
  }
}

/** True when {@link TrainerService.generateWorkout} failed with Hub `reverse_trial_ai_blocked`. */
export function isReverseTrialAiBlockedError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "reverseTrialAiBlocked" in err &&
    (err as { reverseTrialAiBlocked?: boolean }).reverseTrialAiBlocked === true
  );
}
