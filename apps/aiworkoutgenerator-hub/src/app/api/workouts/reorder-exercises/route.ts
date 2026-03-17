import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import type { TrainerWorkout, TrainerWorkoutExercise } from "@/types/firestore";

export const dynamic = "force-dynamic";

// Minimal validation schema for exercise reordering
// We validate required fields to ensure data integrity before casting
const ExerciseReorderSchema = z.object({
  name: z.string().min(1),
  sets: z.number().min(1),
  muscleTarget: z.string().min(1),
  tempo: z.string().nullable().optional(),
  cues: z.array(z.string()).optional(),
  detailedInstructions: z.string().nullable().optional(),
  setDetails: z.array(z.record(z.string(), z.unknown())).optional(),
  equipment_needed: z.array(z.string()).optional(),
  muscle_groups: z.array(z.string()).optional(),
});

const RequestBodySchema = z.object({
  workout_id: z.string().min(1),
  section_index: z.number().min(0),
  reordered_exercises: z.array(ExerciseReorderSchema).min(1),
});

/**
 * POST /api/workouts/reorder-exercises
 *
 * Reorders exercises within a section. Verifies ownership, replaces the section's
 * exercises with the provided order, and updates Firestore.
 */
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

    const body = await request.json();
    const parsed = RequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { workout_id, section_index, reordered_exercises } = parsed.data;

    const workoutRef = adminDb.collection("trainer_workouts").doc(workout_id);
    const workoutSnap = await workoutRef.get();

    if (!workoutSnap.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = workoutSnap.data() as TrainerWorkout;
    if (workout.user_id !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (section_index >= (workout.sections?.length ?? 0)) {
      return NextResponse.json(
        { error: "Invalid section index" },
        { status: 400 }
      );
    }

    const section = workout.sections[section_index];
    const current = section?.exercises ?? [];
    if (reordered_exercises.length !== current.length) {
      return NextResponse.json(
        {
          error: "Invalid reorder",
          message:
            "Reordered exercise count must match the current section exercise count.",
        },
        { status: 400 }
      );
    }

    // Validate that reordered exercises match current exercises by name
    // This ensures we're not injecting invalid data
    const currentExerciseNames = new Set(
      current.map((ex) => ex.name).filter(Boolean)
    );
    const reorderedNames = reordered_exercises.map((ex) => ex.name);
    const reorderedNamesSet = new Set(reorderedNames.filter(Boolean));

    if (
      currentExerciseNames.size !== reorderedNamesSet.size ||
      ![...currentExerciseNames].every((name) => reorderedNamesSet.has(name))
    ) {
      return NextResponse.json(
        {
          error: "Invalid reorder",
          message:
            "Reordered exercises must contain the same exercises as the current section.",
        },
        { status: 400 }
      );
    }

    const updatedSections = [...(workout.sections ?? [])];
    updatedSections[section_index] = {
      ...updatedSections[section_index]!,
      // Safe to cast after validation - exercises have been validated via schema
      exercises: reordered_exercises as unknown as TrainerWorkoutExercise[],
    };

    await workoutRef.update({ sections: updatedSections });

    return NextResponse.json({
      success: true,
      sections: updatedSections,
    });
  } catch (err) {
    captureApiError(err, {
      endpoint: "reorder_exercises",
      operation: "reorder_exercises",
    });
    logger.error("[reorder-exercises] Error", err, {
      route: "/api/workouts/reorder-exercises",
      operation: "reorder_exercises",
    });
    return NextResponse.json(
      { error: "Failed to reorder exercises" },
      { status: 500 }
    );
  }
}
