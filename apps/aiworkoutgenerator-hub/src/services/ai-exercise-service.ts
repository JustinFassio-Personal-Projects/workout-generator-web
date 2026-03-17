import { getIdToken } from "@/lib/auth";
import type {
  AIEditRequest,
  AIEditResponse,
  AISwapRequest,
  AISwapResponse,
  AIAddRequest,
  AIAddResponse,
  AIOrderCheckResponse,
  ExerciseAIEditHistory,
  ExerciseAIAddHistoryEntry,
} from "@/types/ai-exercise-editor";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { Timestamp } from "firebase/firestore";

/**
 * Client service for AI exercise editing operations.
 *
 * This service wraps the API routes for AI exercise editing, swapping, and applying edits.
 * It handles authentication, error handling, and response parsing.
 */
export class AIExerciseService {
  /**
   * Get the API base URL.
   * In browser, uses relative URLs. Can be overridden with NEXT_PUBLIC_API_URL env var.
   */
  private static getApiBase(): string {
    return process.env.NEXT_PUBLIC_API_URL || "";
  }

  /**
   * Get the current user's ID token for authentication.
   * @throws Error if user is not authenticated
   */
  private static async getAuthToken(): Promise<string> {
    const token = await getIdToken();
    if (!token) {
      throw new Error("You must be signed in to use AI exercise editing");
    }
    return token;
  }

  /**
   * Handle API error responses.
   */
  private static async handleError(response: Response): Promise<never> {
    let errorData: {
      error: string;
      message?: string;
      details?: unknown;
      waiver_url?: string;
      tier?: string;
      remaining?: number;
    };

    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, create a generic error
      errorData = {
        error: "Unknown error",
        message: `Request failed with status ${response.status}`,
      };
    }

    // Handle specific error types
    if (response.status === 401) {
      throw new Error(errorData.message || "Authentication required");
    }

    if (response.status === 403) {
      if (errorData.waiver_url) {
        const error = new Error(
          errorData.message || "Waiver agreement required"
        ) as Error & {
          waiver_url?: string;
          waiver_version?: string;
        };
        error.waiver_url = errorData.waiver_url;
        const errorWithVersion = errorData as {
          waiver_version?: string;
        };
        error.waiver_version = errorWithVersion.waiver_version;
        throw error;
      }
      // Quota/rate-limit 403 (e.g. free-tier limit); attach tier/remaining so UI can show correct modal
      if (errorData.tier !== undefined || errorData.remaining !== undefined) {
        const err = new Error(
          errorData.message ||
            "You don't have permission to perform this action"
        ) as Error & { tier?: string; remaining?: number };
        err.tier = errorData.tier;
        err.remaining = errorData.remaining;
        throw err;
      }
      throw new Error(
        errorData.message || "You don't have permission to perform this action"
      );
    }

    if (response.status === 429) {
      const error = new Error(
        errorData.message || "Rate limit reached"
      ) as Error & { tier?: string; remaining?: number };
      error.tier = errorData.tier;
      error.remaining = errorData.remaining;
      throw error;
    }

    if (response.status === 404) {
      throw new Error(errorData.message || "Resource not found");
    }

    if (response.status === 400) {
      throw new Error(
        errorData.message || errorData.error || "Invalid request"
      );
    }

