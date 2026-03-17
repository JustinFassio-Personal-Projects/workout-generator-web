/**
 * Firestore trigger that fires when master_exercise_images documents are updated.
 * Automatically syncs images to all affected workouts when images are certified.
 */

import * as functions from "firebase-functions";
import { syncWorkoutsForExercise } from "./syncWorkoutsForExercise";

// Track in-flight sync operations to prevent concurrent syncs for the same exercise
// This prevents redundant work when multiple images are certified simultaneously
const inFlightSyncs = new Map<string, Promise<void>>();

/**
 * Cloud Function: Sync workouts when master_exercise_images document is updated.
 *
 * Triggers on:
 * - Image certification (status changes to "certified")
 * - Position changes (primary image changes)
 * - Re-certification (image re-added and certified)
 *
 * Automatically updates all workouts containing the exercise with the new image.
 */
export const onMasterImageCertified = functions.firestore
  .document("master_exercise_images/{imageId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const imageId = context.params.imageId;

    console.log(
      `[Image Sync Trigger] Document updated: ${imageId}, exercise: "${after.exercise_name}"`
    );

    // Check if status changed to certified
    const statusChangedToCertified =
      after.status === "certified" && before.status !== "certified";

    // Check if position changed (for certified images)
    const positionChanged =
      after.status === "certified" &&
      before.status === "certified" &&
      before.position !== after.position;

    // Only process if status changed to certified OR position changed
    if (statusChangedToCertified || positionChanged) {
      const exerciseName = after.exercise_name as string;

      if (!exerciseName) {
        console.warn(
          `[Image Sync Trigger] No exercise_name found in document ${imageId}`
        );
        return;
      }

      console.log(
        `[Image Sync Trigger] ${
          statusChangedToCertified ? "Certification" : "Position change"
        } detected for exercise: "${exerciseName}"`
      );

      // Use request deduplication to prevent concurrent syncs for the same exercise
      // If multiple images are certified simultaneously, only one sync will run
      const normalizedExerciseName = exerciseName.trim();
      const existingSync = inFlightSyncs.get(normalizedExerciseName);

      if (existingSync) {
        console.log(
          `[Image Sync Trigger] Sync already in progress for "${exerciseName}", waiting for completion`
        );
        try {
          await existingSync;
          console.log(
            `[Image Sync Trigger] Waited for existing sync to complete for "${exerciseName}"`
          );
          return;
        } catch {
          // If the existing sync failed, we'll run our own sync
          console.log(
            `[Image Sync Trigger] Existing sync failed for "${exerciseName}", running new sync`
          );
          inFlightSyncs.delete(normalizedExerciseName);
        }
      }

      // Create new sync promise
      const syncPromise = (async () => {
        try {
          const stats = await syncWorkoutsForExercise(exerciseName);

          console.log(
            `[Image Sync Trigger] Sync completed for "${exerciseName}":`,
            {
              workoutsFound: stats.workoutsFound,
              workoutsUpdated: stats.workoutsUpdated,
              exercisesUpdated: stats.exercisesUpdated,
              errors: stats.errors.length,
            }
          );

          if (stats.errors.length > 0) {
            console.error(
              `[Image Sync Trigger] Errors during sync:`,
              stats.errors
            );
          }
        } catch (error) {
          console.error(
            `[Image Sync Trigger] Failed to sync workouts for exercise "${exerciseName}":`,
            error
          );
          // Re-throw to enable Cloud Functions automatic retries for transient errors
          // The function is idempotent (updates workouts atomically with transactions),
          // so retries are safe and will eventually complete the sync
          throw error;
        } finally {
          // Clean up in-flight tracking
          inFlightSyncs.delete(normalizedExerciseName);
        }
      })();

      // Store the sync promise for deduplication
      inFlightSyncs.set(normalizedExerciseName, syncPromise);

      try {
        await syncPromise;
      } catch (error) {
        // Error already logged in syncPromise, just re-throw
        throw error;
      }
    } else {
      console.log(
        `[Image Sync Trigger] No action needed (status: ${before.status} -> ${after.status}, position: ${before.position} -> ${after.position})`
      );
    }
  });
