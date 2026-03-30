import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { randomUUID } from "crypto";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { getActiveWaiver } from "@/lib/waiver/getActiveWaiver";
import { extractBearerToken } from "@/lib/api-utils";
import { detectModifiedFields } from "@/lib/genkit/utils/ai-context-helpers";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import { assertReverseTrialAllowsAi } from "@/lib/reverse-trial/capabilities";
import type { TrainerWorkout, TrainerWorkoutExercise } from "@/types/firestore";
import type {
  ExerciseAIEditHistory,
  ExerciseAIEditHistoryEntry,
  ExerciseAISwapHistoryEntry,
} from "@/types/ai-exercise-editor";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

// We need to create schemas for the request body since the types use Firestore Timestamp
// which isn't directly JSON serializable. We'll accept ISO strings and convert.

const ExerciseAIEditHistoryEntrySchema = z.object({
  edit_id: z.string(),
  edit_type: z.literal("ai_edit"),
  edit_mode: z.enum([
    "add_detail",
    "update_images",
    "adjust_difficulty",
    "modify_for_injury",
    "change_intensity",
    "create_complex",
    "simplify",
    "adjust_equipment",
    "rewrite_cues",
    "coach_explain",
    "custom",
  ]),
  user_prompt: z.string(),
  previous_exercise: z.record(z.string(), z.unknown()), // Partial<TrainerWorkoutExercise>
  ai_model: z.string(),
  generation_tokens: z.number(),
  generation_cost_usd: z.number(),
  genkit_trace_id: z.string().nullable(),
  fields_modified: z.array(z.string()),
  user_rating: z.number().nullable(),
  user_feedback: z.string().nullable(),
  applied_at: z.string(), // ISO string, will convert to Timestamp
});

const ExerciseAISwapHistoryEntrySchema = z.object({
  edit_id: z.string(),
  edit_type: z.literal("ai_swap"),
  user_prompt: z.string(),
  previous_exercise: z.record(z.string(), z.unknown()), // Partial<TrainerWorkoutExercise>
  ai_model: z.string(),
  generation_tokens: z.number(),
  generation_cost_usd: z.number(),
  genkit_trace_id: z.string().nullable(),
  fields_modified: z.array(z.string()),
  user_rating: z.number().nullable(),
  user_feedback: z.string().nullable(),
  applied_at: z.string(), // ISO string, will convert to Timestamp
});

const EditHistorySchema = z.discriminatedUnion("edit_type", [
  ExerciseAIEditHistoryEntrySchema,
  ExerciseAISwapHistoryEntrySchema,
]);

// Simple schema for TrainerWorkoutExercise (we'll validate it exists but not deeply)
const TrainerWorkoutExerciseSchema = z.record(z.string(), z.unknown());

const RequestBodySchema = z.object({
  workout_id: z.string().min(1),
  section_index: z.number().min(0),
  exercise_index: z.number().min(0),
  modified_exercise: TrainerWorkoutExerciseSchema,
  edit_history: EditHistorySchema,
});

// ============================================
// Helper Functions
// ============================================

/**
 * Convert edit history entry from request format (ISO string dates) to Firestore format (Timestamp).
 */
