/**
 * Sync workouts for a specific exercise name when an image is certified or updated.
 *
 * This function queries all workouts containing the specified exercise name and
 * updates them with the image URL from the certified image.
 */

import {
  getFirestore,
  FieldValue,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { trimExerciseName, retryWithBackoff } from "./utils";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Get the primary (lowest position) certified image for an exercise.
 */
async function getPrimaryImageForExercise(
  exerciseName: string
): Promise<{ imageUrl: string; position: number } | null> {
  try {
    const normalizedName = trimExerciseName(exerciseName);

    const snapshot = await db
      .collection("master_exercise_images")
      .where("exercise_name", "==", normalizedName)
      .where("status", "==", "certified")
      .get();

    if (snapshot.empty) {
      return null;
    }

    // Sort by position in memory (position 1 is primary, lower is better)
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const dataA = a.data();
      const dataB = b.data();
      const posA = dataA.position ?? 999;
      const posB = dataB.position ?? 999;
      return posA - posB;
    });

    const primaryDoc = sortedDocs[0];
    const data = primaryDoc.data();
    const imageUrl = data.image_url as string | undefined;
    const position = data.position as number | undefined;

    if (!imageUrl) {
      return null;
    }

    return {
      imageUrl,
      position: position ?? 999,
    };
  } catch (error) {
    console.error(
      `Error fetching primary image for exercise "${exerciseName}":`,
      error
    );
    return null;
  }
}

/**
 * Update a single workout with images for a specific exercise.
 * Returns the number of exercises updated.
 *
 * Uses Firestore transaction to prevent race conditions when multiple
 * images are certified simultaneously for different exercises in the same workout.
 */
