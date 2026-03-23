import { NextRequest, NextResponse } from "next/server";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";
import { trimExerciseName } from "@/lib/image-generation-config";
import {
  parseServiceAccountKey,
  getServiceAccountProjectId,
  type ParsedServiceAccount,
} from "@/lib/parse-service-account";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Helper Functions
// ============================================

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Get a production-only Firestore instance.
 * Creates a separate Firebase Admin app instance for production database access.
 *
 * NOTE: If FIRESTORE_EMULATOR_HOST is set, Firebase Admin SDK will use the emulator
 * globally. To use production mode, you may need to temporarily unset the emulator
 * environment variables or use the sync script directly.
 */
function getProductionDb(): admin.firestore.Firestore {
  const appName = "production-sync";

  // Check if production app already exists
  let productionApp: admin.app.App;
  try {
    productionApp = admin.app(appName);
  } catch {
    // App doesn't exist, create it
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is required for production mode"
      );
    }

    let serviceAccount: ParsedServiceAccount;
    try {
      serviceAccount = parseServiceAccountKey(serviceAccountKey);
    } catch (parseError) {
      const error = new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Please check your environment configuration."
      );
      logger.error("[Sync Exercise Images] Configuration error", parseError, {
        route: "/api/admin/sync-exercise-images",
        operation: "parse_service_account",
      });
      throw error;
    }

    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      getServiceAccountProjectId(serviceAccount);

    if (!projectId) {
      const error = new Error(
        "Project ID is required. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or include projectId in service account."
      );
      logger.error("[Sync Exercise Images] Configuration error", error, {
        route: "/api/admin/sync-exercise-images",
        operation: "validate_project_id",
      });
      throw error;
    }

    try {
      // Initialize production app with explicit credentials
      // Note: If FIRESTORE_EMULATOR_HOST is set, this may still use the emulator
      // as Firebase Admin SDK checks env vars at initialization time
      productionApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId,
        },
        appName
      );
    } catch (initError) {
      const error = new Error(
        `Failed to initialize production Firebase Admin app: ${
          initError instanceof Error ? initError.message : String(initError)
        }`
      );
      logger.error("[Sync Exercise Images] Initialization error", initError, {
        route: "/api/admin/sync-exercise-images",
        operation: "initialize_production_app",
      });
      throw error;
    }
  }

  return productionApp.firestore();
}

// Helper type for database access
type DbAccessor = {
  collection: (path: string) => admin.firestore.CollectionReference;
};

/**
 * Get image URL for an exercise from master_exercise_images collection.
 * Only returns images with status "certified".
 * Queries by exercise_name field (exact match, trimmed).
 * Returns the primary image (position 1) if available.
 */
async function getImageForExercise(
  exerciseName: string,
  db: DbAccessor
): Promise<string | null> {
  try {
    // Normalize exercise name for query (trimmed only, as per documentation)
    const normalizedName = trimExerciseName(exerciseName);

    // Query by exercise_name field (exact match) and status (certified only).
    // We intentionally avoid orderBy here to prevent requiring a composite index,
    // and instead sort by position in memory, similar to the admin sync script.
    const snapshot = await db
      .collection("master_exercise_images")
      .where("exercise_name", "==", normalizedName)
      .where("status", "==", "certified")
      .get();

    if (snapshot.empty) {
      return null;
    }

    // Select the document with the lowest position value (primary image)
    // Using reduce to find the minimum position, matching the suggested approach
    const docs = snapshot.docs;
    const primaryDoc = docs.reduce((best, current) => {
      const bestData = best.data();
      const currentData = current.data();
      const bestPosition =
        typeof bestData.position === "number"
          ? bestData.position
          : Number.POSITIVE_INFINITY;
      const currentPosition =
        typeof currentData.position === "number"
          ? currentData.position
          : Number.POSITIVE_INFINITY;
      return currentPosition < bestPosition ? current : best;
    }, docs[0]);

    const data = primaryDoc.data();

    return data.image_url || null;
  } catch (error) {
    logger.error("Error fetching image for exercise", error, {
      route: "/api/admin/sync-exercise-images",
      operation: "get_image_for_exercise",
      exerciseName,
    });
    return null;
  }
}

/**
 * Update a single workout with mapped images.
 */
