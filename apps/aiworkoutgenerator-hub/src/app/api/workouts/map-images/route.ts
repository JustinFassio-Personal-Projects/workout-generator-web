import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";
import { mapImagesToWorkoutObjectWithDb } from "@/lib/image-mapping-admin";
import { verifyIdToken } from "@/lib/firebase-admin";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

/**
 * Get a production-only Firestore instance.
 * Creates a separate Firebase Admin app instance for production database access.
 *
 * This function creates a separate Admin app instance that connects directly to
 * production Firestore, bypassing emulator settings. This is necessary because
 * master_exercise_images is a production-only collection that needs to be
 * accessible from both development (with emulator) and production environments.
 *
 * @returns Production Firestore instance
 * @throws Error if FIREBASE_SERVICE_ACCOUNT_KEY is not set or invalid
 */
function getProductionDb(): admin.firestore.Firestore {
  const appName = "production-image-mapping";
  let productionApp: admin.app.App;

  try {
    productionApp = admin.app(appName);
    return productionApp.firestore();
  } catch {
    // App doesn't exist, create it
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      const error = new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required for production database access. " +
          "This is needed to query master_exercise_images collection."
      );
      logger.error("[Image Mapping] Configuration error", error, {
        route: "/api/workouts/map-images",
        operation: "get_production_db",
      });
      throw error;
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
    } catch (parseError) {
      const error = new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Please check your environment configuration."
      );
      logger.error("[Image Mapping] Configuration error", parseError, {
        route: "/api/workouts/map-images",
        operation: "parse_service_account",
      });
      throw error;
    }

    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.projectId;

    if (!projectId) {
      const error = new Error(
        "Project ID is required. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or include projectId in service account."
      );
      logger.error("[Image Mapping] Configuration error", error, {
        route: "/api/workouts/map-images",
        operation: "validate_project_id",
      });
      throw error;
    }

    try {
      // Initialize production app with explicit credentials
      // This creates a separate app instance that will connect to production
      // even if FIRESTORE_EMULATOR_HOST is set (by using explicit credentials)
      productionApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId,
        },
        appName
      );

      // Get Firestore instance from the production app
      // Note: Firebase Admin SDK respects the app's configuration and will
      // connect to production when explicit credentials are provided
      return productionApp.firestore();
    } catch (initError) {
      const error = new Error(
        `Failed to initialize production Firebase Admin app: ${
          initError instanceof Error ? initError.message : String(initError)
        }`
      );
      logger.error("[Image Mapping] Initialization error", initError, {
        route: "/api/workouts/map-images",
        operation: "initialize_production_app",
      });
      throw error;
    }
  }
}

/**
 * API route to map images to a workout object.
 * Accepts a workout object and returns it with mapped images from master_exercise_images.
 * Uses production Firestore database to query master_exercise_images.
 *
 * Requires authentication to prevent abuse (reconnaissance, excessive database reads).
 * Only authenticated users can query the master_exercise_images collection.
 */
export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    try {
      await verifyIdToken(idToken);
    } catch (verifyError) {
      const errMsg =
        verifyError instanceof Error
          ? verifyError.message
          : String(verifyError);
      logger.warn(
        "[Image Mapping API] Token verification failed",
        verifyError,
        {
          route: "/api/workouts/map-images",
          operation: "verify_token",
          hint:
            errMsg.includes("project") ||
            errMsg.includes("audience") ||
            errMsg.includes("issuer")
              ? "Project/audience mismatch: ensure FIREBASE_SERVICE_ACCOUNT_KEY matches NEXT_PUBLIC_FIREBASE_PROJECT_ID"
              : undefined,
        }
      );
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workout } = body;

    if (!workout || !workout.sections) {
      return NextResponse.json(
        { error: "Invalid workout object. Must include 'sections' array." },
        { status: 400 }
      );
    }

    // Clone workout to avoid mutation of the original
    const workoutWithImages = JSON.parse(JSON.stringify(workout));

    // IMPORTANT: master_exercise_images is a production-only collection.
    // Even when using emulators for user data, we need to query production
    // for master_exercise_images since it's shared across all users.
    const db = getProductionDb();

    // Map images (this modifies the workout object)
    const mappingResult = await mapImagesToWorkoutObjectWithDb(
      workoutWithImages,
      db
    );

    // Log mapping results for monitoring
    if (mappingResult.errorCount > 0) {
      logger.warn("[Image Mapping API] Completed with errors", undefined, {
        route: "/api/workouts/map-images",
        successCount: mappingResult.successCount,
        errorCount: mappingResult.errorCount,
      });
    } else if (mappingResult.imagesMapped) {
      logger.info("[Image Mapping API] Successfully mapped images", {
        route: "/api/workouts/map-images",
        successCount: mappingResult.successCount,
      });
    }

    return NextResponse.json({
      success: true,
      workout: workoutWithImages,
      stats: {
        imagesMapped: mappingResult.imagesMapped,
        successCount: mappingResult.successCount,
        errorCount: mappingResult.errorCount,
      },
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "workouts_map_images",
      operation: "map_images",
    });
    logger.error("[Image Mapping API] Error mapping images", error, {
      route: "/api/workouts/map-images",
      operation: "map_images",
    });

    // Return appropriate error response
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: "Failed to map images",
        ...(isDevelopment && {
          details: errorMessage,
          stack: errorStack,
        }),
      },
      { status: 500 }
    );
  }
}