function convertEditHistoryToFirestore(
  editHistory: z.infer<typeof EditHistorySchema>
): ExerciseAIEditHistory {
  const base = {
    edit_id: editHistory.edit_id || randomUUID(),
    user_prompt: editHistory.user_prompt,
    applied_at: Timestamp.fromDate(new Date(editHistory.applied_at)),
    previous_exercise: editHistory.previous_exercise,
    ai_model: editHistory.ai_model,
    generation_tokens: editHistory.generation_tokens,
    generation_cost_usd: editHistory.generation_cost_usd,
    genkit_trace_id: editHistory.genkit_trace_id,
    fields_modified: editHistory.fields_modified,
    user_rating: editHistory.user_rating,
    user_feedback: editHistory.user_feedback,
  };

  if (editHistory.edit_type === "ai_edit") {
    return {
      ...base,
      edit_type: "ai_edit",
      edit_mode: editHistory.edit_mode,
    } as ExerciseAIEditHistoryEntry;
  } else {
    return {
      ...base,
      edit_type: "ai_swap",
    } as ExerciseAISwapHistoryEntry;
  }
}

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
        route: "/api/workouts/ai-exercise-apply",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const reverseTrialBlock = await assertReverseTrialAllowsAi(uid);
    if (reverseTrialBlock) return reverseTrialBlock;

    const rateLimit = await checkApiRateLimit(uid, "ai_exercise_apply");
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

    // 2. Check waiver agreement
    const activeWaiver = await getActiveWaiver();

    if (!activeWaiver) {
      logger.error(
        "[WAIVER CHECK FAILED] No active waiver found when user attempted to apply AI edit",
        undefined,
        {
          route: "/api/workouts/ai-exercise-apply",
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
        "[WAIVER CHECK FAILED] User attempted to apply AI edit without agreeing to waiver",
        undefined,
        {
          route: "/api/workouts/ai-exercise-apply",
          operation: "waiver_check",
          userId: uid,
          waiverVersion,
        }
      );
      return NextResponse.json(
        {
          error: "Waiver agreement required",
          message:
            "You must agree to the liability waiver before applying AI exercise edits. Please complete the waiver agreement and try again.",
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
      modified_exercise: modifiedExerciseRaw,
      edit_history: editHistoryRaw,
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
      section_index >= workout.sections.length ||
      exercise_index >= workout.sections[section_index]?.exercises.length
    ) {
      return NextResponse.json(
        { error: "Invalid section or exercise index" },
        { status: 400 }
      );
    }

    // 6. Get previous exercise for history
    const previousExercise = {
      ...workout.sections[section_index].exercises[exercise_index],
    };

    // 7. Convert modified exercise (validate it's a proper TrainerWorkoutExercise)
    const modifiedExercise =
      modifiedExerciseRaw as unknown as TrainerWorkoutExercise;

    // 8. Convert edit history to Firestore format
    const editHistory = convertEditHistoryToFirestore(editHistoryRaw);

    // Ensure edit_id is set if not provided
    if (!editHistory.edit_id) {
      editHistory.edit_id = randomUUID();
    }

    // Update fields_modified if not provided (detect from previous/modified)
    if (editHistory.fields_modified.length === 0) {
      editHistory.fields_modified = detectModifiedFields(
        previousExercise,
        modifiedExercise
      );
    }

    // Ensure applied_at is current (should already be set from conversion)
    // Note: applied_at is set in convertEditHistoryToFirestore

    // 9. Get original exercise to preserve existing history if it exists
    // Must read from original workout BEFORE we modify updatedSections
    const originalExercise =
      workout.sections[section_index].exercises[exercise_index];
    const existingHistory = originalExercise.ai_edit_history || [];
    // Note: ai_edit_count is not yet in the type definition (future enhancement)
    const existingEditCount =
      (
        originalExercise as TrainerWorkoutExercise & {
          ai_edit_count?: number;
        }
      ).ai_edit_count || 0;

    // 10. Update workout sections array
    const updatedSections = [...workout.sections];

    // Update the exercise in the array with history
    // Note: ai_edit_history, last_ai_edited_at, and ai_edit_count are Phase 6 fields
    // Phase 2 prepares for them but they won't be in the TrainerWorkoutExercise type yet
    const exerciseWithHistoryFields = {
      ...modifiedExercise,
      ai_edit_history: [...existingHistory, editHistory],
      last_ai_edited_at: Timestamp.now(),
      ai_edit_count: existingEditCount + 1,
    } as unknown as TrainerWorkoutExercise & {
      ai_edit_history?: ExerciseAIEditHistory[];
      last_ai_edited_at?: Timestamp;
      ai_edit_count?: number;
    };
    updatedSections[section_index].exercises[exercise_index] =
      exerciseWithHistoryFields;

    // 11. Save updated workout
    await adminDb.collection("trainer_workouts").doc(workout_id).update({
      sections: updatedSections,
      updated_at: FieldValue.serverTimestamp(),
    });

    // 12. Return success response
    return NextResponse.json({
      success: true,
      message: "Exercise edit applied successfully",
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "ai_exercise_apply",
      operation: "apply_exercise_edit",
    });
    incrementMetric("ai.failure", 1, { endpoint: "ai_exercise_apply" });
    logger.error("Apply exercise edit error", error, {
      route: "/api/workouts/ai-exercise-apply",
      operation: "apply_exercise_edit",
    });

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Failed to apply exercise edit",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