async function updateWorkoutWithImages(
  workoutId: string,
  db: DbAccessor
): Promise<number> {
  const workoutRef = db.collection("trainer_workouts").doc(workoutId);

  try {
    const workoutSnap = await workoutRef.get();
    if (!workoutSnap.exists) {
      return 0;
    }

    const workout = workoutSnap.data();
    if (!workout || !workout.sections) {
      return 0;
    }

    const sections = workout.sections as Array<{
      exercises: Array<{ name: string; image_url?: string }>;
    }>;

    let updateCount = 0;

    // Collect all exercises that need images with their section/exercise indices
    // This allows us to batch process queries while preserving section structure
    type ExerciseToMap = {
      sectionIdx: number;
      exerciseIdx: number;
      exercise: { name: string; image_url?: string };
    };

    const exercisesToMap: ExerciseToMap[] = [];
    sections.forEach((section, sectionIdx) => {
      section.exercises.forEach((exercise, exerciseIdx) => {
        if (!exercise.image_url) {
          exercisesToMap.push({
            sectionIdx,
            exerciseIdx,
            exercise,
          });
        }
      });
    });

    // Process exercises in batches to avoid overwhelming Firestore with concurrent queries
    // Batch size of 10 balances performance with rate limit concerns
    const BATCH_SIZE = 10;
    const imageMap = new Map<string, string>(); // key: "sectionIdx.exerciseIdx", value: imageUrl

    for (let i = 0; i < exercisesToMap.length; i += BATCH_SIZE) {
      const batch = exercisesToMap.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async ({ sectionIdx, exerciseIdx, exercise }) => {
          const imageUrl = await getImageForExercise(exercise.name, db);
          if (imageUrl) {
            updateCount++;
            return {
              key: `${sectionIdx}.${exerciseIdx}`,
              imageUrl,
            };
          }
          return null;
        })
      );

      // Store results in map
      batchResults.forEach((result) => {
        if (result) {
          imageMap.set(result.key, result.imageUrl);
        }
      });
    }

    // Reconstruct sections with mapped images
    const updatedSections = sections.map((section, sectionIdx) => ({
      ...section,
      exercises: section.exercises.map((exercise, exerciseIdx) => {
        const imageUrl = imageMap.get(`${sectionIdx}.${exerciseIdx}`);
        if (imageUrl) {
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
      await workoutRef.update({
        sections: updatedSections,
        updated_at: FieldValue.serverTimestamp(),
      });
    }

    return updateCount;
  } catch (error) {
    logger.error("Error updating workout", error, {
      route: "/api/admin/sync-exercise-images",
      operation: "update_workout_with_images",
      workoutId,
    });
    throw error;
  }
}

// ============================================
// POST Handler - Batch Sync Exercise Images
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    try {
      await verifyIdToken(idToken);
    } catch (error) {
      captureApiError(error, {
        endpoint: "admin_sync_exercise_images",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/sync-exercise-images",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Parse optional query parameters
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get("workoutId");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 1000;
    const useProduction = searchParams.get("useProduction") === "true";

    // 3. Get the appropriate database instance
    const db: DbAccessor = useProduction ? getProductionDb() : adminDb;

    logger.info("Sync operation started", {
      route: "/api/admin/sync-exercise-images",
      mode: useProduction ? "production" : "emulator",
    });

    const stats = {
      totalWorkouts: 0,
      updatedWorkouts: 0,
      totalExercisesUpdated: 0,
      errors: [] as string[],
      mode: useProduction ? "production" : "emulator",
    };

    // 4. Sync single workout or batch sync
    if (workoutId) {
      // Sync single workout
      try {
        const exercisesUpdated = await updateWorkoutWithImages(workoutId, db);
        if (exercisesUpdated > 0) {
          stats.updatedWorkouts = 1;
          stats.totalExercisesUpdated = exercisesUpdated;
        }
        stats.totalWorkouts = 1;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        stats.errors.push(`Workout ${workoutId}: ${errorMessage}`);
      }
    } else {
      // Batch sync all workouts
      const workoutsSnapshot = await db
        .collection("trainer_workouts")
        .limit(limit)
        .get();

      stats.totalWorkouts = workoutsSnapshot.size;

      for (const docSnap of workoutsSnapshot.docs) {
        const workoutId = docSnap.id;
        try {
          const exercisesUpdated = await updateWorkoutWithImages(workoutId, db);
          if (exercisesUpdated > 0) {
            stats.updatedWorkouts++;
            stats.totalExercisesUpdated += exercisesUpdated;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          stats.errors.push(`Workout ${workoutId}: ${errorMessage}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_sync_exercise_images",
      operation: "sync_exercise_images",
    });
    logger.error("Error syncing exercise images", error, {
      route: "/api/admin/sync-exercise-images",
      operation: "sync_exercise_images",
    });
    return NextResponse.json(
      {
        error: "Failed to sync exercise images",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
