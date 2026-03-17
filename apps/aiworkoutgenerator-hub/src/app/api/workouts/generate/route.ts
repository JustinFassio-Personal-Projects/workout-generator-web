import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { getActiveWaiver } from "@/lib/waiver/getActiveWaiver";
import { extractBearerToken, getUserTier } from "@/lib/api-utils";
import { getWorkoutLimit, type SubscriptionTier } from "@/lib/stripe";
import { WORKOUT_LIMITS } from "@/lib/subscription-constants";
import {
  generateWorkoutFlow,
  transformToFirestoreFormat,
  GenerateWorkoutInputSchema,
  estimateTokenUsage,
  estimateCostUsd,
} from "@/lib/genkit/flows/generate-workout";
import { computeTrainerWorkoutQA } from "@/lib/quality/computeTrainerWorkoutQA";
import {
  resolvePromptForTarget,
  resolvePromptSetForTrainer,
} from "@/lib/ai-prompts";
import { normalizeTrainerData } from "@/lib/trainer-normalize";
import { TRAINERS, type TrainerSeedData } from "@/types/trainer";
import type { OverloadProtocol } from "@/types/overloadProtocol";
import type { WorkoutSummary } from "@/types/workoutSummary";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";
import type {
  UserProfile,
  UserDailyState,
  TrainerWorkout,
  TrainerWorkoutGenerationContext,
  UserWaiverAgreement,
  IterationMetadata,
} from "@/types/firestore";
import { randomUUID } from "node:crypto";

// ============================================
// Request Schema
// ============================================

const RequestBodySchema = z
  .object({
    trainerId: z.string().min(1), // Required: AI trainer persona ID
    focus: z.string().nullable(), // Specific focus name or null for blend mode
    duration_minutes: z.number().min(10).max(120),
    equipment_access: z.array(z.string()).optional(), // Changed from enum to string[] categories
    available_equipment: z.array(z.string()).optional(),
    user_notes: z.string().max(500).optional(),
    model: z.string().optional(), // Optional AI model selection

    // Iteration fields (optional - for iterate mode; both required when either is set)
    iteration_source_summary_id: z.string().optional(),
    overload_protocol: z
      .enum(["linear_load", "double_progression", "density_leverage"])
      .optional(),
  })
  .refine(
    (data) => {
      const hasSummary =
        data.iteration_source_summary_id != null &&
        data.iteration_source_summary_id.trim() !== "";
      const hasProtocol = data.overload_protocol != null;
      return hasSummary === hasProtocol;
    },
    {
      message:
        "iteration_source_summary_id and overload_protocol must be provided together for iteration mode, or both omitted for a new workout",
      path: ["iteration_source_summary_id"],
    }
  );

// ============================================
// Helper Functions
// ============================================

/**
 * Get ISO date string for today (UTC).
 */
function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Map fitness level to workout difficulty.
 */
function mapDifficulty(
  fitnessLevel?: string
): "beginner" | "intermediate" | "advanced" {
  if (fitnessLevel === "advanced" || fitnessLevel === "athlete") {
    return "advanced";
  }
  if (fitnessLevel === "intermediate") {
    return "intermediate";
  }
  return "beginner";
}

/**
 * Get trainer from Firestore or fall back to static data.
 */
async function getTrainer(trainerId: string): Promise<TrainerSeedData | null> {
  try {
    const trainerDoc = await adminDb
      .collection("trainers")
      .doc(trainerId)
      .get();
    if (trainerDoc.exists) {
      const normalized = normalizeTrainerData(
        trainerDoc.data() as Record<string, unknown>,
        trainerDoc.id
      );
      const {
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...seed
      } = normalized;
      return seed as TrainerSeedData;
    }
  } catch (error) {
    logger.warn("Failed to fetch trainer from Firestore", error, {
      route: "/api/workouts/generate",
      operation: "fetch_trainer",
      trainerId,
    });
  }

  // Fall back to static data
  return TRAINERS.find((t) => t.id === trainerId) ?? null;
}

/**
 * Count workouts for a user, tier-aware.
 * - free: lifetime count (no date filter)
 * - basic/pro/elite/coach/coach_pro: monthly count (start of current month)
 */
