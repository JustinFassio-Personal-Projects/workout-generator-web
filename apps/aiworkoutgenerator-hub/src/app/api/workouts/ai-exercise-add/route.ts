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
  addExerciseFlow,
  transformAddOutputToFirestore,
  type AIAddRequestInput,
} from "@/lib/genkit/flows/add-exercise";
import {
  estimateTokenUsage,
  estimateCostUsd,
} from "@/lib/genkit/flows/edit-exercise";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import { assertReverseTrialAllowsAi } from "@/lib/reverse-trial/capabilities";
import type { TrainerWorkout } from "@/types/firestore";
import { buildAIEditContext } from "@/lib/genkit/utils/ai-context-helpers";

export const dynamic = "force-dynamic";

const AIAddRequestSchemaZod = z.object({
  reason: z.string().min(1).max(500),
  constraints: z.object({
    same_muscle_group: z.boolean(),
    same_equipment: z.boolean(),
    same_difficulty: z.boolean(),
    similar_movement_pattern: z.boolean(),
  }),
});

const RequestBodySchema = z.object({
  workout_id: z.string().min(1),
  section_index: z.number().min(0),
  exercise_index: z.number().min(0),
  add_request: AIAddRequestSchemaZod,
});

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

    const apiRateLimit = await checkApiRateLimit(uid, "ai_exercise_add");
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

    const activeWaiver = await getActiveWaiver();
    if (!activeWaiver) {
      return NextResponse.json(
        {
          error: "Waiver system error",
          message:
            "No active liability waiver is configured. Please contact support. AI exercise add is temporarily unavailable.",
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
            "You must agree to the liability waiver before using AI exercise features. Please complete the waiver agreement and try again.",
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

    const { workout_id, section_index, exercise_index, add_request } =
      parsed.data;

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

    if (
      section_index >= (workout.sections?.length ?? 0) ||
      exercise_index >=
        (workout.sections?.[section_index]?.exercises?.length ?? 0)
    ) {
      return NextResponse.json(
        { error: "Invalid section or exercise index" },
        { status: 400 }
      );
    }

    const rateLimit = await checkAIActionRateLimit(
      uid,
      "ai_add",
      "/api/workouts/ai-exercise-add"
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "AI action limit reached",
          tier: rateLimit.tier,
          remaining: rateLimit.remaining,
          message: buildLimitReachedMessage(rateLimit.tier, "AI add"),
        },
        { status: rateLimit.tier === "free" ? 403 : 429 }
      );
    }

    const context = buildAIEditContext(workout, section_index, exercise_index);
    const addRequestValidation = AIAddRequestSchemaZod.safeParse(add_request);
    if (!addRequestValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid add_request",
          details: addRequestValidation.error.flatten(),
        },
        { status: 400 }
      );
    }
    const validatedAddRequest = addRequestValidation.data;

    const flowInput: AIAddRequestInput = {
      reason: validatedAddRequest.reason,
      constraints: validatedAddRequest.constraints,
      context: {
        reference_exercise: context.exercise,
        section_type: context.section_type,
        workout_focus: context.workout_focus,
        workout_difficulty: context.workout_difficulty,
        user_fitness_level: context.user_fitness_level,
        user_injuries: context.user_injuries,
        available_equipment: context.available_equipment,
        adjacent_exercises: context.adjacent_exercises,
      },
    };

    const aiOutput = await addExerciseFlow(flowInput);
    const transformed = transformAddOutputToFirestore(aiOutput);

    const promptContent = JSON.stringify(flowInput);
    const outputContent = JSON.stringify(aiOutput);
    const estimatedTokens = estimateTokenUsage(promptContent, outputContent);
    const estimatedCost = estimateCostUsd(estimatedTokens);

    const usageLogRef = adminDb.collection("ai_usage_logs").doc();
    await usageLogRef.set({
      id: usageLogRef.id,
      user_id: uid,
      workout_id,
      section_index,
      exercise_index,
      edit_type: "ai_add",
      user_prompt: validatedAddRequest.reason.substring(0, 500),
      ai_model: "googleai/gemini-2.0-flash",
      generation_tokens: estimatedTokens.totalTokens,
      generation_cost_usd: estimatedCost,
      genkit_trace_id: null,
      created_at: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      suggestions: transformed.suggestions,
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
    captureApiError(error, {
      endpoint: "ai_exercise_add",
      operation: "add_exercise",
    });
    incrementMetric("ai.failure", 1, { endpoint: "ai_exercise_add" });
    logger.error("[AI Add] Error", error, {
      route: "/api/workouts/ai-exercise-add",
      operation: "add_exercise",
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 }
      );
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    const all = `${errMsg} ${JSON.stringify(error)}`.toLowerCase();
    if (
      all.includes("429") ||
      all.includes("quota") ||
      all.includes("rate limit") ||
      all.includes("too many requests")
    ) {
      return NextResponse.json(
        {
          error: "AI service rate limit exceeded",
          message:
            "The AI service is currently at capacity. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    if (errMsg.includes("API key") || errMsg.includes("authentication")) {
      return NextResponse.json(
        { error: "AI service configuration error" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate add exercise suggestions",
        ...(process.env.NODE_ENV === "development" && { message: errMsg }),
      },
      { status: 500 }
    );
  }
}
