/**
 * Image Mapping Service
 *
 * Maps exercise images from master_exercise_images collection to workouts
 * based on exact exercise name matching (trimmed only).
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  limit,
  where,
} from "firebase/firestore";
import { getDbInstance } from "@/lib/firestore";
import { trimExerciseName } from "@/lib/image-generation-config";
import type { TrainerWorkout } from "@/types/firestore";
import { getUserImagePreference } from "./UserImagePreferenceService";

const COLLECTION_NAME = "master_exercise_images";

/**
 * Get image URL for an exercise from master_exercise_images collection.
 * Only returns images with status "certified".
 * Queries by exercise_name field (exact match, trimmed).
 * Returns the primary image (position 1) if available.
 *
 * If userId is provided, checks user preferences first before falling back to exact match.
 *
 * Uses in-memory sorting to avoid requiring a composite Firestore index,
 * matching the approach in image-mapping-admin.ts for consistency.
 *
 * @param exerciseName - The exercise name to look up
 * @param userId - Optional user ID to check for user-specific image preferences
 * @returns Image URL or null if not found or not certified
 */
export async function getImageForExercise(
  exerciseName: string,
  userId?: string
): Promise<string | null> {
  // Check user preferences first if userId is provided
  if (userId) {
    try {
      const userPreference = await getUserImagePreference(userId, exerciseName);
      if (userPreference) {
        return userPreference;
      }
    } catch (error) {
      // If preference check fails, fall through to default exact match
      console.warn(
        `Failed to check user preference for exercise "${exerciseName}":`,
        error
      );
    }
  }

  // Fall back to exact match from master_exercise_images
  const db = getDbInstance();
  const collectionRef = collection(db, COLLECTION_NAME);

  try {
    // Normalize exercise name for query (trimmed only, as per documentation)
    const normalizedName = trimExerciseName(exerciseName);

    // Query without orderBy (multiple equality where clauses don't require index)
    // Then sort in memory by position (position 1 is primary)
    // This matches the approach in image-mapping-admin.ts for consistency
    const q = query(
      collectionRef,
      where("exercise_name", "==", normalizedName),
      where("status", "==", "certified")
    );
    const snapshot = await getDocs(q);

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

    const docData = sortedDocs[0].data();
    const imageUrl = docData.image_url || null;

    return imageUrl;
  } catch (error) {
    console.error(
      `Error fetching image for exercise "${exerciseName}":`,
      error
    );
    return null;
  }
}

/**
 * Get images for an exercise by positions (1-4) from master_exercise_images collection.
 * Only returns images with status "certified".
 *
 * @param exerciseName - The exercise name to look up
 * @param positions - Array of positions to fetch (default: [1, 2, 3, 4])
 * @returns Array of image URLs in position order, with null for missing positions.
 *          If the database query fails or no images are found, returns an array of nulls
 *          matching the length of the positions array. Errors are logged to console
 *          but not thrown, ensuring the function always returns a valid array.
 * @throws Never throws - all errors are caught and result in an array of nulls
 */
export async function getExerciseImagesByPosition(
  exerciseName: string,
  positions: number[] = [1, 2, 3, 4]
): Promise<(string | null)[]> {
  const db = getDbInstance();
  const collectionRef = collection(db, COLLECTION_NAME);

  try {
    const normalizedName = trimExerciseName(exerciseName);
    const q = query(
      collectionRef,
      where("exercise_name", "==", normalizedName),
      where("status", "==", "certified")
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return positions.map(() => null);
    }

    // Sort by position and create a map
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const dataA = a.data();
      const dataB = b.data();
      const posA = dataA.position ?? 999;
      const posB = dataB.position ?? 999;
      return posA - posB;
    });

    const imageMap = new Map<number, string>();
    sortedDocs.forEach((doc) => {
      const data = doc.data();
      const position = data.position;
      if (typeof position === "number" && positions.includes(position)) {
        imageMap.set(position, data.image_url);
      }
    });

    // Return array in requested position order
    return positions.map((pos) => imageMap.get(pos) || null);
  } catch (error) {
    console.error(
      `Error fetching images for exercise "${exerciseName}":`,
      error
    );
    return positions.map(() => null);
  }
}

/**
 * Map images to all exercises in a workout.
 * Returns a map of exercise indices to image URLs.
 *
 * @param workout - The workout to map images for
 * @returns Map of exercise paths (sectionIndex.exerciseIndex) to image URLs
 */