async function getWorkoutCount(
  uid: string,
  tier: SubscriptionTier
): Promise<number> {
  let query = adminDb
    .collection("trainer_workouts")
    .where("user_id", "==", uid);

  // Basic, Pro, Elite, Coach, and Coach Pro tiers: apply monthly window
  if (
    tier === "basic" ||
    tier === "pro" ||
    tier === "elite" ||
    tier === "coach" ||
    tier === "coach_pro"
  ) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.where("created_at", ">=", Timestamp.fromDate(startOfMonth));
  }
  // Free tier uses lifetime (no additional filter)

  const snapshot = await query.count().get();
  return snapshot.data().count;
}

/**
 * Check if user can generate a workout based on their subscription tier.
 */
async function checkRateLimit(uid: string): Promise<{
  allowed: boolean;
  tier: SubscriptionTier;
  remaining: number | null;
}> {
  const tier = await getUserTier(uid);
  const limit = getWorkoutLimit(tier);

  // All tiers now have limits (free tier has lifetime limit)
  if (limit === null) {
    // This should not happen with current tier structure, but handle gracefully
    return { allowed: true, tier, remaining: null };
  }

  const count = await getWorkoutCount(uid, tier);
  const remaining = Math.max(0, limit - count);

  return {
    allowed: count < limit,
    tier,
    remaining,
  };
}

/**
 * Map focus ID to a more generic focus type for the AI.
 * Falls back to the primary focus's general category.
 */
