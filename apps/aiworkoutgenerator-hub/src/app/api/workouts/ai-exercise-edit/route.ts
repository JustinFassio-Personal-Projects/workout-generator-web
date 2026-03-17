import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { getActiveWaiver } from "@/lib/waiver/getActiveWaiver";
import { extractBearerToken } from "@/lib/api-utils";
import {
  checkAIActionRateLimit,
  buildLimitReachedMessage,
} from "@/lib/ai-action-limiter";
import {
  editExerciseFlow,
  transformEditOutputToFirestore,
  estimateTokenUsage,
  estimateCostUsd,
  type AIEditRequestInput,
} from "@/lib/genkit/flows/edit-exercise";
import {
  resolvePromptForTarget,
  resolvePromptSetForTrainer,
} from "@/lib/ai-prompts";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import type { TrainerWorkout } from "@/types/firestore";
import {
  buildAIEditContext,
  detectModifiedFields,
} from "@/lib/genkit/utils/ai-context-helpers";
import { normalizeTrainerData } from "@/lib/trainer-normalize";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

/**
 * Zod-compatible schema for AIEditRequest (matches Genkit schema from edit-exercise.ts).
 * We need a separate Zod schema because Genkit uses its own z instance which is
 * incompatible with regular Zod schemas.
 */
