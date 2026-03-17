#!/usr/bin/env tsx
/**
 * Sync Exercise Images from Production Database
 *
 * This script syncs exercise images from master_exercise_images collection
 * to trainer_workouts in the PRODUCTION database (not emulator).
 *
 * Usage:
 *   tsx scripts/sync-exercise-images-prod.ts [workoutId]
 *
 * Requires:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY environment variable
 *   - Production Firebase project access
 */

import { config } from "dotenv";
import { resolve } from "path";
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

/**
 * Trim exercise name for Firestore queries.
 * Exercise names in master_exercise_images are stored with exact match (trimmed only).
 */
function trimExerciseName(name: string): string {
  return name.trim();
}

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

// Initialize Firebase Admin for PRODUCTION (no emulator)
function initializeProductionAdmin(): admin.app.App {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required"
    );
  }

  const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;

  // Initialize without emulator settings
  return admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.projectId,
    },
    "production-sync"
  );
}

const adminApp = initializeProductionAdmin();
const adminDb = adminApp.firestore();

/**
 * Get image URL for an exercise from master_exercise_images collection.
 * Returns the primary image (position 1) if available.
 * Uses in-memory sorting to avoid requiring a composite Firestore index.
 */
async function getImageForExercise(
  exerciseName: string
): Promise<string | null> {
  try {
    // Normalize exercise name for query (trimmed only, as per documentation)
    const normalizedName = trimExerciseName(exerciseName);

    // Query without orderBy (multiple equality where clauses don't require index)
    // Then sort in memory by position (position 1 is primary)
    const snapshot = await adminDb
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
      const posA = typeof dataA.position === "number" ? dataA.position : 999;
      const posB = typeof dataB.position === "number" ? dataB.position : 999;
      return posA - posB;
    });

    const docSnap = sortedDocs[0];
    const data = docSnap.data();
    return data.image_url || null;
  } catch (error) {
    console.error(
      `Error fetching image for exercise "${exerciseName}":`,
      error
    );
    return null;
  }
}

/**
 * Update a single workout with mapped images.
 */
async function updateWorkoutWithImages(workoutId: string): Promise<number> {
  const workoutRef = adminDb.collection("trainer_workouts").doc(workoutId);

  try {
    const workoutSnap = await workoutRef.get();
    if (!workoutSnap.exists) {
      console.warn(`Workout ${workoutId} not found`);
      return 0;
    }

    const workout = workoutSnap.data();
    if (!workout || !workout.sections) {
      console.warn(`Workout ${workoutId} has no sections`);
      return 0;
    }

    const sections = workout.sections as Array<{
      exercises: Array<{ name: string; image_url?: string }>;
    }>;

    let updateCount = 0;
    const updatedSections = await Promise.all(
      sections.map(async (section) => {
        const updatedExercises = await Promise.all(
          section.exercises.map(async (exercise) => {
            if (!exercise.image_url) {
              const imageUrl = await getImageForExercise(exercise.name);
              if (imageUrl) {
                updateCount++;
                console.log(`  ✓ Mapped image for "${exercise.name}"`);
                return {
                  ...exercise,
                  image_url: imageUrl,
                  image_source: "master",
                };
              }
            }
            return exercise;
          })
        );
        return {
          ...section,
          exercises: updatedExercises,
        };
      })
    );

    if (updateCount > 0) {
      await workoutRef.update({
        sections: updatedSections,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✓ Updated workout ${workoutId} with ${updateCount} images`);
    } else {
      console.log(`  No images to update for workout ${workoutId}`);
    }

    return updateCount;
  } catch (error) {
    console.error(`Error updating workout "${workoutId}":`, error);
    throw error;
  }
}

/**
 * Batch sync all workouts.
 */
async function batchSyncAllWorkouts(limitCount?: number): Promise<void> {
  let query: admin.firestore.Query = adminDb.collection("trainer_workouts");

  if (limitCount) {
    query = query.limit(limitCount);
  }

  const snapshot = await query.get();
  console.log(`\nProcessing ${snapshot.size} workouts...\n`);

  let updatedCount = 0;
  let totalExercisesUpdated = 0;

  for (const docSnap of snapshot.docs) {
    const workoutId = docSnap.id;
    try {
      console.log(`Processing workout ${workoutId}...`);
      const exercisesUpdated = await updateWorkoutWithImages(workoutId);
      if (exercisesUpdated > 0) {
        updatedCount++;
        totalExercisesUpdated += exercisesUpdated;
      }
    } catch (error) {
      console.error(`Error processing workout ${workoutId}:`, error);
    }
  }

  console.log(`\n✓ Sync complete!`);
  console.log(`  Total workouts: ${snapshot.size}`);
  console.log(`  Updated workouts: ${updatedCount}`);
  console.log(`  Total exercises updated: ${totalExercisesUpdated}`);
}

// Main execution
async function main() {
  const workoutId = process.argv[2];
  const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

  try {
    if (workoutId) {
      console.log(`Syncing workout: ${workoutId}\n`);
      const exercisesUpdated = await updateWorkoutWithImages(workoutId);
      console.log(`\n✓ Complete! Updated ${exercisesUpdated} exercises.`);
    } else {
      await batchSyncAllWorkouts(limit);
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await adminApp.delete();
  }
}

main();