function mapFocusToGenericType(
  focusName: string | null,
  trainer: TrainerSeedData
): "strength" | "cardio" | "hiit" | "flexibility" | "yoga" {
  // If no specific focus, use the trainer's primary focus
  const focus =
    focusName ?? trainer.focuses.find((f) => f.isPrimary)?.name ?? "strength";
  const focusLower = focus.toLowerCase();

  // Map to generic types that the AI understands
  if (
    focusLower.includes("strength") ||
    focusLower.includes("powerlifting") ||
    focusLower.includes("bodyweight") ||
    focusLower.includes("calisthenics")
  ) {
    return "strength";
  }
  if (
    focusLower.includes("cardio") ||
    focusLower.includes("circuit") ||
    focusLower.includes("sports")
  ) {
    return "cardio";
  }
  if (
    focusLower.includes("hiit") ||
    focusLower.includes("crossfit") ||
    focusLower.includes("high-intensity")
  ) {
    return "hiit";
  }
  if (
    focusLower.includes("yoga") ||
    focusLower.includes("meditation") ||
    focusLower.includes("breathwork")
  ) {
    return "yoga";
  }
  if (
    focusLower.includes("flex") ||
    focusLower.includes("mobility") ||
    focusLower.includes("pilates") ||
    focusLower.includes("stretch") ||
    focusLower.includes("recovery")
  ) {
    return "flexibility";
  }

  // Default based on trainer's primary expertise
  const primaryFocus =
    trainer.focuses.find((f) => f.isPrimary)?.id ?? "strength_training";
  if (primaryFocus.includes("cardio") || primaryFocus.includes("hiit"))
    return "cardio";
  if (primaryFocus.includes("yoga")) return "yoga";
  if (primaryFocus.includes("pilates") || primaryFocus.includes("flexibility"))
    return "flexibility";

  return "strength";
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  const requestStartTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  logger.debug("API request started", {
    location: "route.ts",
    requestId,
  });
  let uid: string | undefined;
  try {
    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
      logger.debug("User authenticated", {
        location: "route.ts",
        requestId,
        timeSinceRequestStart: Date.now() - requestStartTime,
        apiKeyConfigured: !!process.env.GOOGLE_AI_API_KEY,
      });
    } catch (error) {
      logger.error("Token verification failed", error, {
        route: "/api/workouts/generate",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Per-user rate limit (workout generation)
    const apiRateLimit = await checkApiRateLimit(uid!, "workout_generation", {
      requestId,
    });
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

    // 3. Check waiver agreement (MANDATORY - must be completed before workout generation)
    const activeWaiver = await getActiveWaiver();

    // MANDATORY: An active waiver must exist for the system to operate
    // If no active waiver exists, this is a configuration error
    if (!activeWaiver) {
      logger.error(
        "[WAIVER CHECK FAILED] No active waiver found in database. This is a configuration error.",
        undefined,
        {
          route: "/api/workouts/generate",
          operation: "waiver_check",
        }
      );
      return NextResponse.json(
        {
          error: "System configuration error",
          message:
            "No active liability waiver is configured. Please contact support. Workout generation is temporarily unavailable.",
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
        "[WAIVER CHECK FAILED] User attempted to generate workout without agreeing to waiver",
        undefined,
        {
          route: "/api/workouts/generate",
          operation: "waiver_check",
          userId: uid,
          waiverVersion,
          agreementCount: agreementSnapshot.size,
        }
      );
      return NextResponse.json(
        {
          error: "Waiver agreement required",
          message:
            "You must agree to the liability waiver before generating a workout. Please complete the waiver agreement and try again.",
          waiver_required: true,
          waiver_version: waiverVersion,
        },
        { status: 403 }
      );
    }

    const agreementDoc = agreementSnapshot.docs[0].data();
    const agreementData = agreementDoc as UserWaiverAgreement;

    // Validate agreement has all required checkbox fields and they are all checked
    // Defense-in-depth: Even though client-side creation is blocked, validate data integrity
    if (
      !agreementData.agreement_checkboxes ||
      !agreementData.agreement_checkboxes.medical_disclaimer ||
      !agreementData.agreement_checkboxes.assumption_of_risk ||
      !agreementData.agreement_checkboxes.release_of_liability ||
      !agreementData.agreement_checkboxes.arbitration ||
      !agreementData.agreement_checkboxes.ai_disclaimer ||
      !agreementData.agreement_checkboxes.full_terms
    ) {
      logger.error(
        "[WAIVER CHECK FAILED] User has invalid agreement document - missing or unchecked checkboxes",
        undefined,
        {
          route: "/api/workouts/generate",
          operation: "waiver_check",
          userId: uid,
        }
      );
      return NextResponse.json(
        {
          error: "Invalid waiver agreement",
          message:
            "Your waiver agreement is invalid or incomplete. Please agree to the waiver again.",
          waiver_required: true,
          waiver_version: waiverVersion,
        },
        { status: 403 }
      );
    }

    logger.info("[WAIVER CHECK PASSED] User has agreed to waiver", {
      route: "/api/workouts/generate",
      userId: uid,
      agreement_id: agreementSnapshot.docs[0].id,
      waiver_version: waiverVersion,
      created_at: agreementData.created_at?.toDate?.()?.toISOString(),
    });

    // 3. Check rate limit based on subscription tier
    const rateLimit = await checkRateLimit(uid);
    logger.debug("Rate limit check completed", {
      location: "route.ts",
      requestId,
      rateLimitAllowed: rateLimit.allowed,
      rateLimitTier: rateLimit.tier,
      rateLimitRemaining: rateLimit.remaining,
    });

    if (!rateLimit.allowed) {
      let tierMessage: string;
      switch (rateLimit.tier) {
        case "free":
          tierMessage = `You've used all ${WORKOUT_LIMITS.free} free workouts (lifetime limit). Upgrade to Basic for ${WORKOUT_LIMITS.basic} workouts/month.`;
          break;
        case "basic":
          tierMessage = `You've reached your monthly limit of ${WORKOUT_LIMITS.basic} workouts. Upgrade to Pro for ${WORKOUT_LIMITS.pro} workouts/month.`;
          break;
        default:
          tierMessage = `You've reached your monthly limit of ${WORKOUT_LIMITS.pro} workouts. Upgrade to Elite for ${WORKOUT_LIMITS.elite} workouts/month.`;
      }

      return NextResponse.json(
        {
          error: "Workout limit reached",
          tier: rateLimit.tier,
          remaining: rateLimit.remaining,
          message: tierMessage,
        },
        { status: 429 }
      );
    }

    // 4. Parse and validate request body
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

    const input = parseResult.data;

    // 5. Fetch trainer
    const trainer = await getTrainer(input.trainerId);
    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    // 5.5. Handle iteration mode - fetch source workout summary if provided
    let iterationContext: {
      previous_workout: {
        title: string;
        focus: string | null;
        difficulty: "beginner" | "intermediate" | "advanced";
        trainer_name: string | null;
        sections: WorkoutSummary["sections"];
        session_rpe: number | null;
        weight_selection: "too_light" | "perfect" | "too_heavy" | null;
        completion_percentage: number | null;
        session_feedback: string[];
      };
      overload_protocol: OverloadProtocol;
    } | null = null;

    /** Lineage metadata for iteration chains (Day N); set when iterationContext is set. */
    let iterationMetadata: IterationMetadata | null = null;

    if (input.iteration_source_summary_id && input.overload_protocol) {
      try {
        // Fetch the source workout summary
        const summaryDoc = await adminDb
          .collection("workout_summaries")
          .doc(input.iteration_source_summary_id)
          .get();

        if (!summaryDoc.exists) {
          return NextResponse.json(
            { error: "Source workout summary not found" },
            { status: 404 }
          );
        }

        const summaryData = summaryDoc.data() as WorkoutSummary;

        // Verify the summary belongs to this user
        if (summaryData.user_id !== uid) {
          return NextResponse.json(
            { error: "Unauthorized to iterate from this workout" },
            { status: 403 }
          );
        }

        // Build iteration context
        iterationContext = {
          previous_workout: {
            title: summaryData.title,
            focus: summaryData.focus,
            difficulty: summaryData.difficulty,
            trainer_name: summaryData.trainer_name,
            sections: summaryData.sections,
            session_rpe: summaryData.session_rpe ?? null,
            weight_selection: summaryData.weight_selection ?? null,
            completion_percentage:
              summaryData.stats.completionPercentage ?? null,
            session_feedback: summaryData.session_feedback ?? [],
          },
          overload_protocol: input.overload_protocol,
        };

        // Resolve lineage: fetch the workout that produced this summary to continue or start chain
        const sourceWorkoutId = summaryData.workout_id;
        const sourceWorkoutDoc = await adminDb
          .collection("trainer_workouts")
          .doc(sourceWorkoutId)
          .get();

        const sourceWorkoutData = sourceWorkoutDoc.exists
          ? (sourceWorkoutDoc.data() as TrainerWorkout)
          : null;
        const existingLineage = sourceWorkoutData?.iteration_metadata;

        if (existingLineage) {
          iterationMetadata = {
            iteration_number: existingLineage.iteration_number + 1,
            source_summary_id: input.iteration_source_summary_id,
            protocol_used: input.overload_protocol,
            lineage_id: existingLineage.lineage_id,
            lineage_started_at: existingLineage.lineage_started_at,
          } as IterationMetadata;
        } else {
          iterationMetadata = {
            iteration_number: 1,
            source_summary_id: input.iteration_source_summary_id,
            protocol_used: input.overload_protocol,
            lineage_id: randomUUID(),
            lineage_started_at: Timestamp.now(),
          } as unknown as IterationMetadata;
        }

        // iterationMetadata is always set here (either existingLineage or else branch)
        logger.info("[ITERATION] Building workout iteration", {
          route: "/api/workouts/generate",
          userId: uid,
          sourceSummaryId: input.iteration_source_summary_id,
          protocol: input.overload_protocol,
          previousWorkoutTitle: summaryData.title,
          previousRpe: summaryData.session_rpe,
          previousWeightSelection: summaryData.weight_selection,
          iterationNumber: iterationMetadata!.iteration_number,
          lineageId: iterationMetadata!.lineage_id,
        });
      } catch (error) {
        logger.error("Failed to fetch iteration source", error, {
          route: "/api/workouts/generate",
          operation: "fetch_iteration_source",
          summaryId: input.iteration_source_summary_id,
        });
        return NextResponse.json(
          { error: "Failed to fetch iteration source workout" },
          { status: 500 }
        );
      }
    }

    // 6. Fetch user profile and daily state
    const today = getTodayISO();
    const dailyStateId = `${uid}_${today}`;

    const [profileDoc, dailyStateDoc] = await Promise.all([
      adminDb.collection("user_profiles").doc(uid).get(),
      adminDb.collection("user_daily_state").doc(dailyStateId).get(),
    ]);

    const profile = profileDoc.exists
      ? (profileDoc.data() as UserProfile)
      : null;
    const dailyState = dailyStateDoc.exists
      ? (dailyStateDoc.data() as UserDailyState)
      : null;

    // 7. Resolve equipment (use override if provided, else use profile)
    const equipmentAccess =
      input.equipment_access ??
      (Array.isArray(profile?.equipment_access)
        ? profile.equipment_access
        : []);
    const availableEquipment =
      input.available_equipment ?? profile?.available_equipment ?? [];

    // Determine if equipment was overridden
    // Note: Use spread syntax to avoid mutating original arrays with sort()
    const equipmentOverride =
      (input.equipment_access !== undefined &&
        JSON.stringify([...input.equipment_access].sort()) !==
          JSON.stringify(
            [
              ...(Array.isArray(profile?.equipment_access)
                ? profile.equipment_access
                : []),
            ].sort()
          )) ||
      (input.available_equipment !== undefined &&
        JSON.stringify([...input.available_equipment].sort()) !==
          JSON.stringify([...(profile?.available_equipment ?? [])].sort()));

    // 8. Map focus to generic type for AI schema
    const genericFocusType = mapFocusToGenericType(input.focus, trainer);

    // 9. Prepare flow input with trainer context
    const flowInput = GenerateWorkoutInputSchema.parse({
      focus: genericFocusType,
      duration_minutes: input.duration_minutes,
      difficulty: mapDifficulty(profile?.fitness_level),
      equipment_access: equipmentAccess,
      available_equipment: availableEquipment,
      injuries: profile?.injuries ?? [],
      fitness_goals: profile?.fitness_goals ?? [],
      gender: profile?.gender,
      energy_level: dailyState?.energy_level,
      sleep_quality: dailyState?.sleep_quality,
      stress_level: dailyState?.stress_level,
      soreness_areas: dailyState?.soreness_areas,
      muscle_group_focus: dailyState?.muscle_group_focus,
      user_notes: input.user_notes,
      // Trainer context for persona-driven generation
      trainer_name: trainer.name,
      trainer_nickname: trainer.nickname,
      trainer_philosophy: trainer.philosophy,
      trainer_personality: trainer.personality,
      trainer_focuses: trainer.focuses.map((f) => f.name),
      specific_focus: input.focus, // The actual selected focus (or null for blend)
      // Model selection
      model: input.model, // Pass through model selection
      // Iteration context (optional - for iterate mode)
      ...(iterationContext && {
        iteration_context: {
          previous_workout: iterationContext.previous_workout,
          overload_protocol: iterationContext.overload_protocol,
        },
      }),
    });

    // 10. Resolve prompt overrides for workout generation (admin-managed)
    const promptSet = await resolvePromptSetForTrainer(trainer);
    const promptContext = {
      trainer_name: trainer.name,
      trainer_nickname: trainer.nickname,
      trainer_philosophy: trainer.philosophy,
      trainer_personality: trainer.personality,
      trainer_focuses: trainer.focuses.map((f) => f.name),
      focus: input.focus,
      specific_focus: input.focus,
      available_equipment: availableEquipment,
      equipment_access: equipmentAccess,
      fitness_level: profile?.fitness_level,
      user_fitness_level: profile?.fitness_level, // Used in edit/swap flows and template fallback
      injuries: profile?.injuries ?? [],
      user_injuries: profile?.injuries ?? [], // Used in admin templates ({{user_injuries}}) and edit/swap flows
      gender: profile?.gender,
      workout_difficulty: flowInput.difficulty,
      duration_minutes: input.duration_minutes,
    };
    const resolvedPrompt = await resolvePromptForTarget({
      trainer,
      promptSet,
      target: "workout_generation",
      context: promptContext,
    });
    const promptOverrides = resolvedPrompt.prompt
      ? { systemPrompt: resolvedPrompt.prompt }
      : undefined;

    // 11. Generate workout using AI (capture timing for QA)
    const generationStartedAt = Timestamp.now();
    const generationStartMs = Date.now();
    logger.debug("Before generateWorkoutFlow call", {
      location: "route.ts",
      requestId,
      model: input.model || "default",
      timeSinceRequestStart: Date.now() - requestStartTime,
    });
    const generatedWorkout = await generateWorkoutFlow(
      flowInput,
      promptOverrides
    );
    const generationCompletedAt = Timestamp.now();
    const generationDurationMs = Date.now() - generationStartMs;

    // 12. Transform to Firestore format
    const transformedWorkout = transformToFirestoreFormat(generatedWorkout);

    // Debug: Log the generated workout structure
    const totalExercises = transformedWorkout.sections.reduce(
      (sum, section) => sum + section.exercises.length,
      0
    );
    logger.info("Generated workout", {
      route: "/api/workouts/generate",
      workoutTitle: transformedWorkout.title,
      trainer: trainer.name,
      focus: input.focus ?? "Blend mode",
      sectionCount: transformedWorkout.sections.length,
      totalExercises,
    });

    // 13. Estimate token usage and cost
    const promptContent = JSON.stringify(flowInput);
    const outputContent = JSON.stringify(generatedWorkout);
    const estimatedTokens = estimateTokenUsage(promptContent, outputContent);
    const estimatedCost = estimateCostUsd(estimatedTokens);

    // 14. Build generation context
    const generationContext: TrainerWorkoutGenerationContext = {
      profile_snapshot: {
        fitness_level: profile?.fitness_level ?? "beginner",
        injuries: profile?.injuries ?? [],
        equipment_access: equipmentAccess,
        available_equipment: availableEquipment,
      },
      daily_state_snapshot: dailyState
        ? {
            energy_level: dailyState.energy_level,
            sleep_quality: dailyState.sleep_quality,
            stress_level: dailyState.stress_level,
            soreness_areas: dailyState.soreness_areas ?? [],
            muscle_group_focus: dailyState.muscle_group_focus ?? [],
          }
        : null,
      used_profile_data: !!profile,
      used_daily_state: !!dailyState,
      equipment_override: equipmentOverride,
    };

    // 15. Compute Quality Assurance
    const qaComputedAt = Timestamp.now();
    const qualityAssurance = computeTrainerWorkoutQA(
      {
        title: transformedWorkout.title,
        description: transformedWorkout.description,
        focus: input.focus,
        difficulty: transformedWorkout.difficulty,
        duration_minutes: input.duration_minutes,
        totalDuration: transformedWorkout.totalDuration,
        sections: transformedWorkout.sections,
        generation_context: generationContext,
        user_equipment: availableEquipment,
        has_images: false,
        generation_started_at: generationStartedAt,
        generation_completed_at: generationCompletedAt,
        generation_duration_ms: generationDurationMs,
      },
      qaComputedAt
    );

    // 16. Create workout document
    const workoutRef = adminDb.collection("trainer_workouts").doc();

    // Log QA results for observability
    logger.info("[QA] Workout computed", {
      route: "/api/workouts/generate",
      workoutId: workoutRef.id,
      overallScore: qualityAssurance.overall_score,
      criticalAlerts: qualityAssurance.alerts.critical_count,
      warningAlerts: qualityAssurance.alerts.warning_count,
      infoAlerts: qualityAssurance.alerts.info_count,
      generationDurationMs,
    });
    const now = FieldValue.serverTimestamp();

    const workoutData: Omit<TrainerWorkout, "created_at" | "updated_at"> & {
      created_at: FieldValue;
      updated_at: FieldValue;
    } = {
      id: workoutRef.id,
      user_id: uid,

      // Trainer context
      trainerId: trainer.id,
      trainerName: trainer.name,

      // Basic metadata
      title: transformedWorkout.title,
      description: transformedWorkout.description,
      focus: input.focus, // Specific focus or null for blend
      duration_minutes: input.duration_minutes,
      difficulty: transformedWorkout.difficulty,

      // Enhanced fields
      trainerNotes: transformedWorkout.trainerNotes,
      totalDuration: transformedWorkout.totalDuration,
      estimatedCalories: transformedWorkout.estimatedCalories,

      // Sections (replaces flat exercises)
      sections: transformedWorkout.sections,

      // Personalization insights
      personalization: transformedWorkout.personalization,

      // Generation context
      generation_context: generationContext,

      // AI metadata
      generated_by: "genkit",
      genkit_trace_id: null,
      // Extract model name from "googleai/gemini-2.0-flash" format to "gemini-2.0-flash"
      ai_model: input.model
        ? input.model.replace(/^googleai\//, "")
        : "gemini-2.0-flash",
      generation_tokens: estimatedTokens,
      generation_cost_usd: estimatedCost,
      ...(resolvedPrompt.metadata && {
        prompt_metadata: {
          ...resolvedPrompt.metadata,
          resolved_at: new Date(),
        },
      }),

      // Workout status
      completed: false,
      completed_at: null,
      scheduled_for: null,

      // User feedback
      difficulty_rating: null,
      enjoyment_rating: null,
      completion_percentage: null,
      user_notes: null,
      session_rpe: null,
      weight_selection: null,
      session_feedback: [],
      joint_pain_location: null,

      // Quality Assurance
      quality_assurance: qualityAssurance,

      // Public sharing (explicitly set to private on creation)
      visibility: "private",

      // Iteration metadata (if iterating from previous workout)
      ...(iterationContext && {
        iteration_source_summary_id: input.iteration_source_summary_id,
        iteration_overload_protocol: input.overload_protocol,
      }),
      ...(iterationMetadata && {
        iteration_metadata: iterationMetadata as unknown as IterationMetadata,
      }),

      created_at: now,
      updated_at: now,
    };

    await workoutRef.set(workoutData);

    // 17. Increment trainer workout count (non-blocking)
    adminDb
      .collection("trainers")
      .doc(trainer.id)
      .update({
        "stats.workoutsGenerated": FieldValue.increment(1),
        updatedAt: now,
      })
      .catch((err) =>
        logger.warn("Failed to increment trainer stats", err, {
          route: "/api/workouts/generate",
          operation: "increment_trainer_stats",
          trainerId: trainer.id,
        })
      );

    // 18. Log usage metadata for admin auditing (non-blocking)
    if (resolvedPrompt.metadata) {
      const usageLogRef = adminDb.collection("ai_usage_logs").doc();
      usageLogRef
        .set({
          id: usageLogRef.id,
          user_id: uid,
          workout_id: workoutRef.id,
          edit_type: "workout_generation",
          edit_mode: "generate_workout",
          user_prompt: input.focus ?? "blend",
          ai_model: input.model
            ? input.model.replace(/^googleai\//, "")
            : "gemini-2.0-flash",
          generation_tokens: estimatedTokens,
          generation_cost_usd: estimatedCost,
          genkit_trace_id: null,
          prompt_metadata: {
            ...resolvedPrompt.metadata,
            resolved_at: new Date(),
          },
          created_at: Timestamp.now(),
        })
        .catch((err) =>
          logger.warn("Failed to write workout generation usage log", err, {
            route: "/api/workouts/generate",
            operation: "write_usage_log",
          })
        );
    }

    // 19. Return success response
    const totalRequestDuration = Date.now() - requestStartTime;
    logger.debug("Request success", {
      location: "route.ts",
      requestId,
      totalRequestDurationMs: totalRequestDuration,
      workoutId: workoutRef.id,
    });
    incrementMetric("workout.generated", 1, { tier: rateLimit.tier });
    return NextResponse.json({
      workoutId: workoutRef.id,
      title: transformedWorkout.title,
      trainerId: trainer.id,
      trainerName: trainer.name,
      sectionCount: transformedWorkout.sections.length,
      exerciseCount: totalExercises,
    });
  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    logger.debug("Error caught in API route", {
      location: "route.ts",
      requestId,
      errorDuration,
      errorType: error?.constructor?.name,
      hasStatus: !!(error && typeof error === "object" && "status" in error),
    });

    // Capture error in Sentry with context for alerting and debugging
    captureApiError(error, {
      endpoint: "workout_generation",
      operation: "generate_workout",
      userId: uid,
      requestId,
      extra: {
        errorDuration,
        errorType: error?.constructor?.name,
      },
    });
    incrementMetric("ai.failure", 1, { endpoint: "workout_generation" });

    // Log error details for debugging (logger.error handles production sanitization)
    logger.error("Workout generation error", error, { requestId });

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
    // Only match specific rate limit patterns to avoid false positives
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = JSON.stringify(error);
    const allErrorText = `${errorMessage} ${errorString}`.toLowerCase();

    // Check for 429 status in error object (most reliable indicator)
    const has429Status =
      (error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 429) ||
      (error &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode === 429);

    // More specific rate limit detection - only match actual rate limit errors
    // Check for explicit rate limit patterns, not just any mention of "quota"
    const isRateLimitError =
      has429Status ||
      allErrorText.includes("status code 429") ||
      allErrorText.includes("http 429") ||
      allErrorText.includes("rate limit exceeded") ||
      allErrorText.includes("quota exceeded") ||
      allErrorText.includes("quota limit") ||
      allErrorText.includes("too many requests") ||
      (allErrorText.includes("quota") &&
        (allErrorText.includes("exceeded") ||
          allErrorText.includes("limit") ||
          allErrorText.includes("429")));

    if (isRateLimitError) {
      // Extract more details from the error object
      const errorDetails: Record<string, unknown> = {};
      if (error && typeof error === "object") {
        // Try to extract any additional error information
        Object.keys(error).forEach((key) => {
          if (key !== "stack" && key !== "message") {
            errorDetails[key] = (error as Record<string, unknown>)[key];
          }
        });
      }

      // Log the actual error for debugging with full context
      logger.error("Rate limit error detected", error, {
        requestId,
        has429Status,
        errorDetailsKeys: Object.keys(errorDetails),
      });
      // Determine if this is likely a per-minute rate limit vs daily quota
      // "Resource exhausted" often means RPM (requests per minute) or TPM (tokens per minute)
      const isLikelyRpmLimit =
        errorMessage.includes("Resource exhausted") ||
        errorMessage.includes("rate limit") ||
        !errorMessage.includes("quota");

      logger.debug("Rate limit error details", {
        location: "route.ts",
        requestId,
        errorMessage: errorMessage.substring(0, 200),
        has429Status,
        isLikelyRpmLimit,
        totalRequestDuration: Date.now() - requestStartTime,
      });

      const userMessage = isLikelyRpmLimit
        ? "The AI service is temporarily rate-limited (too many requests too quickly). Please wait 1-2 minutes and try again."
        : "The AI service quota has been exceeded. Please check your Google AI Studio dashboard for quota limits.";

      const detailsMessage = isLikelyRpmLimit
        ? "This is usually a per-minute rate limit (RPM) or token-per-minute (TPM) limit, not your daily quota. Check 'Requests per minute' in Google AI Studio."
        : "Check your daily quota, requests per day (RPD), and billing status in Google AI Studio or Google Cloud Console.";

      return NextResponse.json(
        {
          error: "AI service rate limit exceeded",
          message: userMessage,
          details: detailsMessage,
          // Include error details in development for debugging
          ...(process.env.NODE_ENV === "development" && {
            debug: {
              errorMessage,
              errorDetails,
            },
          }),
        },
        { status: 429 }
      );
    }

    // Check for API key issues
    if (
      errorMessage.includes("API key") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("401")
    ) {
      return NextResponse.json(
        {
          error: "AI service configuration error",
          message:
            "The AI service is not properly configured. Please contact support if this issue persists.",
          actionable:
            "This is a system configuration issue. Please try again later or contact support.",
        },
        { status: 503 }
      );
    }

    // Check for model-specific errors (model not found, unavailable, etc.)
    if (
      errorMessage.includes("model") &&
      (errorMessage.includes("not found") ||
        errorMessage.includes("unavailable") ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("404"))
    ) {
      return NextResponse.json(
        {
          error: "AI model unavailable",
          message:
            "The selected AI model is currently unavailable. Please try selecting a different model from the dropdown.",
          actionable:
            "Go back and select a different model (try 'Gemini 1.5 Flash' or 'Gemini 2.5 Flash' as alternatives).",
          retryable: true,
        },
        { status: 503 }
      );
    }

    // Check for quota/billing errors (different from rate limits)
    if (
      errorMessage.includes("quota") ||
      errorMessage.includes("billing") ||
      errorMessage.includes("payment") ||
      errorMessage.includes("exceeded")
    ) {
      return NextResponse.json(
        {
          error: "AI service quota exceeded",
          message:
            "The AI service quota has been exceeded. This may be a temporary issue or a billing configuration problem.",
          actionable:
            "Please wait a few minutes and try again. If the issue persists, try selecting a different model from the dropdown.",
          retryable: true,
        },
        { status: 503 }
      );
    }

    // Check for network/timeout errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ENOTFOUND")
    ) {
      return NextResponse.json(
        {
          error: "Network error",
          message:
            "Unable to connect to the AI service. This may be a temporary network issue.",
          actionable:
            "Please check your internet connection and try again in a few moments.",
          retryable: true,
        },
        { status: 503 }
      );
    }

    // Check for invalid output/parsing errors
    if (
      errorMessage.includes("invalid") &&
      (errorMessage.includes("output") ||
        errorMessage.includes("schema") ||
        errorMessage.includes("parse") ||
        errorMessage.includes("structure"))
    ) {
      return NextResponse.json(
        {
          error: "AI generation error",
          message:
            "The AI generated an invalid response. This is usually a temporary issue.",
          actionable:
            "Please try again. If the problem persists, try selecting a different model from the dropdown.",
          retryable: true,
        },
        { status: 500 }
      );
    }

    // Generic server error with helpful message
    return NextResponse.json(
      {
        error: "Failed to generate workout",
        message:
          "An unexpected error occurred while generating your workout. This may be a temporary issue.",
        actionable:
          "Please try again in a few moments. If the problem persists, try selecting a different AI model from the dropdown or contact support.",
        retryable: true,
        ...(process.env.NODE_ENV === "development" && {
          debug: {
            errorMessage,
            errorType: error?.constructor?.name,
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}
