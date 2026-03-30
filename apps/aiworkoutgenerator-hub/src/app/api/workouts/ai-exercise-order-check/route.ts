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
  checkExerciseOrderFlow,
  type CheckExerciseOrderInput,
} from "@/lib/genkit/flows/check-exercise-order";
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

export const dynamic = "force-dynamic";

const RequestBodySchema = z.object({
  workout_id: z.string().min(1),
  section_index: z.number().min(0),
  exercise_index: z.number().min(0),
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

    const apiRateLimit = await checkApiRateLimit(
      uid,
      "ai_exercise_order_check"
    );
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
            "You must agree to the liability waiver before using AI exercise features. Complete the waiver and try again.",
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

    const { workout_id, section_index, exercise_index } = parsed.data;

    const rateLimit = await checkAIActionRateLimit(
      uid,
      "ai_order_check",
      "/api/workouts/ai-exercise-order-check"
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "AI action limit reached",
          tier: rateLimit.tier,
          remaining: rateLimit.remaining,
          message: buildLimitReachedMessage(rateLimit.tier, "AI order check"),
        },
        { status: rateLimit.tier === "free" ? 403 : 429 }
      );
    }

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

    const section = workout.sections?.[section_index];
    if (!section) {
      return NextResponse.json(
        { error: "Invalid section index" },
        { status: 400 }
      );
    }

    const exercises = section.exercises ?? [];
    if (exercise_index >= exercises.length) {
      return NextResponse.json(
        { error: "Invalid exercise index" },
        { status: 400 }
      );
    }

    const sectionExercises = exercises.map((ex) => ({
      name: ex.name,
      muscleTarget: ex.muscleTarget ?? "",
      muscle_groups: ex.muscle_groups ?? [],
      equipment_needed: ex.equipment_needed ?? [],
    }));

    const flowInput: CheckExerciseOrderInput = {
      sectionExercises,
      targetIndex: exercise_index,
      sectionType: section.type ?? "Main Workout",
    };

    const output = await checkExerciseOrderFlow(flowInput);

    const promptContent = JSON.stringify(flowInput);
    const outputContent = JSON.stringify(output);
    const estimatedTokens = estimateTokenUsage(promptContent, outputContent);
    const estimatedCost = estimateCostUsd(estimatedTokens);

    const usageLogRef = adminDb.collection("ai_usage_logs").doc();
    await usageLogRef.set({
      id: usageLogRef.id,
      user_id: uid,
      workout_id,
      section_index,
      exercise_index,
      edit_type: "ai_order_check",
      user_prompt: `Order check: ${exercises[exercise_index]?.name ?? "exercise"}`,
      ai_model: "googleai/gemini-2.0-flash",
      generation_tokens: estimatedTokens.totalTokens,
      generation_cost_usd: estimatedCost,
      genkit_trace_id: null,
      created_at: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      isSafe: output.isSafe,
      riskLevel: output.riskLevel,
      issues: output.issues,
      suggestedPosition: output.suggestedPosition,
      explanation: output.explanation,
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
      endpoint: "ai_exercise_order_check",
      operation: "check_exercise_order",
    });
    incrementMetric("ai.failure", 1, { endpoint: "ai_exercise_order_check" });
    logger.error("[AI Order Check] Error", error, {
      route: "/api/workouts/ai-exercise-order-check",
      operation: "check_exercise_order",
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errStr = JSON.stringify(error);
    const all = `${errorMessage} ${errStr}`.toLowerCase();

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
            "The AI service is temporarily busy. Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    if (
      errorMessage.includes("API key") ||
      errorMessage.includes("authentication")
    ) {
      return NextResponse.json(
        { error: "AI service configuration error" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to check exercise order",
        ...(process.env.NODE_ENV === "development" && {
          message: errorMessage,
        }),
      },
      { status: 500 }
    );
  }
}
