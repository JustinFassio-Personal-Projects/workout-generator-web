import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { getActiveWaiver } from "@/lib/waiver/getActiveWaiver";
import { extractBearerToken } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import type { TrainerWorkout } from "@/types/firestore";
import type { ExerciseAIEditHistory } from "@/types/ai-exercise-editor";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const RequestBodySchema = z.object({
  workout_id: z.string().min(1),
  section_index: z.number().min(0),
  exercise_index: z.number().min(0),
  edit_id: z.string().min(1),
  // UI mapping: The FeedbackCollection component sends ratings on a unified 1-5 scale
  // - 1: thumbs down (negative feedback)
  // - 5: thumbs up (positive feedback)
  // - 1-5: star rating value (user selects 1-5 stars)
  user_rating: z.number().min(1).max(5),
  user_feedback: z.string().nullable().optional(),
});

// ============================================
// POST Handler
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

    let uid: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error) {
      logger.error("Token verification failed", error, {
        route: "/api/workouts/ai-exercise-apply-rating",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const rateLimit = await checkApiRateLimit(uid, "ai_exercise_apply_rating");
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

    // 2. Check waiver agreement (required for any AI feature)
    const activeWaiver = await getActiveWaiver();

    if (!activeWaiver) {
      logger.error(
        "[WAIVER CHECK FAILED] No active waiver found when user attempted to submit rating",
        undefined,
        {
          route: "/api/workouts/ai-exercise-apply-rating",
          operation: "waiver_check",
          userId: uid,
        }
      );
      return NextResponse.json(
        {
          error: "Waiver system error",
          message:
            "The liability waiver system is not available. Please contact support.",
        },
        { status: 503 }
      );
    }

    const waiverVersion = activeWaiver.version;

    // Check if user has agreed to this waiver version
    const agreementSnapshot = await adminDb
      .collection("user_waiver_agreements")
      .where("user_id", "==", uid)
      .where("waiver_version", "==", waiverVersion)
      .limit(1)
      .get();

    if (agreementSnapshot.empty) {
      logger.error(
        "[WAIVER CHECK FAILED] User attempted to submit rating without agreeing to waiver",
        undefined,
        {
          route: "/api/workouts/ai-exercise-apply-rating",
          operation: "waiver_check",
          userId: uid,
          waiverVersion,
        }
      );
      return NextResponse.json(
        {
          error: "Waiver agreement required",
          message:
            "You must agree to the liability waiver before using AI features. Please complete the waiver agreement and try again.",
          waiver_required: true,
          waiver_version: waiverVersion,
          waiver_url: `/waiver?version=${waiverVersion}`,
        },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = RequestBodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      workout_id,
      section_index,
      exercise_index,
      edit_id,
      user_rating,
      user_feedback,
    } = parseResult.data;

    // 4. Verify user owns the workout
    const workoutDoc = await adminDb
      .collection("trainer_workouts")
      .doc(workout_id)
      .get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = workoutDoc.data() as TrainerWorkout;
    if (workout.user_id !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 5. Validate indices
    if (
      section_index < 0 ||
      exercise_index < 0 ||
      section_index >= workout.sections.length ||
      exercise_index >= workout.sections[section_index]?.exercises.length
    ) {
      return NextResponse.json(
        { error: "Invalid section or exercise index" },
        { status: 400 }
      );
    }

    // 6. Get the exercise with history
    const exercise = workout.sections[section_index].exercises[exercise_index];
    const existingHistory = exercise.ai_edit_history || [];

    // 7. Find the history entry by edit_id
    const historyEntryIndex = existingHistory.findIndex(
      (entry) => entry.edit_id === edit_id
    );

    if (historyEntryIndex === -1) {
      return NextResponse.json(
        { error: "Edit history entry not found" },
        { status: 404 }
      );
    }

    // 8. Update the history entry with rating and feedback
    const updatedHistory = [...existingHistory];
    updatedHistory[historyEntryIndex] = {
      ...updatedHistory[historyEntryIndex],
      user_rating,
      user_feedback: user_feedback || null,
    };

    // 9. Update workout sections array with updated history
    const updatedSections = [...workout.sections];
    updatedSections[section_index] = {
      ...updatedSections[section_index],
      exercises: [...updatedSections[section_index].exercises],
    };
    updatedSections[section_index].exercises[exercise_index] = {
      ...exercise,
      ai_edit_history: updatedHistory,
    } as typeof exercise & {
      ai_edit_history?: ExerciseAIEditHistory[];
    };

    // 10. Save updated workout
    await adminDb.collection("trainer_workouts").doc(workout_id).update({
      sections: updatedSections,
      updated_at: new Date(),
    });

    // 11. Return success response
    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "ai_exercise_apply_rating",
      operation: "submit_rating",
    });
    incrementMetric("ai.failure", 1, { endpoint: "ai_exercise_apply_rating" });
    logger.error("Submit rating error", error, {
      route: "/api/workouts/ai-exercise-apply-rating",
      operation: "submit_rating",
    });

    // Generic server error
    // Note: ZodError is not caught here because safeParse() is used,
    // which returns a result object instead of throwing
    return NextResponse.json(
      {
        error: "Failed to submit rating",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
