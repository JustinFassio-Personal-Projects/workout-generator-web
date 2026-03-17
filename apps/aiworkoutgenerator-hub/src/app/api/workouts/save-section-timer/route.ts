import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import type { TrainerWorkout } from "@/types/firestore";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const ExerciseTimerConfigSchema = z.object({
  exerciseIndex: z.number().int().min(0),
  exerciseName: z.string().optional(), // Client-side only, not persisted
  workDuration: z.number().int().min(10).max(300),
  restDuration: z.number().int().min(0).max(300), // Allow 0 for EMOM-style workouts
  sets: z.number().int().min(1).max(20),
  isBilateral: z.boolean(),
  isBidirectional: z.boolean().optional(),
  switchIndicator: z.string().optional(),
  directionIndicator: z.string().optional(),
});

const SectionTimerConfigSchema = z.object({
  sectionIndex: z.number().int().min(0),
  sectionType: z.string().optional(), // Client-side only, not persisted
  exercises: z.array(ExerciseTimerConfigSchema),
  setupDuration: z.number().int().min(3).max(60),
  transitionDuration: z.number().int().min(5).max(120).optional(),
  cooldownDuration: z.number().int().min(0).max(300).optional(),
  timerMode: z.enum(["interval", "circuit", "interval-circuit"]).optional(),
  completed: z.boolean().optional(),
});

const SaveSectionTimerRequestSchema = z.object({
  workoutId: z.string().min(1),
  sectionIndex: z.number().int().min(0),
  timerConfig: SectionTimerConfigSchema,
});

// ============================================
// API Route Handler
// ============================================

/**
 * POST /api/workouts/save-section-timer
 *
 * Saves section timer configuration to the workout document.
 * Timer configs are stored in the section's timer_config field.
 *
 * Request body:
 * - workoutId: string
 * - sectionIndex: number
 * - timerConfig: SectionTimerConfig
 *
 * Returns:
 * - 200: Success
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 403: Not owner of workout
 * - 404: Workout not found
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

    // Parse and validate request body
    const body = await request.json();
    const validated = SaveSectionTimerRequestSchema.parse(body);

    // Warn if deprecated transitionDuration field is present
    if (validated.timerConfig.transitionDuration !== undefined) {
      logger.warn(
        "[Save Section Timer] Deprecated field 'transitionDuration' detected",
        undefined,
        {
          route: "/api/workouts/save-section-timer",
          workoutId: validated.workoutId,
          sectionIndex: validated.sectionIndex,
        }
      );
    }

    // Get workout and verify ownership
    const workoutRef = adminDb
      .collection("trainer_workouts")
      .doc(validated.workoutId);
    const workoutDoc = await workoutRef.get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = workoutDoc.data() as TrainerWorkout;
    if (workout.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate section index
    if (validated.sectionIndex >= workout.sections.length) {
      return NextResponse.json(
        { error: "Invalid section index" },
        { status: 400 }
      );
    }

    // Build the timer config for persistence
    const timerConfigPersisted = {
      exercises: validated.timerConfig.exercises.map((e) => ({
        exerciseIndex: e.exerciseIndex,
        workDuration: e.workDuration,
        restDuration: e.restDuration,
        sets: e.sets,
        isBilateral: e.isBilateral,
        isBidirectional: e.isBidirectional || false,
        ...(e.switchIndicator && { switchIndicator: e.switchIndicator }),
        ...(e.directionIndicator && {
          directionIndicator: e.directionIndicator,
        }),
      })),
      setupDuration: validated.timerConfig.setupDuration,
      cooldownDuration: validated.timerConfig.cooldownDuration || 0,
      ...(validated.timerConfig.transitionDuration !== undefined && {
        transitionDuration: validated.timerConfig.transitionDuration,
      }),
      ...(validated.timerConfig.timerMode !== undefined && {
        timerMode: validated.timerConfig.timerMode,
      }),
      ...(validated.timerConfig.completed && {
        completed: validated.timerConfig.completed,
        completedAt: Timestamp.now(),
      }),
    };

    // IMPORTANT: Firestore dot notation can corrupt arrays by converting them to objects.
    // We must read the full sections array, modify it, and write the entire array back.
    const updatedSections = [...workout.sections];
    updatedSections[validated.sectionIndex] = {
      ...updatedSections[validated.sectionIndex],
      // Cast through unknown to handle admin SDK Timestamp vs client SDK Timestamp type mismatch
      timer_config:
        timerConfigPersisted as unknown as TrainerWorkout["sections"][number]["timer_config"],
    };

    await workoutRef.update({
      sections: updatedSections,
    });

    logger.info("[Save Section Timer] Saved config", {
      route: "/api/workouts/save-section-timer",
      workoutId: validated.workoutId,
      sectionIndex: validated.sectionIndex,
      exerciseCount: validated.timerConfig.exercises.length,
    });

    return NextResponse.json({
      success: true,
      message: "Timer configuration saved",
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "save_section_timer",
      operation: "save_section_timer",
    });
    logger.error("[Save Section Timer] Error", error, {
      route: "/api/workouts/save-section-timer",
      operation: "save_section_timer",
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

/**
 * DELETE /api/workouts/save-section-timer
 *
 * Clears timer configuration from a workout section.
 *
 * Query params:
 * - workoutId: string
 * - sectionIndex: number
 */
export async function DELETE(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get("workoutId");
    const sectionIndexStr = searchParams.get("sectionIndex");

    if (!workoutId || sectionIndexStr === null) {
      return NextResponse.json(
        { error: "Missing workoutId or sectionIndex" },
        { status: 400 }
      );
    }

    const sectionIndex = parseInt(sectionIndexStr, 10);
    if (isNaN(sectionIndex) || sectionIndex < 0) {
      return NextResponse.json(
        { error: "Invalid sectionIndex" },
        { status: 400 }
      );
    }

    // Get workout and verify ownership
    const workoutRef = adminDb.collection("trainer_workouts").doc(workoutId);
    const workoutDoc = await workoutRef.get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = workoutDoc.data() as TrainerWorkout;
    if (workout.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate section index
    if (sectionIndex >= workout.sections.length) {
      return NextResponse.json(
        { error: "Invalid section index" },
        { status: 400 }
      );
    }

    // IMPORTANT: Firestore dot notation can corrupt arrays by converting them to objects.
    // We must read the full sections array, modify it, and write the entire array back.
    const updatedSections = workout.sections.map((section, idx) => {
      if (idx === sectionIndex) {
        // Remove timer_config by destructuring it out
        const { timer_config: _timerConfig, ...sectionWithoutTimer } = section;
        return sectionWithoutTimer;
      }
      return section;
    });

    await workoutRef.update({
      sections: updatedSections,
    });

    return NextResponse.json({
      success: true,
      message: "Timer configuration cleared",
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "save_section_timer",
      operation: "delete_section_timer",
    });
    logger.error("[Delete Section Timer] Error", error, {
      route: "/api/workouts/save-section-timer",
      operation: "delete_section_timer",
    });

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
