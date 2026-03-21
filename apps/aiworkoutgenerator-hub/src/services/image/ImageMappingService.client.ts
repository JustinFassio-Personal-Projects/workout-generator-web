/**
 * Client-side service for mapping exercise images to workouts.
 * Calls the API endpoint to map images from master_exercise_images.
 *
 * Features:
 * - Request deduplication to prevent duplicate API calls for the same workout
 * - Graceful error handling with fallback to original workout
 * - Token refresh retry on 401 (handles expired tokens)
 * - App Check headers when enabled
 * - Skip API call when unauthenticated (return workout as-is, no error)
 */

import type { User } from "firebase/auth";
import type { TrainerWorkout } from "@/types/firestore";
import { restoreTimestamps } from "@/lib/restore-timestamps";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

// Track in-flight requests to prevent duplicate API calls for the same workout
const inFlightRequests = new Map<string, Promise<TrainerWorkout>>();

/**
 * Simple synchronous hash function for string content.
 * Uses djb2 algorithm variant for good distribution and collision resistance.
 * This is a lightweight alternative to crypto.subtle.digest for synchronous use cases.
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16);
}

/**
 * Generate a cache key for a workout based on its ID or content hash.
 * Uses workout ID if available, otherwise creates a deterministic hash from the workout content.
 *
 * The hash includes distinguishing characteristics (section count, exercise count, exercise names)
 * to minimize collision risk when workout ID is not available.
 */
function getWorkoutCacheKey(workout: TrainerWorkout): string {
  if (workout.id) {
    return `workout:${workout.id}`;
  }

  // Create a deterministic hash from workout content for deduplication
  // Include distinguishing characteristics to minimize collisions
  const sectionCount = workout.sections?.length || 0;
  const exerciseCount =
    workout.sections?.reduce((sum, s) => sum + (s.exercises?.length || 0), 0) ||
    0;
  const exerciseNames =
    workout.sections
      ?.flatMap((s) => s.exercises?.map((e) => e.name) || [])
      .join(",") || "";

  // Create hash from all distinguishing characteristics
  const workoutContent = JSON.stringify({
    sections: sectionCount,
    exercises: exerciseCount,
    names: exerciseNames,
  });

  const hash = simpleHash(workoutContent);
  return `workout:hash:${hash}`;
}

/**
 * Map images to a workout object by calling the API endpoint.
 * This enriches the workout with image_url fields from master_exercise_images.
 *
 * Implements request deduplication to prevent multiple concurrent calls
 * for the same workout.
 *
 * @param workout - The workout object to map images to
 * @param user - Optional Firebase user; when provided, uses this user's token to avoid auth.currentUser timing mismatches
 * @returns The workout object with mapped images
 */
export async function mapWorkoutImages(
  workout: TrainerWorkout,
  user?: User
): Promise<TrainerWorkout> {
  const cacheKey = getWorkoutCacheKey(workout);

  // Check if there's already an in-flight request for this workout
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    try {
      return await inFlight;
    } catch {
      // If the in-flight request failed, we'll retry below
      inFlightRequests.delete(cacheKey);
    }
  }

  // Create new request and track it
  const requestPromise = (async () => {
    try {
      const response = await authenticatedFetch("/api/workouts/map-images", {
        method: "POST",
        body: JSON.stringify({ workout }),
        user,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        const errorMessage =
          errorData.error || `API returned ${response.status}`;

        // Auth errors: throw without logging here; catch block logs once (avoids duplicate - Copilot review)
        const isAuthError = response.status === 401 || response.status === 403;
        if (!isAuthError) {
          console.error(
            `[Image Mapping Client] API error (${response.status}):`,
            errorMessage,
            { workoutId: workout.id }
          );
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success || !data.workout) {
        console.error("[Image Mapping Client] Invalid API response:", data);
        throw new Error("Invalid response from image mapping API");
      }

      // Restore Firestore Timestamps that were serialized during JSON transmission
      const workoutWithImages = restoreTimestamps(
        data.workout
      ) as TrainerWorkout;

      // Log mapping stats if available
      if (data.stats) {
        const { successCount, errorCount } = data.stats;
        if (errorCount > 0) {
          console.warn(
            `[Image Mapping Client] Mapped ${successCount} images with ${errorCount} errors`
          );
        } else if (successCount > 0) {
          console.log(
            `[Image Mapping Client] Successfully mapped ${successCount} images`
          );
        }
      }

      // Verify that images were actually mapped
      const hasMappedImages = workoutWithImages.sections?.some((section) =>
        section.exercises?.some((exercise) => exercise.image_url)
      );
      if (
        !hasMappedImages &&
        workout.sections?.some((section) =>
          section.exercises?.some((exercise) => !exercise.image_url)
        )
      ) {
        console.warn(
          "[Image Mapping Client] Mapping completed but no images were found for exercises that need them"
        );
      }

      return workoutWithImages;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // User not authenticated: return workout silently (expected when not signed in)
      if (errorMessage === "User not authenticated") {
        return workout;
      }

      // Auth errors: warn (token expired, invalid, App Check) - graceful degradation (Copilot: include all requireAppCheck messages)
      if (
        errorMessage.includes("Invalid or expired token") ||
        errorMessage.includes("Missing App Check token") ||
        errorMessage.includes("Invalid App Check token")
      ) {
        console.warn(
          "[Image Mapping Client] Auth failed, using workout without mapped images:",
          errorMessage,
          { workoutId: workout.id }
        );
        return workout;
      }

      // Other errors: log as error
      console.error(
        "[Image Mapping Client] Error mapping workout images:",
        errorMessage,
        { workoutId: workout.id }
      );
      return workout;
    } finally {
      // Remove from in-flight requests
      inFlightRequests.delete(cacheKey);
    }
  })();

  // Track the in-flight request
  inFlightRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * Map images to multiple workouts in parallel.
 * Uses Promise.allSettled to handle partial failures gracefully.
 *
 * @param workouts - Array of workout objects to map images to
 * @param user - Optional Firebase user; when provided, uses this user's token to avoid auth.currentUser timing mismatches
 * @returns Array of workout objects with mapped images
 */
export async function mapWorkoutImagesBatch(
  workouts: TrainerWorkout[],
  user?: User
): Promise<TrainerWorkout[]> {
  if (workouts.length === 0) {
    return [];
  }

  // Map images in parallel using Promise.allSettled
  // This allows us to continue even if some workouts fail
  const results = await Promise.allSettled(
    workouts.map((workout) => mapWorkoutImages(workout, user))
  );

  // Process results and log any failures
  const mappedWorkouts: TrainerWorkout[] = [];
  let errorCount = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      mappedWorkouts.push(result.value);
    } else {
      errorCount++;
      // Use original workout as fallback, if available
      // Safety check: Promise.allSettled guarantees results.length === workouts.length,
      // but defensive programming prevents issues if there's any unexpected mismatch
      if (workouts[i]) {
        mappedWorkouts.push(workouts[i]);
        console.warn(
          `[Image Mapping Client] Failed to map images for workout ${workouts[i]?.id || i}:`,
          result.reason
        );
      } else {
        // Log error if workout is missing (shouldn't happen, but handle gracefully)
        console.error(
          `[Image Mapping Client] Failed to map images for workout at index ${i}, but workout is missing:`,
          result.reason
        );
      }
    }
  }

  if (errorCount > 0) {
    console.warn(
      `[Image Mapping Client] Batch mapping completed with ${errorCount} errors out of ${workouts.length} workouts`
    );
  }

  return mappedWorkouts;
}
