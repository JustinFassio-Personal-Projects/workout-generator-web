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
 * API route to get a specific workout by ID.
 * Uses Admin SDK to bypass security rules.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
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

    const { workoutId } = await params;
    const workoutDoc = await adminDb
      .collection("trainer_workouts")
      .doc(workoutId)
      .get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workoutData = workoutDoc.data();

    // Verify the workout belongs to the user
    if (workoutData?.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const workout = {
      id: workoutDoc.id,
      ...workoutData,
    } as TrainerWorkout;

    // Map images from master_exercise_images to exercises
    await mapImagesToWorkoutObject(workout);

    return NextResponse.json({
      success: true,
      workout,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "users_workouts_detail",
      operation: "fetch_workout",
    });
    logger.error("Error fetching workout", error, {
      route: "/api/users/workouts/[workoutId]",
      operation: "fetch_workout",
    });
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}
