/**
 * Firestore trigger that fires when master_exercise_images documents are deleted.
 * Automatically updates workouts to use the next available certified image,
 * or clears image_url if no other certified images exist.
 */

import * as functions from "firebase-functions";
import {
  syncWorkoutsForExercise,
  clearWorkoutImagesForExercise,
} from "./syncWorkoutsForExercise";

/**
 * Cloud Function: Clear image URLs from workouts when master_exercise_images document is deleted.
 *
 * Triggers on:
 * - Image deletion from master_exercise_images collection
 *
 * Automatically clears image_url from all workouts containing the exercise.
 */
export const onMasterImageDeleted = functions.firestore
  .document("master_exercise_images/{imageId}")
  .onDelete(async (snap, context) => {
    const imageId = context.params.imageId;
    const imageData = snap.data();

    const exerciseName = imageData?.exercise_name as string | undefined;

    if (!exerciseName) {
      console.warn(
        `[Image Sync Trigger] No exercise_name found in deleted document ${imageId}`
      );
      return;
    }

    console.log(
      `[Image Sync Trigger] Image deleted for exercise: "${exerciseName}" (imageId: ${imageId})`
    );

    // Only process if the deleted image was certified
    // If it was pending/rejected, no workouts would have it
    if (imageData?.status === "certified") {
      try {
        // First, try to sync with the next available certified image
        // This handles the case where multiple certified images exist (e.g., position 1 and 2)
        // If position 1 is deleted, workouts should update to use position 2
        const syncStats = await syncWorkoutsForExercise(exerciseName);

        if (syncStats.workoutsUpdated > 0) {
          // Successfully updated workouts with a new primary image
          console.log(
            `[Image Sync Trigger] Updated workouts with new primary image for "${exerciseName}":`,
            {
              workoutsFound: syncStats.workoutsFound,
              workoutsUpdated: syncStats.workoutsUpdated,
              exercisesUpdated: syncStats.exercisesUpdated,
              errors: syncStats.errors.length,
            }
          );
        } else {
          // No other certified images exist, clear image_url from workouts
          console.log(
            `[Image Sync Trigger] No other certified images found for "${exerciseName}", clearing image URLs`
          );
          const clearStats = await clearWorkoutImagesForExercise(exerciseName);

          console.log(
            `[Image Sync Trigger] Cleanup completed for "${exerciseName}":`,
            {
              workoutsFound: clearStats.workoutsFound,
              workoutsUpdated: clearStats.workoutsUpdated,
              exercisesCleared: clearStats.exercisesCleared,
              errors: clearStats.errors.length,
            }
          );

          if (clearStats.errors.length > 0) {
            console.error(
              `[Image Sync Trigger] Errors during cleanup:`,
              clearStats.errors
            );
          }
        }

        // Log any errors from sync attempt
        if (syncStats.errors.length > 0) {
          console.error(
            `[Image Sync Trigger] Errors during sync:`,
            syncStats.errors
          );
        }
      } catch (error) {
        console.error(
          `[Image Sync Trigger] Failed to process deletion for exercise "${exerciseName}":`,
          error
        );
        // Re-throw to enable Cloud Functions automatic retries for transient errors
        // The function is idempotent (checks for existing images before clearing),
        // so retries are safe and will eventually complete the cleanup
        throw error;
      }
    } else {
      console.log(
        `[Image Sync Trigger] Skipping cleanup (deleted image was not certified: ${imageData?.status})`
      );
    }
  });