async function updateWorkoutForExercise(
  workoutId: string,
  exerciseName: string,
  imageUrl: string
): Promise<number> {
  try {
    const workoutRef = db.collection("trainer_workouts").doc(workoutId);

    // Use transaction to prevent race conditions with concurrent updates
    return await db.runTransaction(async (transaction) => {
      const workoutSnap = await transaction.get(workoutRef);

      if (!workoutSnap.exists) {
        return 0;
      }

      const workout = workoutSnap.data();
      if (!workout || !workout.sections) {
        return 0;
      }

      const sections = workout.sections as Array<{
        exercises: Array<{
          name: string;
          image_url?: string;
          image_source?: string;
        }>;
      }>;

      let updateCount = 0;
      const normalizedExerciseName = trimExerciseName(exerciseName);

      // Update sections with matching exercise names
      const updatedSections = sections.map((section) => ({
        ...section,
        exercises: section.exercises.map((exercise) => {
          const normalizedName = trimExerciseName(exercise.name);
          // Update if exercise name matches and doesn't already have an image
          // OR if it has an image but we want to update it (for position changes)
          if (normalizedName === normalizedExerciseName) {
            // Always update to ensure we use the latest primary image
            updateCount++;
            return {
              ...exercise,
              image_url: imageUrl,
              image_source: "master",
            };
          }
          return exercise;
        }),
      }));

      if (updateCount > 0) {
        transaction.update(workoutRef, {
          sections: updatedSections,
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      return updateCount;
    });
  } catch (error) {
    console.error(
      `Error updating workout "${workoutId}" for exercise "${exerciseName}":`,
      error
    );
    throw error;
  }
}

/**
 * Clear image_url from a single workout for a specific exercise (when image is deleted).
 *
 * Uses Firestore transaction to prevent race conditions with concurrent updates.
 */
async function clearWorkoutImageForExercise(
  workoutId: string,
  exerciseName: string
): Promise<number> {
  try {
    const workoutRef = db.collection("trainer_workouts").doc(workoutId);

    // Use transaction to prevent race conditions with concurrent updates
    return await db.runTransaction(async (transaction) => {
      const workoutSnap = await transaction.get(workoutRef);

      if (!workoutSnap.exists) {
        return 0;
      }

      const workout = workoutSnap.data();
      if (!workout || !workout.sections) {
        return 0;
      }

      const sections = workout.sections as Array<{
        exercises: Array<{
          name: string;
          image_url?: string;
          image_source?: string;
        }>;
      }>;

      let updateCount = 0;
      const normalizedExerciseName = trimExerciseName(exerciseName);

      // Clear image_url from matching exercises
      // Only clear images that came from master source to preserve user-set images
      const updatedSections = sections.map((section) => ({
        ...section,
        exercises: section.exercises.map((exercise) => {
          const normalizedName = trimExerciseName(exercise.name);
          // Only clear if exercise matches AND image came from master source
          // Also clear if image_source is undefined (legacy data - assume from master)
          // This preserves user-set images (image_source !== "master" && image_source !== undefined)
          if (
            normalizedName === normalizedExerciseName &&
            exercise.image_url &&
            (exercise.image_source === "master" ||
              exercise.image_source === undefined)
          ) {
            updateCount++;
            // Remove image_url and image_source
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { image_url, image_source, ...rest } = exercise;
            return rest;
          }
          return exercise;
        }),
      }));

      if (updateCount > 0) {
        transaction.update(workoutRef, {
          sections: updatedSections,
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      return updateCount;
    });
  } catch (error) {
    console.error(
      `Error clearing images from workout "${workoutId}" for exercise "${exerciseName}":`,
      error
    );
    throw error;
  }
}

/**
 * Find all workouts containing a specific exercise name.
 * Returns array of workout document IDs.
 *
 * PERFORMANCE NOTE: This function performs a full table scan with client-side filtering.
 * Firestore doesn't support querying nested arrays (sections.exercises.name) directly.
 * For large datasets, this can be expensive. Consider implementing a reverse index:
 * - Maintain a collection mapping exercise_name -> workout_ids
 * - Update it when workouts are created/updated/deleted
 * - Query the index instead of scanning all workouts
 *
 * @param exerciseName - The exercise name to search for
 * @returns Array of workout document IDs containing the exercise
 */
async function findWorkoutsWithExercise(
  exerciseName: string
): Promise<string[]> {
  try {
    const BATCH_SIZE = 500;
    // Safety limit: prevent runaway queries that could exhaust Firestore read quota
    // This limits total documents scanned, not just documents returned
    const MAX_WORKOUTS_TO_SCAN = 10000;
    const workoutIds: string[] = [];
    const normalizedExerciseName = trimExerciseName(exerciseName);

    let lastDoc: QueryDocumentSnapshot | null = null;
    let totalScanned = 0;

    while (totalScanned < MAX_WORKOUTS_TO_SCAN) {
      let query = db
        .collection("trainer_workouts")
        .orderBy("created_at", "desc")
        .limit(BATCH_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        break;
      }

      totalScanned += snapshot.docs.length;

      // Filter workouts that contain the exercise
      for (const doc of snapshot.docs) {
        const workout = doc.data();
        if (workout.sections) {
          const sections = workout.sections as Array<{
            exercises: Array<{ name: string }>;
          }>;

          const hasExercise = sections.some((section) =>
            section.exercises?.some(
              (exercise) =>
                trimExerciseName(exercise.name) === normalizedExerciseName
            )
          );

          if (hasExercise) {
            workoutIds.push(doc.id);
          }
        }
      }

      // Log progress for large scans
      if (totalScanned % 2000 === 0) {
        console.log(
          `[Image Sync] Scanned ${totalScanned} workouts, found ${workoutIds.length} with exercise "${exerciseName}"`
        );
      }

      if (snapshot.docs.length < BATCH_SIZE) {
        break;
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    if (totalScanned >= MAX_WORKOUTS_TO_SCAN) {
      console.warn(
        `[Image Sync] Hit MAX_WORKOUTS_TO_SCAN limit (${MAX_WORKOUTS_TO_SCAN}) for exercise "${exerciseName}". ` +
          `Found ${workoutIds.length} workouts, but may have missed some. ` +
          `Consider implementing a reverse index for better performance.`
      );
    } else {
      console.log(
        `[Image Sync] Scanned ${totalScanned} workouts, found ${workoutIds.length} with exercise "${exerciseName}"`
      );
    }

    return workoutIds;
  } catch (error) {
    console.error(
      `Error finding workouts with exercise "${exerciseName}":`,
      error
    );
    throw error;
  }
}

/**
 * Sync all workouts for a specific exercise when an image is certified or updated.
 *
 * NOTE: Cloud Functions have execution time limits (9 minutes for 2nd gen, 60 seconds
 * for 1st gen by default). For exercises with thousands of workouts, this function may
 * timeout. The function is idempotent, so retries are safe. For very large scales,
 * consider implementing a queue-based system using Cloud Tasks or Pub/Sub.
 *
 * @param exerciseName - The exercise name to sync
 * @returns Statistics about the sync operation
 */
export async function syncWorkoutsForExercise(exerciseName: string): Promise<{
  workoutsFound: number;
  workoutsUpdated: number;
  exercisesUpdated: number;
  errors: string[];
}> {
  const startTime = Date.now();
  // Cloud Functions 2nd gen timeout: 9 minutes (540000ms)
  // Leave 30 seconds buffer for cleanup and logging
  const TIMEOUT_WARNING_MS = 8.5 * 60 * 1000; // 8.5 minutes
  const TIMEOUT_CRITICAL_MS = 8.75 * 60 * 1000; // 8.75 minutes

  const stats = {
    workoutsFound: 0,
    workoutsUpdated: 0,
    exercisesUpdated: 0,
    errors: [] as string[],
  };

  try {
    console.log(`[Image Sync] Starting sync for exercise: "${exerciseName}"`);

    // Get the primary image for this exercise
    const primaryImage = await getPrimaryImageForExercise(exerciseName);

    if (!primaryImage) {
      console.log(
        `[Image Sync] No certified image found for exercise: "${exerciseName}"`
      );
      return stats;
    }

    console.log(
      `[Image Sync] Found primary image (position ${primaryImage.position}) for: "${exerciseName}"`
    );

    // Find all workouts containing this exercise
    const workoutIds = await findWorkoutsWithExercise(exerciseName);
    stats.workoutsFound = workoutIds.length;

    console.log(
      `[Image Sync] Found ${workoutIds.length} workouts with exercise: "${exerciseName}"`
    );

    // Warn if large number of workouts (potential timeout risk)
    if (workoutIds.length > 1000) {
      console.warn(
        `[Image Sync] Large number of workouts (${workoutIds.length}) for "${exerciseName}". ` +
          `Function may timeout. Consider implementing queue-based processing for this scale.`
      );
    }

    // Update each workout
    // Use batch processing to avoid overwhelming Firestore
    const BATCH_SIZE = 50;
    for (let i = 0; i < workoutIds.length; i += BATCH_SIZE) {
      // Check execution time and warn if approaching timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > TIMEOUT_CRITICAL_MS) {
        console.error(
          `[Image Sync] CRITICAL: Approaching Cloud Functions timeout for "${exerciseName}". ` +
            `Processed ${i}/${workoutIds.length} workouts in ${Math.round(elapsed / 1000)}s. ` +
            `Function may timeout before completing all updates. Remaining workouts will be ` +
            `processed on retry (function is idempotent).`
        );
        // Continue processing - function is idempotent, retries are safe
      } else if (elapsed > TIMEOUT_WARNING_MS) {
        console.warn(
          `[Image Sync] WARNING: Execution time (${Math.round(elapsed / 1000)}s) approaching ` +
            `timeout limit for "${exerciseName}". Processed ${i}/${workoutIds.length} workouts.`
        );
      }
      const batch = workoutIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (workoutId) => {
          // Retry with exponential backoff for transient Firestore errors
          const exercisesUpdated = await retryWithBackoff(
            () =>
              updateWorkoutForExercise(
                workoutId,
                exerciseName,
                primaryImage.imageUrl
              ),
            3, // maxRetries
            200 // initialDelayMs (200ms for batch operations)
          );
          return { workoutId, exercisesUpdated };
        })
      );

      // Process results
      // Use index-based iteration to match results with workoutIds for proper error reporting
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const workoutId = batch[index];
        if (result.status === "fulfilled") {
          if (result.value.exercisesUpdated > 0) {
            stats.workoutsUpdated++;
            stats.exercisesUpdated += result.value.exercisesUpdated;
          }
        } else {
          const reason = result.reason;
          const message =
            reason instanceof Error ? reason.message : String(reason);
          const errorMsg = `Workout ${workoutId || "unknown"}: ${message}`;
          stats.errors.push(errorMsg);
          console.error(`[Image Sync] Error: ${errorMsg}`);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `[Image Sync] Completed sync for "${exerciseName}": ${stats.workoutsUpdated} workouts updated, ` +
        `${stats.exercisesUpdated} exercises updated in ${Math.round(totalTime / 1000)}s`
    );

    return stats;
  } catch (error) {
    const errorMsg = `Failed to sync workouts for exercise "${exerciseName}": ${
      error instanceof Error ? error.message : String(error)
    }`;
    stats.errors.push(errorMsg);
    console.error(`[Image Sync] ${errorMsg}`, error);
    throw error;
  }
}

/**
 * Clear image URLs from all workouts for a specific exercise (when image is deleted).
 *
 * NOTE: Cloud Functions have execution time limits. See syncWorkoutsForExercise for details.
 * This function is idempotent, so retries are safe.
 *
 * @param exerciseName - The exercise name to clear images for
 * @returns Statistics about the cleanup operation
 */
export async function clearWorkoutImagesForExercise(
  exerciseName: string
): Promise<{
  workoutsFound: number;
  workoutsUpdated: number;
  exercisesCleared: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const TIMEOUT_WARNING_MS = 8.5 * 60 * 1000; // 8.5 minutes
  const TIMEOUT_CRITICAL_MS = 8.75 * 60 * 1000; // 8.75 minutes

  const stats = {
    workoutsFound: 0,
    workoutsUpdated: 0,
    exercisesCleared: 0,
    errors: [] as string[],
  };

  try {
    console.log(
      `[Image Sync] Starting cleanup for deleted exercise: "${exerciseName}"`
    );

    // Find all workouts containing this exercise
    const workoutIds = await findWorkoutsWithExercise(exerciseName);
    stats.workoutsFound = workoutIds.length;

    console.log(
      `[Image Sync] Found ${workoutIds.length} workouts with exercise: "${exerciseName}"`
    );

    // Warn if large number of workouts (potential timeout risk)
    if (workoutIds.length > 1000) {
      console.warn(
        `[Image Sync] Large number of workouts (${workoutIds.length}) for "${exerciseName}". ` +
          `Function may timeout. Consider implementing queue-based processing for this scale.`
      );
    }

    // Clear images from each workout
    const BATCH_SIZE = 50;
    for (let i = 0; i < workoutIds.length; i += BATCH_SIZE) {
      // Check execution time and warn if approaching timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > TIMEOUT_CRITICAL_MS) {
        console.error(
          `[Image Sync] CRITICAL: Approaching Cloud Functions timeout for "${exerciseName}". ` +
            `Processed ${i}/${workoutIds.length} workouts in ${Math.round(elapsed / 1000)}s. ` +
            `Function may timeout before completing all updates. Remaining workouts will be ` +
            `processed on retry (function is idempotent).`
        );
      } else if (elapsed > TIMEOUT_WARNING_MS) {
        console.warn(
          `[Image Sync] WARNING: Execution time (${Math.round(elapsed / 1000)}s) approaching ` +
            `timeout limit for "${exerciseName}". Processed ${i}/${workoutIds.length} workouts.`
        );
      }
      const batch = workoutIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (workoutId) => {
          // Retry with exponential backoff for transient Firestore errors
          const exercisesCleared = await retryWithBackoff(
            () => clearWorkoutImageForExercise(workoutId, exerciseName),
            3, // maxRetries
            200 // initialDelayMs (200ms for batch operations)
          );
          return { workoutId, exercisesCleared };
        })
      );

      // Process results
      // Use index-based iteration to match results with workoutIds for proper error reporting
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const workoutId = batch[index];
        if (result.status === "fulfilled") {
          if (result.value.exercisesCleared > 0) {
            stats.workoutsUpdated++;
            stats.exercisesCleared += result.value.exercisesCleared;
          }
        } else {
          const reason = result.reason;
          const message =
            reason instanceof Error ? reason.message : String(reason);
          const errorMsg = `Workout ${workoutId || "unknown"}: ${message}`;
          stats.errors.push(errorMsg);
          console.error(`[Image Sync] Error: ${errorMsg}`);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `[Image Sync] Completed cleanup for "${exerciseName}": ${stats.workoutsUpdated} workouts updated, ` +
        `${stats.exercisesCleared} exercises cleared in ${Math.round(totalTime / 1000)}s`
    );

    return stats;
  } catch (error) {
    const errorMsg = `Failed to clear workouts for exercise "${exerciseName}": ${
      error instanceof Error ? error.message : String(error)
    }`;
    stats.errors.push(errorMsg);
    console.error(`[Image Sync] ${errorMsg}`, error);
    throw error;
  }
}
