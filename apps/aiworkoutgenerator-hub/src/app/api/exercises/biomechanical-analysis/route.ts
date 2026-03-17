import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";
import { verifyIdToken } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import { trimExerciseName } from "@/lib/image-generation-config";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";

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
  const appName = "production-biomechanical-analysis";
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
      logger.error("[Biomechanical Analysis] Configuration error", error, {
        route: "/api/exercises/biomechanical-analysis",
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
      logger.error("[Biomechanical Analysis] Configuration error", parseError, {
        route: "/api/exercises/biomechanical-analysis",
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
      logger.error("[Biomechanical Analysis] Configuration error", error, {
        route: "/api/exercises/biomechanical-analysis",
        operation: "validate_project_id",
      });
      throw error;
    }

    try {
      // Initialize production app with explicit credentials
      productionApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId,
        },
        appName
      );

      return productionApp.firestore();
    } catch (initError) {
      const error = new Error(
        `Failed to initialize production Firebase Admin app: ${
          initError instanceof Error ? initError.message : String(initError)
        }`
      );
      logger.error("[Biomechanical Analysis] Initialization error", initError, {
        route: "/api/exercises/biomechanical-analysis",
        operation: "initialize_production_app",
      });
      throw error;
    }
  }
}

/**
 * GET /api/exercises/biomechanical-analysis
 *
 * Fetches biomechanical analysis points for an exercise from master_exercise_images.
 * Requires authentication to prevent unauthorized access and enumeration.
 *
 * Query parameters:
 * - exerciseName: string (required) - The exercise name to look up
 *
 * Headers:
 * - Authorization: Bearer <token> (required) - Firebase ID token
 *
 * Returns:
 * - 200: { biomechanicalPoints: string[] | null }
 * - 400: Missing exerciseName parameter
 * - 401: Unauthorized (missing or invalid token)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // Verify authentication
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await verifyIdToken(token);
      uid = decoded.uid;
    } catch (error) {
      logger.error(
        "[Biomechanical Analysis] Token verification failed",
        error,
        {
          route: "/api/exercises/biomechanical-analysis",
          operation: "token_verification",
        }
      );
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const rateLimit = await checkApiRateLimit(uid, "biomechanical_analysis");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retry_after: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter ?? 60),
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const exerciseName = searchParams.get("exerciseName");

    if (!exerciseName) {
      return NextResponse.json(
        { error: "Missing required parameter: exerciseName" },
        { status: 400 }
      );
    }

    const db = getProductionDb();
    const normalizedName = trimExerciseName(exerciseName);

    // Query for certified images with matching exercise name
    const snapshot = await db
      .collection("master_exercise_images")
      .where("exercise_name", "==", normalizedName)
      .where("status", "==", "certified")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ biomechanicalPoints: null });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Extract biomechanical points from generation_metadata
    const generationMetadata = data.generation_metadata as
      | {
          biomechanicalPoints?: string[];
          complexityLevel?: string;
        }
      | undefined;

    const biomechanicalPoints = generationMetadata?.biomechanicalPoints ?? null;

    return NextResponse.json({ biomechanicalPoints });
  } catch (error) {
    captureApiError(error, {
      endpoint: "biomechanical_analysis",
      operation: "get_biomechanical_analysis",
    });
    incrementMetric("ai.failure", 1, { endpoint: "biomechanical_analysis" });
    logger.error("[Biomechanical Analysis] Error", error, {
      route: "/api/exercises/biomechanical-analysis",
      operation: "get_biomechanical_analysis",
    });
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
