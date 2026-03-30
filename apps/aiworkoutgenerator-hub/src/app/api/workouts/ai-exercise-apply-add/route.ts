import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { randomUUID } from "crypto";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { getActiveWaiver } from "@/lib/waiver/getActiveWaiver";
import { extractBearerToken } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import { assertReverseTrialAllowsAi } from "@/lib/reverse-trial/capabilities";
import type { TrainerWorkout, TrainerWorkoutExercise } from "@/types/firestore";
import type { ExerciseAIAddHistoryEntry } from "@/types/ai-exercise-editor";

export const dynamic = "force-dynamic";

const ExerciseAIAddHistoryEntrySchema = z.object({
  edit_id: z.string(),
  edit_type: z.literal("ai_add"),
  user_prompt: z.string(),
  previous_exercise: z.record(z.string(), z.unknown()).optional(),
  ai_model: z.string(),
  generation_tokens: z.number(),
  generation_cost_usd: z.number(),
  genkit_trace_id: z.string().nullable(),
  fields_modified: z.array(z.string()),
  user_rating: z.number().nullable(),
  user_feedback: z.string().nullable(),
  applied_at: z.string(),
});

const TrainerWorkoutExerciseSchema = z.record(z.string(), z.unknown());

const RequestBodySchema = z.object({
  workout_id: z.string().min(1),
  section_index: z.number().min(0),
  insert_position: z.number().min(0),
  new_exercise: TrainerWorkoutExerciseSchema,
  edit_history: ExerciseAIAddHistoryEntrySchema,
});

function convertAddHistoryToFirestore(
  raw: z.infer<typeof ExerciseAIAddHistoryEntrySchema>
): ExerciseAIAddHistoryEntry {
  return {
    edit_id: raw.edit_id || randomUUID(),
    edit_type: "ai_add",
    user_prompt: raw.user_prompt,
    previous_exercise: raw.previous_exercise ?? {},
    applied_at: Timestamp.fromDate(
      new Date(raw.applied_at)
    ) as unknown as ExerciseAIAddHistoryEntry["applied_at"],
    ai_model: raw.ai_model,
    generation_tokens: raw.generation_tokens,
    generation_cost_usd: raw.generation_cost_usd,
    genkit_trace_id: raw.genkit_trace_id,
    fields_modified: raw.fields_modified,
    user_rating: raw.user_rating,
    user_feedback: raw.user_feedback,
  };
}

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decoded = await verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const reverseTrialBlock = await assertReverseTrialAllowsAi(uid);
    if (reverseTrialBlock) return reverseTrialBlock;

    const rateLimit = await checkApiRateLimit(uid, "ai_exercise_apply_add");
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

    const activeWaiver = await getActiveWaiver();
    if (!activeWaiver) {
      return NextResponse.json(
        {
          error: "Waiver system error",
          message:
            "The liability waiver system is not available. Please contact support.",
        },
        { status: 503 }
      );
    }

    const agreementSnapshot = await adminDb
      .collection("user_waiver_agreements")
      .where("user_id", "==", uid)
      .where("waiver_version", "==", activeWaiver.version)
      .limit(1)
      .get();

    if (agreementSnapshot.empty) {
      return NextResponse.json(
        {
          error: "Waiver agreement required",
          message:
            "You must agree to the liability waiver before applying AI exercise changes. Please complete the waiver agreement and try again.",
          waiver_required: true,
          waiver_version: activeWaiver.version,
          waiver_url: `/waiver?version=${activeWaiver.version}`,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = RequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      workout_id,
      section_index,
      insert_position,
      new_exercise: newExerciseRaw,
      edit_history: editHistoryRaw,
    } = parsed.data;

    const workoutRef = adminDb.collection("trainer_workouts").doc(workout_id);
    const workoutSnap = await workoutRef.get();

    if (!workoutSnap.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = workoutSnap.data() as TrainerWorkout;
    if (workout.user_id !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const section = workout.sections?.[section_index];
    if (!section) {
      return NextResponse.json(
        { error: "Invalid section index" },
        { status: 400 }
      );
    }

    const exercises = section.exercises ?? [];
    if (insert_position > exercises.length) {
      return NextResponse.json(
        {
          error: "Invalid insert position",
          message: `insert_position must be between 0 and ${exercises.length} (inclusive).`,
        },
        { status: 400 }
      );
    }

    const editHistory = convertAddHistoryToFirestore(editHistoryRaw);
    if (!editHistory.edit_id) {
      editHistory.edit_id = randomUUID();
    }

    const newExercise = newExerciseRaw as unknown as TrainerWorkoutExercise;
    const exerciseWithHistory = {
      ...newExercise,
      ai_edit_history: [editHistory],
      last_ai_edited_at: Timestamp.now(),
      ai_edit_count: 1,
    } as TrainerWorkoutExercise & {
      ai_edit_history?: ExerciseAIAddHistoryEntry[];
      last_ai_edited_at?: Timestamp;
      ai_edit_count?: number;
    };

    const updatedSections = [...(workout.sections ?? [])];
    const sectionExercises = [
      ...(updatedSections[section_index]!.exercises ?? []),
    ];
    sectionExercises.splice(insert_position, 0, exerciseWithHistory);
    updatedSections[section_index] = {
      ...updatedSections[section_index]!,
      exercises: sectionExercises,
    };

    await workoutRef.update({
      sections: updatedSections,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Exercise added successfully",
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "ai_exercise_apply_add",
      operation: "apply_add_exercise",
    });
    incrementMetric("ai.failure", 1, { endpoint: "ai_exercise_apply_add" });
    logger.error("[apply-add] Error", error, {
      route: "/api/workouts/ai-exercise-apply-add",
      operation: "apply_add_exercise",
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 }
      );
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to add exercise",
        ...(process.env.NODE_ENV === "development" && { message: errMsg }),
      },
      { status: 500 }
    );
  }
}
