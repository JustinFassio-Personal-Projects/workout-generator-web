import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb, verifyIdToken, getUserClaims } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import {
  checkAIActionRateLimit,
  buildLimitReachedMessage,
} from "@/lib/ai-action-limiter";
import {
  coachExplainFlow,
  estimateTokenUsage,
  estimateCostUsd,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/genkit/flows/coach-explain";
import {
  resolvePromptForTarget,
  resolvePromptSetForTrainer,
} from "@/lib/ai-prompts";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import type { CoachExplainResponse } from "@/types/ai-exercise-editor";
import type { TrainerWorkout } from "@/types/firestore";
import { normalizeTrainerData } from "@/lib/trainer-normalize";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const CoachExplainRequestSchema = z.object({
  exerciseName: z.string().min(1).max(200),
  userLevel: z.enum([
    "beginner",
    "intermediate",
    "advanced",
    "elite",
    "athlete",
  ]),
  workoutId: z.string().min(1),
  sectionIndex: z.number().int().min(0),
  exerciseIndex: z.number().int().min(0),
});

// ============================================
// API Route Handler
// ============================================

/**
 * POST /api/workouts/coach-explain
 *
 * Generates personalized exercise explanation based on biomechanical analysis
 * and user fitness level.
 *
 * Request body:
 * - exerciseName: string
 * - userLevel: "beginner" | "intermediate" | "advanced" | "elite" | "athlete"
 * - workoutId: string
 * - sectionIndex: number
 * - exerciseIndex: number
 *
 * Returns:
 * - 200: CoachExplainResponse
 * - 400: Invalid request
 * - 401: Unauthorized
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

    // Per-user rate limit
    const apiRateLimit = await checkApiRateLimit(userId, "coach_explain");
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

    // Get user claims (for future use)
    await getUserClaims(userId);

    // Parse and validate request body first (need workoutId for validation and rate limit check)
    const body = await request.json();
    const validated = CoachExplainRequestSchema.parse(body);

    // CRITICAL: Validate workout exists and belongs to user BEFORE checking rate limits.
    // This prevents consuming quota for invalid requests (Bug 2 fix).
    // If validation fails, we return early without incrementing counters.
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

    // Validate indices to ensure accurate logging
    if (
      validated.sectionIndex >= workout.sections.length ||
      validated.exerciseIndex >=
        workout.sections[validated.sectionIndex]?.exercises.length
    ) {
      return NextResponse.json(
        { error: "Invalid section or exercise index" },
        { status: 400 }
      );
    }

    // Check unified AI action rate limit
    const rateLimit = await checkAIActionRateLimit(
      userId,
      "coach_explain",
      "/api/workouts/coach-explain"
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "AI action limit reached",
          tier: rateLimit.tier,
          remaining: rateLimit.remaining,
          message: buildLimitReachedMessage(rateLimit.tier, "Coach Explain"),
        },
        { status: rateLimit.tier === "free" ? 403 : 429 }
      );
    }

    // Fetch biomechanical analysis from internal API
    const baseUrl = request.nextUrl.origin;
    const biomechanicalUrl = new URL(
      "/api/exercises/biomechanical-analysis",
      baseUrl
    );
    biomechanicalUrl.searchParams.set("exerciseName", validated.exerciseName);

    let biomechanicalPoints: string[] = [];
    let biomechanicalDataAvailable = false;
    try {
      const biomechanicalResponse = await fetch(biomechanicalUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Pass authentication token for internal API call
        },
      });

      if (biomechanicalResponse.ok) {
        const biomechanicalData = await biomechanicalResponse.json();
        biomechanicalPoints = biomechanicalData.biomechanicalPoints || [];
        biomechanicalDataAvailable = biomechanicalPoints.length > 0;

        if (!biomechanicalDataAvailable) {
          logger.info(
            "[Coach Explain] Biomechanical analysis fetched but no points available",
            {
              route: "/api/workouts/coach-explain",
              exerciseName: validated.exerciseName,
            }
          );
        }
      } else {
        logger.warn(
          "[Coach Explain] Failed to fetch biomechanical analysis",
          undefined,
          {
            route: "/api/workouts/coach-explain",
            exerciseName: validated.exerciseName,
            status: biomechanicalResponse.status,
          }
        );
        // Continue without biomechanical data - flow will handle it
      }
    } catch (error) {
      logger.error(
        "[Coach Explain] Error fetching biomechanical analysis",
        error,
        {
          route: "/api/workouts/coach-explain",
          operation: "fetch_biomechanical_analysis",
          exerciseName: validated.exerciseName,
        }
      );
      // Continue without biomechanical data - flow will handle it
    }

    // Call Genkit flow
    const flowInput = {
      exerciseName: validated.exerciseName,
      biomechanicalPoints,
      userLevel: validated.userLevel,
    };

    logger.info("[Coach Explain] Generating explanation", {
      route: "/api/workouts/coach-explain",
      exerciseName: validated.exerciseName,
      userLevel: validated.userLevel,
      biomechanicalPointsCount: biomechanicalPoints.length,
    });

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
      user_level: validated.userLevel,
      exercise_name: validated.exerciseName,
      workout_difficulty: workout.difficulty,
      user_fitness_level:
        workout.generation_context?.profile_snapshot?.fitness_level,
      user_injuries:
        workout.generation_context?.profile_snapshot?.injuries ?? [],
      available_equipment:
        workout.generation_context?.profile_snapshot?.available_equipment ?? [],
      equipment_access: Array.isArray(
        workout.generation_context?.profile_snapshot?.equipment_access
      )
        ? workout.generation_context.profile_snapshot.equipment_access
        : workout.generation_context?.profile_snapshot?.equipment_access
          ? [workout.generation_context.profile_snapshot.equipment_access]
          : [],
    };
    const resolvedPrompt = await resolvePromptForTarget({
      trainer,
      promptSet,
      target: "coach_explain",
      context: promptContext,
    });
    const promptOverrides = resolvedPrompt.prompt
      ? { systemPrompt: resolvedPrompt.prompt }
      : undefined;

    const output = await coachExplainFlow(flowInput, promptOverrides);

    // Estimate tokens and cost for tracking
    // Use the same prompt building functions to get accurate token counts
    const systemPrompt =
      resolvedPrompt.prompt ?? buildSystemPrompt(validated.userLevel);
    const userPrompt = buildUserPrompt(flowInput);
    const promptContent = `${systemPrompt}\n\n${userPrompt}`;
    const outputContent = JSON.stringify(output);
    const estimatedTokens = estimateTokenUsage(promptContent, outputContent);
    const estimatedCost = estimateCostUsd(estimatedTokens);

    // Log usage for admin repo (consistent with ai-exercise-edit)
    const usageLogRef = adminDb.collection("ai_usage_logs").doc();
    await usageLogRef.set({
      id: usageLogRef.id,
      user_id: userId,
      workout_id: validated.workoutId,
      section_index: validated.sectionIndex,
      exercise_index: validated.exerciseIndex,
      edit_type: "coach_explain",
      edit_mode: "coach_explain",
      user_prompt: `Coach Explain for ${validated.userLevel} level`,
      ai_model: "googleai/gemini-2.0-flash",
      generation_tokens: estimatedTokens,
      generation_cost_usd: estimatedCost,
      genkit_trace_id: null, // TODO: Extract from flow response if available
      biomechanical_data_available: biomechanicalDataAvailable, // Track data availability for analytics
      ...(resolvedPrompt.metadata && {
        prompt_metadata: {
          ...resolvedPrompt.metadata,
          resolved_at: new Date(),
        },
      }),
      created_at: Timestamp.now(),
    });

    // Format response
    const response: CoachExplainResponse = {
      exerciseGuide: output.exerciseGuide,
      anatomyBreakdown: output.anatomyBreakdown,
      theWhy: output.theWhy,
      detailedInstructions: output.detailedInstructions,
      metadata: {
        ai_model: "googleai/gemini-2.0-flash",
        generation_tokens: estimatedTokens.totalTokens,
        generation_cost_usd: estimatedCost,
        genkit_trace_id: null,
        biomechanical_data_available: biomechanicalDataAvailable,
      },
    };

    return NextResponse.json({
      ...response,
      usage: {
        remaining: rateLimit.remaining,
        tier: rateLimit.tier,
      },
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "coach_explain",
      operation: "coach_explain",
    });
    incrementMetric("ai.failure", 1, { endpoint: "coach_explain" });
    logger.error("[Coach Explain] Error", error, {
      route: "/api/workouts/coach-explain",
      operation: "coach_explain",
    });

    const errorString = error instanceof Error ? error.message : String(error);
    const errorObj = error && typeof error === "object" ? error : {};
    const allErrorText = JSON.stringify(errorObj).toLowerCase();

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

    // Check for Gemini API rate limit errors (similar to generate route)
    const has429Status =
      (error &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status?: number }).status === 429) ||
      (error &&
        typeof error === "object" &&
        "statusCode" in error &&
        (error as { statusCode?: number }).statusCode === 429);

    const isRateLimitError =
      has429Status ||
      allErrorText.includes("status code 429") ||
      allErrorText.includes("http 429") ||
      allErrorText.includes("rate limit exceeded") ||
      allErrorText.includes("resource exhausted") ||
      (allErrorText.includes("quota") && allErrorText.includes("429"));

    if (isRateLimitError) {
      const isLikelyRpmLimit =
        errorString.includes("Resource exhausted") ||
        errorString.includes("rate limit") ||
        allErrorText.includes("rpm") ||
        allErrorText.includes("tpm");

      const userMessage = isLikelyRpmLimit
        ? "The AI service is temporarily rate-limited (too many requests too quickly). Please wait 1-2 minutes and try again."
        : "AI service rate limit exceeded. Please try again later.";

      return NextResponse.json(
        {
          error: "AI service rate limit exceeded",
          message: userMessage,
        },
        { status: 429 }
      );
    }

    // Generic error
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