const AIEditRequestSchemaZod = z.object({
  mode: z.enum([
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
  user_prompt: z.string().min(1).max(1000),
  context: z.object({
    exercise: z.object({
      name: z.string(),
      sets: z.number(),
      muscleTarget: z.string(),
      tempo: z.string().nullable(),
      cues: z.array(z.string()),
      detailedInstructions: z.string().nullable(),
      setDetails: z.array(
        z.object({
          reps: z.string(),
          weight: z.string(),
          duration: z.string().optional(),
          rest: z.string(),
          notes: z.string().optional(),
        })
      ),
      equipment_needed: z.array(z.string()),
      muscle_groups: z.array(z.string()),
    }),
    section_type: z.enum(["Warmup", "Main Workout", "Cooldown", "Finisher"]),
    workout_focus: z.string().nullable(),
    workout_difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    user_fitness_level: z.enum([
      "beginner",
      "intermediate",
      "advanced",
      "athlete",
    ]),
    user_injuries: z.array(z.string()),
    available_equipment: z.array(z.string()),
  }),
  options: z.object({
    regenerate_image: z.boolean(),
    preserve_sets_reps: z.boolean(),
    maintain_muscle_target: z.boolean(),
  }),
});

const RequestBodySchema = z.object({
  workout_id: z.string().min(1),
  section_index: z.number().min(0),
  exercise_index: z.number().min(0),
  edit_request: AIEditRequestSchemaZod,
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
        route: "/api/workouts/ai-exercise-edit",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const apiRateLimit = await checkApiRateLimit(uid, "ai_exercise_edit");
    if (!apiRateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retry_after: apiRateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(apiRateLimit.retryAfter ?? 60),
          },
        }
      );
    }

    // 2. Check waiver agreement
    const activeWaiver = await getActiveWaiver();
    if (!activeWaiver) {
      logger.error(
        "[WAIVER CHECK FAILED] No active waiver found in database. This is a configuration error.",
        undefined,
        {
          route: "/api/workouts/ai-exercise-edit",
          operation: "waiver_check",
        }
      );
      return NextResponse.json(
        {
          error: "System configuration error",
          message:
            "No active liability waiver is configured. Please contact support. AI exercise editing is temporarily unavailable.",
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
        "[WAIVER CHECK FAILED] User attempted AI edit without agreeing to waiver",
        undefined,
        {
          route: "/api/workouts/ai-exercise-edit",
          operation: "waiver_check",
          userId: uid,
          waiverVersion,
        }
      );
      return NextResponse.json(
        {
          error: "Waiver agreement required",
          message:
            "You must agree to the liability waiver before using AI exercise editing. Please complete the waiver agreement and try again.",
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

    // Extract validated data
    const validatedBody = parseResult.data;
    const { workout_id, section_index, exercise_index, edit_request } =
      validatedBody;

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

    // 6. Check unified AI action rate limit
    const rateLimit = await checkAIActionRateLimit(
      uid,
      "ai_edit",
      "/api/workouts/ai-exercise-edit"
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "AI action limit reached",
          tier: rateLimit.tier,
          remaining: rateLimit.remaining,
          message: buildLimitReachedMessage(rateLimit.tier, "AI edit"),
        },
        { status: rateLimit.tier === "free" ? 403 : 429 }
      );
    }

    // 7. Build context from workout
    const context = buildAIEditContext(workout, section_index, exercise_index);

    // 8. Validate and extract edit_request
    // Re-validate to ensure proper type inference
    const editRequestValidation =
      AIEditRequestSchemaZod.safeParse(edit_request);
    if (!editRequestValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid edit_request",
          details: editRequestValidation.error.flatten(),
        },
        { status: 400 }
      );
    }
    const validatedEditRequest = editRequestValidation.data;

    // 9. Build flow input
    const flowInput: AIEditRequestInput = {
      mode: validatedEditRequest.mode,
      user_prompt: validatedEditRequest.user_prompt,
      context: {
        exercise: context.exercise,
        section_type: context.section_type,
        workout_focus: context.workout_focus,
        workout_difficulty: context.workout_difficulty,
        user_fitness_level: context.user_fitness_level,
        user_injuries: context.user_injuries,
        available_equipment: context.available_equipment,
      },
      options: validatedEditRequest.options,
    };

    // 10. Resolve prompt overrides for AI edit (admin-managed)
    const trainerDoc =
      workout.trainerId && typeof workout.trainerId === "string"
        ? await adminDb.collection("trainers").doc(workout.trainerId).get()
        : null;
    const trainer = trainerDoc?.exists
      ? normalizeTrainerData(
          trainerDoc.data() as Record<string, unknown>,
          trainerDoc.id
        )
      : null;
    const promptSet = await resolvePromptSetForTrainer(trainer);
    const promptContext = {
      workout_difficulty: context.workout_difficulty,
      user_fitness_level: context.user_fitness_level,
      user_injuries: context.user_injuries,
      available_equipment: context.available_equipment,
      equipment_access: Array.isArray(
        workout.generation_context?.profile_snapshot?.equipment_access
      )
        ? workout.generation_context.profile_snapshot.equipment_access
        : workout.generation_context?.profile_snapshot?.equipment_access
          ? [workout.generation_context.profile_snapshot.equipment_access]
          : [],
      edit_mode: validatedEditRequest.mode,
      user_prompt: validatedEditRequest.user_prompt,
      exercise_name: context.exercise.name,
    };
    const resolvedPrompt = await resolvePromptForTarget({
      trainer,
      promptSet,
      target: "edit_exercise",
      context: promptContext,
    });
    const promptOverrides = resolvedPrompt.prompt
      ? { systemPrompt: resolvedPrompt.prompt }
      : undefined;

    // 11. Call Genkit flow
    const aiOutput = await editExerciseFlow(flowInput, promptOverrides);

    // 12. Transform output to Firestore format
    const transformed = transformEditOutputToFirestore(aiOutput);

    // 13. Estimate tokens and cost
    const promptContent = JSON.stringify(flowInput);
    const outputContent = JSON.stringify(aiOutput);
    const estimatedTokens = estimateTokenUsage(promptContent, outputContent);
    const estimatedCost = estimateCostUsd(estimatedTokens);

    // 14. Detect modified fields
    const previousExercise =
      workout.sections[section_index].exercises[exercise_index];
    const fieldsModified = detectModifiedFields(
      previousExercise,
      transformed.exercise
    );

    // 15. Log usage for admin repo
    const usageLogRef = adminDb.collection("ai_usage_logs").doc();
    await usageLogRef.set({
      id: usageLogRef.id,
      user_id: uid,
      workout_id: workout_id,
      section_index: section_index,
      exercise_index: exercise_index,
      edit_type: "ai_edit",
      edit_mode: flowInput.mode,
      user_prompt: flowInput.user_prompt.substring(0, 500), // Truncate for logs
      ai_model: "googleai/gemini-2.0-flash",
      generation_tokens: estimatedTokens,
      generation_cost_usd: estimatedCost,
      genkit_trace_id: null, // TODO: Extract from flow response if available
      ...(resolvedPrompt.metadata && {
        prompt_metadata: {
          ...resolvedPrompt.metadata,
          resolved_at: new Date(),
        },
      }),
      created_at: Timestamp.now(),
    });

    // 16. Return success response
    return NextResponse.json({
      success: true,
      modified_exercise: transformed.exercise,
      explanation: transformed.explanation,
      fields_modified: fieldsModified,
      metadata: {
        ai_model: "googleai/gemini-2.0-flash",
        generation_tokens: estimatedTokens.totalTokens,
        generation_cost_usd: estimatedCost,
        genkit_trace_id: null,
      },
      usage: {
        remaining: rateLimit.remaining,
        tier: rateLimit.tier,
      },
    });
  } catch (error) {
    // Capture error in Sentry for AI issues tracking
    captureApiError(error, {
      endpoint: "ai_exercise_edit",
      operation: "ai_exercise_edit",
    });
    incrementMetric("ai.failure", 1, { endpoint: "ai_exercise_edit" });

    logger.error("AI exercise edit error", error, {
      route: "/api/workouts/ai-exercise-edit",
      operation: "ai_exercise_edit",
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

    // Check for rate limit/quota errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = JSON.stringify(error);
    const allErrorText = `${errorMessage} ${errorString}`.toLowerCase();

    // Check for 429 status in error object
    const has429Status =
      (error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 429) ||
      (error &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode === 429);

    if (
      allErrorText.includes("429") ||
      allErrorText.includes("quota") ||
      allErrorText.includes("rate limit") ||
      allErrorText.includes("too many requests") ||
      has429Status
    ) {
      return NextResponse.json(
        {
          error: "AI service rate limit exceeded",
          message:
            "The AI service is currently at capacity. Please try again in a few minutes.",
          details:
            "You've exceeded your current quota. Check your plan and billing details in your AI provider dashboard.",
        },
        { status: 429 }
      );
    }

    // Check for API key issues
    if (
      errorMessage.includes("API key") ||
      errorMessage.includes("authentication")
    ) {
      return NextResponse.json(
        { error: "AI service configuration error" },
        { status: 503 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Failed to edit exercise",
        ...(process.env.NODE_ENV === "development" && {
          message: errorMessage,
          details: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
