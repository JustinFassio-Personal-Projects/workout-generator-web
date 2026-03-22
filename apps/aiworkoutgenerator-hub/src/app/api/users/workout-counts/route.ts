import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { resolveIdToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

async function workoutCountsHandler(
  request: NextRequest,
  idToken: string,
  tier: string
): Promise<NextResponse> {
  try {
    // Check if we're using emulators
    const isUsingEmulators =
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST;

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (tokenError) {
      // In emulator mode, provide more helpful error messages
      if (isUsingEmulators) {
        logger.error("[Emulator] Token verification failed", tokenError, {
          route: "/api/users/workout-counts",
          operation: "token_verification",
        });
        // Check if it's an emulator connection issue
        const errorMessage =
          tokenError instanceof Error ? tokenError.message : String(tokenError);
        // Check Firebase Auth error code (more precise than string matching)
        const authErrorCode =
          tokenError &&
          typeof tokenError === "object" &&
          "code" in tokenError &&
          typeof (tokenError as { code: unknown }).code === "string"
            ? ((tokenError as { code: string }).code as string)
            : undefined;
        const isAuthError =
          typeof authErrorCode === "string" &&
          authErrorCode.startsWith("auth/");
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.includes("ECONNREFUSED");
        if (isAuthError || isNetworkError) {
          return NextResponse.json(
            {
              error:
                "Emulator connection error. Ensure Firebase emulators are running.",
              emulator: true,
              ...(process.env.NODE_ENV === "development" && {
                details: errorMessage,
              }),
            },
            { status: 503 }
          );
        }
      }
      // Re-throw for standard error handling
      throw tokenError;
    }

    const userId = decodedToken.uid;

    // Get workout count
    let workoutsQuery = adminDb
      .collection("trainer_workouts")
      .where("user_id", "==", userId);

    // Apply monthly window for paid tiers
    if (["basic", "pro", "elite", "coach", "coach_pro"].includes(tier)) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      workoutsQuery = workoutsQuery.where(
        "created_at",
        ">=",
        Timestamp.fromDate(startOfMonth)
      );
    }

    const workoutsSnapshot = await workoutsQuery.get();
    const workoutCount = workoutsSnapshot.size;

    // Get workouts with images count
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const imagesQuery = adminDb
      .collection("trainer_workouts")
      .where("user_id", "==", userId)
      .where("has_images", "==", true)
      .where("images_generated_at", ">=", Timestamp.fromDate(startOfMonth));

    const imagesSnapshot = await imagesQuery.get();
    const imageCount = imagesSnapshot.size;

    return NextResponse.json({
      success: true,
      workoutCount,
      imageCount,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "workout_counts",
      operation: "fetch_workout_counts",
    });
    // Log structured error for Cloud Run / App Hosting logs (diagnose 500: PERMISSION_DENIED, credential, etc.)
    const err = error as { code?: string; message?: string } | null;
    logger.error("Error fetching workout counts", error, {
      route: "/api/users/workout-counts",
      operation: "fetch_workout_counts",
      errorCode: err?.code ?? "unknown",
      errorMessage: err?.message ?? String(error),
    });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isAdminError =
      errorMessage.includes("Firebase Admin") ||
      errorMessage.includes("not initialized");

    // Check if we're using emulators
    const isUsingEmulators =
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST;

    // In emulator mode, check for connection errors
    const isConnectionError =
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("network") ||
      errorMessage.includes("connect");

    // Determine error status and message
    let status = 500;
    let errorMsg = "Failed to fetch workout counts";

    if (isAdminError) {
      errorMsg = "Service configuration error. Please contact support.";
    } else if (isUsingEmulators && isConnectionError) {
      errorMsg =
        "Emulator connection error. Ensure Firebase emulators are running.";
      status = 503;
    } else {
      // Check Firebase Auth error code (more precise than string matching)
      const authErrorCode =
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? ((error as { code: string }).code as string)
          : undefined;
      const isAuthError =
        typeof authErrorCode === "string" && authErrorCode.startsWith("auth/");
      if (isAuthError) {
        // Authentication/authorization errors
        status = 401;
        errorMsg = "Authentication failed";
      }
    }

    return NextResponse.json(
      {
        error: errorMsg,
        // Include emulator flag for client-side handling
        ...(isUsingEmulators && { emulator: true }),
        // Only include detailed error in development
        ...(process.env.NODE_ENV === "development" && {
          details: errorMessage,
        }),
      },
      { status }
    );
  }
}

/**
 * API route to get workout and image counts for a user.
 * Uses Admin SDK to bypass security rules.
 *
 * POST accepts JSON `{ tier?, _firebaseIdToken? }` when proxies strip auth headers (App Hosting).
 */
export async function GET(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  const idToken = resolveIdToken(request, null);
  if (!idToken) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }
  const tier = request.nextUrl.searchParams.get("tier") || "free";
  return workoutCountsHandler(request, idToken, tier);
}

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  const idToken = resolveIdToken(request, body);
  if (!idToken) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }
  const tier =
    (typeof body.tier === "string" ? body.tier : null) ||
    request.nextUrl.searchParams.get("tier") ||
    "free";
  return workoutCountsHandler(request, idToken, tier);
}