    // Generic error
    throw new Error(
      errorData.message || errorData.error || "An error occurred"
    );
  }

  /**
   * Generate an edited version of an exercise using AI.
   *
   * @param workoutId - The workout ID containing the exercise
   * @param sectionIndex - Index of the section containing the exercise
   * @param exerciseIndex - Index of the exercise within the section
   * @param editRequest - The edit request with mode, prompt, and options
   * @returns The AI edit response with modified exercise
   * @throws Error if the request fails or user is not authenticated
   */
  static async generateExerciseEdit(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    editRequest: AIEditRequest
  ): Promise<AIEditResponse> {
    const token = await this.getAuthToken();

    const response = await fetch(
      `${this.getApiBase()}/api/workouts/ai-exercise-edit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
          section_index: sectionIndex,
          exercise_index: exerciseIndex,
          edit_request: editRequest,
        }),
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.success || !data.modified_exercise) {
      throw new Error("Invalid response from AI edit endpoint");
    }

    return data as AIEditResponse;
  }

  /**
   * Generate swap suggestions for an exercise using AI.
   *
   * @param workoutId - The workout ID containing the exercise
   * @param sectionIndex - Index of the section containing the exercise
   * @param exerciseIndex - Index of the exercise within the section
   * @param swapRequest - The swap request with reason and constraints
   * @returns The AI swap response with suggested alternatives
   * @throws Error if the request fails or user is not authenticated
   */
  static async generateExerciseSwap(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    swapRequest: AISwapRequest
  ): Promise<AISwapResponse> {
    const token = await this.getAuthToken();

    const response = await fetch(
      `${this.getApiBase()}/api/workouts/ai-exercise-swap`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
          section_index: sectionIndex,
          exercise_index: exerciseIndex,
          swap_request: swapRequest,
        }),
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.success || !data.suggestions) {
      throw new Error("Invalid response from AI swap endpoint");
    }

    return data as AISwapResponse;
  }

  /**
   * Generate add-exercise suggestions using AI.
   *
   * @param workoutId - The workout ID
   * @param sectionIndex - Section containing the reference exercise
   * @param exerciseIndex - Reference exercise index (add before/after this)
   * @param addRequest - Add request with reason and constraints
   * @returns The AI add response with suggestions
   */
  static async generateExerciseAdd(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    addRequest: AIAddRequest
  ): Promise<AIAddResponse> {
    const token = await this.getAuthToken();

    const response = await fetch(
      `${this.getApiBase()}/api/workouts/ai-exercise-add`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
          section_index: sectionIndex,
          exercise_index: exerciseIndex,
          add_request: {
            reason: addRequest.reason,
            constraints: addRequest.constraints,
          },
        }),
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();
    if (!data.success || !data.suggestions) {
      throw new Error("Invalid response from AI add endpoint");
    }

    return data as AIAddResponse;
  }

  /**
   * Apply an added exercise to the workout (insert at position).
   *
   * @param workoutId - The workout ID
   * @param sectionIndex - Section index
   * @param insertPosition - Index at which to insert the new exercise
   * @param newExercise - The exercise to add
   * @param editHistory - The add history entry to record
   */
  static async applyExerciseAdd(
    workoutId: string,
    sectionIndex: number,
    insertPosition: number,
    newExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIAddHistoryEntry
  ): Promise<void> {
    const token = await this.getAuthToken();

    let appliedAtString: string;
    const appliedAt = editHistory.applied_at;
    if (
      appliedAt &&
      typeof appliedAt === "object" &&
      "toDate" in appliedAt &&
      typeof (appliedAt as { toDate?: unknown }).toDate === "function"
    ) {
      appliedAtString = (appliedAt as Timestamp).toDate().toISOString();
    } else if (appliedAt instanceof Date) {
      appliedAtString = appliedAt.toISOString();
    } else {
      appliedAtString = new Date().toISOString();
    }

    const editHistorySerialized = {
      ...editHistory,
      applied_at: appliedAtString,
    };

    const response = await fetch(
      `${this.getApiBase()}/api/workouts/ai-exercise-apply-add`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
          section_index: sectionIndex,
          insert_position: insertPosition,
          new_exercise: newExercise,
          edit_history: editHistorySerialized,
        }),
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Failed to add exercise");
    }
  }

  /**
   * Check if an exercise is safely positioned in the section order.
   *
   * @param workoutId - The workout ID
   * @param sectionIndex - Section index
   * @param exerciseIndex - Exercise index within the section
   * @returns Order check result with safety analysis
   */
  static async checkExerciseOrder(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number
  ): Promise<AIOrderCheckResponse> {
    const token = await this.getAuthToken();

    const response = await fetch(
      `${this.getApiBase()}/api/workouts/ai-exercise-order-check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
          section_index: sectionIndex,
          exercise_index: exerciseIndex,
        }),
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();
    if (!data.success || typeof data.isSafe !== "boolean") {
      throw new Error("Invalid response from AI order check endpoint");
    }

    return data as AIOrderCheckResponse;
  }

  /**
   * Apply a modified exercise to the workout.
   *
   * This method applies a previously generated edit/swap to the workout and records
   * the edit history for audit purposes.
   *
   * @param workoutId - The workout ID containing the exercise
   * @param sectionIndex - Index of the section containing the exercise
   * @param exerciseIndex - Index of the exercise within the section
   * @param modifiedExercise - The modified exercise to apply
   * @param editHistory - The edit history entry to record
   * @throws Error if the request fails or user is not authenticated
   */
  static async applyExerciseEdit(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    modifiedExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIEditHistory
  ): Promise<void> {
    const token = await this.getAuthToken();

    // Convert Firestore Timestamp to ISO string for JSON serialization
    // Check if applied_at is a Firestore Timestamp (has toDate method) or Date
    let appliedAtString: string;
    const appliedAt = editHistory.applied_at;
    if (
      appliedAt &&
      typeof appliedAt === "object" &&
      "toDate" in appliedAt &&
      typeof (appliedAt as { toDate?: unknown }).toDate === "function"
    ) {
      // Firestore Timestamp
      appliedAtString = (appliedAt as Timestamp).toDate().toISOString();
    } else if (appliedAt instanceof Date) {
      appliedAtString = appliedAt.toISOString();
    } else {
      appliedAtString = new Date().toISOString();
    }

    const editHistorySerialized = {
      ...editHistory,
      applied_at: appliedAtString,
    };

    const response = await fetch(
      `${this.getApiBase()}/api/workouts/ai-exercise-apply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
          section_index: sectionIndex,
          exercise_index: exerciseIndex,
          modified_exercise: modifiedExercise,
          edit_history: editHistorySerialized,
        }),
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();

    // Validate response
    if (!data.success) {
      throw new Error(data.message || "Failed to apply exercise edit");
    }
  }

  /**
   * Submit user feedback (rating and optional text) for an AI edit.
   *
   * @param workoutId - The workout ID containing the exercise
   * @param sectionIndex - Index of the section containing the exercise
   * @param exerciseIndex - Index of the exercise within the section
   * @param editId - The edit ID from the edit history entry
   * @param rating - The user rating (1-5)
   * @param feedback - Optional feedback text
   * @throws Error if the request fails or user is not authenticated
   */
  static async submitEditRating(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    editId: string,
    rating: number,
    feedback: string | null = null
  ): Promise<void> {
    const token = await this.getAuthToken();

    const response = await fetch(
      `${this.getApiBase()}/api/workouts/ai-exercise-apply-rating`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
          section_index: sectionIndex,
          exercise_index: exerciseIndex,
          edit_id: editId,
          user_rating: rating,
          user_feedback: feedback,
        }),
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();

    // Validate response
    if (!data.success) {
      throw new Error(data.message || "Failed to submit rating");
    }
  }
}
