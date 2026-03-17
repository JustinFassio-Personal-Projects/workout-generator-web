import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { mapImagesToWorkoutObject } from "@/lib/image-mapping-admin";
import type { TrainerWorkout } from "@/types/firestore";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

/**
 * API route to get user's workouts.
 * Uses Admin SDK to bypass security rules.
 */
export async function GET(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Validate limit parameter
    const limitParam = request.nextUrl.searchParams.get("limit");
    let limit = 10; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json(
          {
            error:
              "Invalid limit parameter. Must be a positive integer between 1 and 100.",
          },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    // Get user's workouts
    const workoutsQuery = adminDb
      .collection("trainer_workouts")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .limit(limit);

    const snapshot = await workoutsQuery.get();

    // Process workouts in batches to avoid overwhelming Firestore with concurrent queries
    // Each workout may trigger multiple queries (one per exercise needing an image)
    // Batch size of 5 balances performance with rate limit concerns
    const BATCH_SIZE = 5;
    const workouts: TrainerWorkout[] = [];

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const batch = snapshot.docs.slice(i, i + BATCH_SIZE);
      const batchWorkouts = await Promise.all(
        batch.map(async (doc) => {
          const workout = {
            id: doc.id,
            ...doc.data(),
          } as TrainerWorkout;

          // Map images from master_exercise_images to exercises
          await mapImagesToWorkoutObject(workout);

          return workout;
        })
      );
      workouts.push(...batchWorkouts);
    }

    return NextResponse.json({
      success: true,
      workouts,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "users_workouts",
      operation: "fetch_workouts",
    });
    logger.error("Error fetching workouts", error, {
      route: "/api/users/workouts",
      operation: "fetch_workouts",
    });
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}