export async function mapImagesToWorkout(
  workout: TrainerWorkout
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  // Collect all exercises that need images with their indices
  const exercisesToMap: Array<{
    sectionIdx: number;
    exerciseIdx: number;
    exerciseName: string;
  }> = [];

  for (let sectionIdx = 0; sectionIdx < workout.sections.length; sectionIdx++) {
    const section = workout.sections[sectionIdx];
    for (
      let exerciseIdx = 0;
      exerciseIdx < section.exercises.length;
      exerciseIdx++
    ) {
      const exercise = section.exercises[exerciseIdx];
      // Only map images for exercises that don't already have images
      if (!exercise.image_url) {
        exercisesToMap.push({
          sectionIdx,
          exerciseIdx,
          exerciseName: exercise.name,
        });
      }
    }
  }

  // Parallelize all image queries using Promise.all
  const imageResults = await Promise.all(
    exercisesToMap.map(({ exerciseName }) => getImageForExercise(exerciseName))
  );

  // Map results back to exercise indices
  for (let i = 0; i < exercisesToMap.length; i++) {
    const imageUrl = imageResults[i];
    if (imageUrl) {
      const { sectionIdx, exerciseIdx } = exercisesToMap[i];
      const key = `${sectionIdx}.${exerciseIdx}`;
      imageMap.set(key, imageUrl);
    }
  }

  return imageMap;
}

/**
 * Update a workout document with mapped images.
 * Only updates exercises that don't already have image_url set.
 *
 * @param workoutId - The workout document ID
 * @returns Number of exercises updated, or null if workout not found
 */
export async function updateWorkoutWithImages(
  workoutId: string
): Promise<number | null> {
  const db = getDbInstance();
  const workoutRef = doc(db, "trainer_workouts", workoutId);

  try {
    const workoutSnap = await getDoc(workoutRef);
    if (!workoutSnap.exists()) {
      return null;
    }

    const workout = {
      id: workoutSnap.id,
      ...workoutSnap.data(),
    } as TrainerWorkout;

    // Map images to exercises
    const imageMap = await mapImagesToWorkout(workout);

    if (imageMap.size === 0) {
      return 0; // No images to update
    }

    // Build update object for nested array updates
    // Firestore requires full path for nested array updates
    const updates: Record<string, unknown> = {};
    let updateCount = 0;

    imageMap.forEach((imageUrl, key) => {
      const [sectionIdx, exerciseIdx] = key.split(".").map(Number);
      const imagePath = `sections.${sectionIdx}.exercises.${exerciseIdx}.image_url`;
      const sourcePath = `sections.${sectionIdx}.exercises.${exerciseIdx}.image_source`;
      updates[imagePath] = imageUrl;
      updates[sourcePath] = "master";
      updateCount++;
    });

    // Update the workout document
    // Note: Firestore doesn't support nested field updates like this directly
    // We need to use a different approach - update the entire sections array
    // OR use a transaction to read, modify, and write
    // For now, we'll use the approach of reading, modifying, and writing back
    const updatedSections = workout.sections.map((section, sectionIdx) => ({
      ...section,
      exercises: section.exercises.map((exercise, exerciseIdx) => {
        const key = `${sectionIdx}.${exerciseIdx}`;
        const imageUrl = imageMap.get(key);
        if (imageUrl && !exercise.image_url) {
          return {
            ...exercise,
            image_url: imageUrl,
            image_source: "master" as const,
          };
        }
        return exercise;
      }),
    }));

    await updateDoc(workoutRef, {
      sections: updatedSections,
      updated_at: serverTimestamp(),
    });

    return updateCount;
  } catch (error) {
    console.error(`Error updating workout "${workoutId}":`, error);
    throw error;
  }
}

/**
 * Batch sync all workouts with images from master_exercise_images.
 * Processes workouts in batches to avoid memory issues.
 *
 * @param options - Sync options
 * @returns Sync statistics
 */
export async function batchSyncAllWorkouts(options?: {
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
}): Promise<{
  totalWorkouts: number;
  updatedWorkouts: number;
  totalExercisesUpdated: number;
  errors: string[];
}> {
  const db = getDbInstance();
  const workoutsRef = collection(db, "trainer_workouts");
  const batchSize = options?.batchSize || 1000; // Default to 1000 if not specified

  const stats = {
    totalWorkouts: 0,
    updatedWorkouts: 0,
    totalExercisesUpdated: 0,
    errors: [] as string[],
  };

  try {
    // Get workouts up to the specified batch size limit
    const workoutsQuery = query(workoutsRef, limit(batchSize));
    const snapshot = await getDocs(workoutsQuery);
    stats.totalWorkouts = snapshot.docs.length;

    for (let i = 0; i < snapshot.docs.length; i++) {
      const docSnap = snapshot.docs[i];
      const workoutId = docSnap.id;

      try {
        const exercisesUpdated = await updateWorkoutWithImages(workoutId);
        if (exercisesUpdated !== null && exercisesUpdated > 0) {
          stats.updatedWorkouts++;
          stats.totalExercisesUpdated += exercisesUpdated;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        stats.errors.push(`Workout ${workoutId}: ${errorMessage}`);
      }

      if (options?.onProgress) {
        options.onProgress(i + 1, stats.totalWorkouts);
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Batch sync error: ${errorMessage}`);
  }

  return stats;
}

export const ImageMappingService = {
  getImageForExercise,
  getExerciseImagesByPosition,
  mapImagesToWorkout,
  updateWorkoutWithImages,
  batchSyncAllWorkouts,
};
