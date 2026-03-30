import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import {
  checkAIActionRateLimit,
  buildLimitReachedMessage,
} from "@/lib/ai-action-limiter";
import {
  intervalTimerFlow,
  getPresetIntervals,
  estimateTokenUsage,
  estimateCostUsd,
  buildSystemPrompt,
  buildUserPrompt,
  type IntervalIntensity,
} from "@/lib/genkit/flows/interval-timer";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import { assertReverseTrialAllowsAi } from "@/lib/reverse-trial/capabilities";
import type { AIIntervalTimerResponse } from "@/types/ai-exercise-editor";
import type { TrainerWorkout, FitnessLevel } from "@/types/firestore";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const IntervalTimerRequestSchema = z.object({
  exerciseName: z.string().min(1).max(200),
  exerciseData: z.object({
    sets: z.number().int().min(1).max(20),
    tempo: z.string().nullable().optional(),
    muscleTarget: z.string().min(1),
    duration: z.string().optional(),
    notes: z.string().optional(),
  }),
  userLevel: z.enum([
    "beginner",
    "intermediate",
    "advanced",
    "elite",
    "athlete",
  ]),
  intensityPreference: z
    .enum(["easy", "moderate", "intense", "custom"])
    .optional(),
  workoutId: z.string().min(1),
  usePreset: z.boolean().optional(), // If true, skip AI and use preset
});

// ============================================
// API Route Handler
// ============================================

/**
 * POST /api/workouts/ai-interval-timer
 *
 * Generates optimal interval timer recommendations based on exercise type
 * and user fitness level.
 *
 * Request body:
 * - exerciseName: string
 * - exerciseData: { sets, tempo, muscleTarget, duration, notes }
 * - userLevel: FitnessLevel
 * - intensityPreference: "easy" | "moderate" | "intense" | "custom"
 * - workoutId: string
 * - usePreset: boolean (optional, skip AI if true)
 *
 * Returns:
 * - 200: AIIntervalTimerResponse
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 403: Access denied (free tier limit)
 * - 429: Rate limit exceeded (paid tier)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // Verify authentication
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const userId = decodedToken.uid;

    const reverseTrialBlock = await assertReverseTrialAllowsAi(userId);
    if (reverseTrialBlock) return reverseTrialBlock;

    const apiRateLimit = await checkApiRateLimit(userId, "ai_interval_timer");
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

    // Parse and validate request body
    const body = await request.json();
    const validated = IntervalTimerRequestSchema.parse(body);

    // Validate workout exists and belongs to user
    const workoutDoc = await adminDb
      .collection("trainer_workouts")
      .doc(validated.workoutId)
      .get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = workoutDoc.data() as TrainerWorkout;
    if (workout.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If using preset with a specific intensity, skip AI and rate limiting
    if (
      validated.usePreset &&
      validated.intensityPreference &&
      validated.intensityPreference !== "custom"
    ) {
      const presetResult = getPresetIntervals(
        validated.intensityPreference as IntervalIntensity,
        validated.exerciseName,
        validated.exerciseData.notes
      );

      const response: AIIntervalTimerResponse = {
        workDuration: presetResult.workDuration,
        restDuration: presetResult.restDuration,
        setupDuration: 5,
        isBilateral: presetResult.isBilateral,
        switchIndicator: presetResult.switchIndicator,
        explanation: presetResult.explanation,
        intensityLevel: presetResult.intensityLevel,
        // No metadata or usage since no AI was used
      };

      return NextResponse.json(response);
    }

    // Check unified AI action rate limit
    const rateLimit = await checkAIActionRateLimit(
      userId,
      "ai_interval_timer",
      "/api/workouts/ai-interval-timer"
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "AI action limit reached",
          tier: rateLimit.tier,
          remaining: rateLimit.remaining,
          message: buildLimitReachedMessage(rateLimit.tier, "AI timer"),
        },
        { status: rateLimit.tier === "free" ? 403 : 429 }
      );
    }

    // Call AI flow for personalized recommendations
    logger.info("[Interval Timer] Generating AI recommendations", {
      route: "/api/workouts/ai-interval-timer",
      exerciseName: validated.exerciseName,
      userLevel: validated.userLevel,
      intensityPreference: validated.intensityPreference,
    });

    const flowInput = {
      exerciseName: validated.exerciseName,
      exerciseData: {
        sets: validated.exerciseData.sets,
        tempo: validated.exerciseData.tempo,
        muscleTarget: validated.exerciseData.muscleTarget,
        duration: validated.exerciseData.duration,
        notes: validated.exerciseData.notes,
      },
      userLevel: validated.userLevel as FitnessLevel,
      intensityPreference: validated.intensityPreference,
    };

    const aiOutput = await intervalTimerFlow(flowInput);

    // Estimate tokens and cost
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(flowInput);
    const promptContent = `${systemPrompt}\n\n${userPrompt}`;
    const outputContent = JSON.stringify(aiOutput);
    const estimatedTokens = estimateTokenUsage(promptContent, outputContent);
    const estimatedCost = estimateCostUsd(estimatedTokens);

    // Log usage
    const usageLogRef = adminDb.collection("ai_usage_logs").doc();
    await usageLogRef.set({
      id: usageLogRef.id,
      user_id: userId,
      workout_id: validated.workoutId,
      edit_type: "interval_timer",
      exercise_name: validated.exerciseName,
      user_level: validated.userLevel,
      // Only include intensity_preference if it's defined (Firestore doesn't accept undefined)
      ...(validated.intensityPreference && {
        intensity_preference: validated.intensityPreference,
      }),
      ai_model: "googleai/gemini-2.0-flash",
      generation_tokens: estimatedTokens.totalTokens,
      generation_cost_usd: estimatedCost,
      result: {
        work_duration: aiOutput.workDuration,
        rest_duration: aiOutput.restDuration,
        is_bilateral: aiOutput.isBilateral,
        intensity_level: aiOutput.intensityLevel,
      },
      created_at: Timestamp.now(),
    });

    // Format response
    const response: AIIntervalTimerResponse = {
      workDuration: aiOutput.workDuration,
      restDuration: aiOutput.restDuration,
      setupDuration: 5, // Default setup time
      isBilateral: aiOutput.isBilateral,
      switchIndicator: aiOutput.switchIndicator,
      explanation: aiOutput.explanation,
      intensityLevel: aiOutput.intensityLevel,
      metadata: {
        ai_model: "googleai/gemini-2.0-flash",
        generation_tokens: estimatedTokens.totalTokens,
        generation_cost_usd: estimatedCost,
      },
      usage: {
        remaining: rateLimit.remaining,
        tier: rateLimit.tier,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    captureApiError(error, {
      endpoint: "ai_interval_timer",
      operation: "ai_interval_timer",
    });
    incrementMetric("ai.failure", 1, { endpoint: "ai_interval_timer" });
    logger.error("[Interval Timer] Error", error, {
      route: "/api/workouts/ai-interval-timer",
      operation: "ai_interval_timer",
    });

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Handle authentication errors
    if (error && typeof error === "object" && "code" in error) {
      const firebaseError = error as { code: string; message: string };
      if (firebaseError.code === "auth/id-token-expired") {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }
      if (firebaseError.code === "auth/argument-error") {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    // Generic error
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
