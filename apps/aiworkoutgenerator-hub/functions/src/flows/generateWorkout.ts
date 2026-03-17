import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

type GenerateWorkoutInput = {
  focus: string;
  duration_minutes: number;
  equipment_access?: string[]; // Changed from string to string[] categories
  available_equipment?: string[];
};

type UserProfileSnapshot = {
  fitness_level?: string;
  injuries?: string[];
  equipment_access?: string[]; // Changed from string to string[] categories
  available_equipment?: string[];
};

function isoDateUTC(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function mapDifficulty(
  fitnessLevel?: string
): "beginner" | "intermediate" | "advanced" {
  if (fitnessLevel === "advanced" || fitnessLevel === "athlete")
    return "advanced";
  if (fitnessLevel === "intermediate") return "intermediate";
  return "beginner";
}

/**
 * PLACEHOLDER IMPLEMENTATION: Builds a stub workout with hardcoded exercises.
 *
 * This is a temporary implementation that returns static exercise data.
 * The real implementation should use AI (Genkit/Gemini) to generate personalized workouts
 * based on the user's profile, daily state, and preferences.
 *
 * When implementing AI generation, ensure exercises match the TrainerWorkoutExercise interface:
 * - name: string
 * - sets: number
 * - reps: string (e.g., "10-12", "To failure", "30-60s")
 * - rest_seconds: number
 * - duration_seconds?: number (for time-based exercises like cardio)
 * - weight_kg?: number (optional, for weighted exercises)
 * - notes: string | null (optional exercise-specific notes)
 * - equipment_needed: string[] (array of equipment item names)
 * - muscle_groups: string[] (targeted muscle groups)
 *
 * TODO: Replace this with AI-powered workout generation using Genkit/Gemini
 */
function buildStubWorkout(params: {
  focus: string;
  duration_minutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipmentNames: string[];
}) {
  const { focus, duration_minutes, difficulty, equipmentNames } = params;

  const baseExercises =
    focus === "cardio"
      ? [
          {
            name: "Brisk Walk",
            sets: 1,
            reps: "N/A",
            rest_seconds: 0,
            duration_seconds: Math.max(
              5,
              Math.floor(duration_minutes * 60 * 0.6)
            ),
            weight_kg: undefined,
            notes: null,
            equipment_needed: [],
            muscle_groups: ["cardio"],
          },
          {
            name: "Jumping Jacks",
            sets: 3,
            reps: "30",
            rest_seconds: 45,
            notes: null,
            equipment_needed: [],
            muscle_groups: ["cardio"],
          },
        ]
      : [
          {
            name: "Bodyweight Squat",
            sets: difficulty === "beginner" ? 3 : 4,
            reps: difficulty === "advanced" ? "10-12" : "12-15",
            rest_seconds: 90,
            notes: null,
            equipment_needed: [],
            muscle_groups: ["legs"],
          },
          {
            name: "Push-Up",
            sets: difficulty === "beginner" ? 3 : 4,
            reps: difficulty === "advanced" ? "8-12" : "10-15",
            rest_seconds: 90,
            notes: null,
            equipment_needed: [],
            muscle_groups: ["chest", "arms"],
          },
          {
            name: "Plank",
            sets: 3,
            reps: "30-60s",
            rest_seconds: 60,
            notes: null,
            equipment_needed: [],
            muscle_groups: ["core"],
          },
        ];

  const title =
    focus === "strength"
      ? "Strength Builder"
      : focus === "hiit"
        ? "HIIT Session"
        : focus === "flexibility"
          ? "Mobility Flow"
          : focus === "yoga"
            ? "Yoga Flow"
            : "Cardio Session";

  return {
    title,
    focus,
    duration_minutes,
    difficulty,
    exercises: baseExercises,
    equipment_used: equipmentNames,
  };
}

export const generateWorkout = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const input = request.data as GenerateWorkoutInput;
  if (!input?.focus || typeof input.focus !== "string") {
    throw new HttpsError("invalid-argument", "focus is required");
  }
  if (
    typeof input.duration_minutes !== "number" ||
    !Number.isFinite(input.duration_minutes) ||
    input.duration_minutes <= 0
  ) {
    throw new HttpsError("invalid-argument", "duration_minutes must be > 0");
  }

  const today = isoDateUTC();
  const dailyStateId = `${uid}_${today}`;

  const profileRef = db.collection("user_profiles").doc(uid);
  const dailyRef = db.collection("user_daily_state").doc(dailyStateId);

  const [profileSnap, dailySnap] = await Promise.all([
    profileRef.get(),
    dailyRef.get(),
  ]);

  const profile = (
    profileSnap.exists ? (profileSnap.data() as UserProfileSnapshot) : null
  ) as UserProfileSnapshot | null;

  const dailyState = dailySnap.exists ? dailySnap.data() : null;

  // Use equipment override if provided, otherwise fall back to profile
  const equipmentIds =
    input.available_equipment ?? profile?.available_equipment ?? [];
  const equipmentAccess =
    input.equipment_access ?? profile?.equipment_access ?? "none";
  const equipmentDocs =
    equipmentIds.length > 0
      ? await db.getAll(
          ...equipmentIds.map((id) => db.collection("equipment_items").doc(id))
        )
      : [];
  const equipmentNames = equipmentDocs
    .filter((d) => d.exists)
    .map((d) => String((d.data() as { name?: unknown })?.name ?? ""))
    .filter((n) => n.length > 0);

  const difficulty = mapDifficulty(profile?.fitness_level);
  const workout = buildStubWorkout({
    focus: input.focus,
    duration_minutes: Math.round(input.duration_minutes),
    difficulty,
    equipmentNames,
  });

  // Determine if equipment was actually overridden (input differs from profile)
  const profileEquipmentAccess = Array.isArray(profile?.equipment_access)
    ? profile.equipment_access
    : [];
  const profileAvailableEquipment = profile?.available_equipment ?? [];

  // Use spread syntax to avoid mutating original arrays with sort()
  const equipmentAccessOverridden =
    input.equipment_access !== undefined &&
    JSON.stringify([...input.equipment_access].sort()) !==
      JSON.stringify([...profileEquipmentAccess].sort());

  const availableEquipmentOverridden =
    input.available_equipment !== undefined &&
    (() => {
      // If profile has no equipment but input provides some, it's an override
      if (profileAvailableEquipment.length === 0) {
        return input.available_equipment.length > 0;
      }
      // If lengths differ, it's an override
      if (
        profileAvailableEquipment.length !== input.available_equipment.length
      ) {
        return true;
      }
      // Compare arrays (order-independent comparison using sorted sets)
      const profileSet = new Set([...profileAvailableEquipment].sort());
      const inputSet = new Set([...input.available_equipment].sort());
      if (profileSet.size !== inputSet.size) {
        return true;
      }
      for (const item of profileSet) {
        if (!inputSet.has(item)) {
          return true;
        }
      }
      return false;
    })();

  const equipmentOverride =
    equipmentAccessOverridden || availableEquipmentOverridden;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const workoutRef = db.collection("trainer_workouts").doc();

  const payload: Record<string, unknown> = {
    id: workoutRef.id,
    user_id: uid,

    title: workout.title,
    focus: workout.focus,
    duration_minutes: workout.duration_minutes,
    difficulty: workout.difficulty,
    exercises: workout.exercises,

    generation_context: {
      profile_snapshot: {
        fitness_level: profile?.fitness_level ?? "beginner",
        injuries: profile?.injuries ?? [],
        equipment_access: equipmentAccess,
      },
      daily_state_snapshot: dailyState
        ? {
            energy_level: dailyState.energy_level ?? null,
            sleep_quality: dailyState.sleep_quality ?? null,
            stress_level: dailyState.stress_level ?? null,
            soreness_areas: dailyState.soreness_areas ?? [],
          }
        : null,
      used_profile_data: !!profile,
      used_daily_state: !!dailyState,
      equipment_override: equipmentOverride,
    },

    generated_by: "genkit",
    genkit_trace_id: null,
    ai_model: null,
    generation_tokens: null,
    generation_cost_usd: null,

    completed: false,
    completed_at: null,
    scheduled_for: null,

    difficulty_rating: null,
    enjoyment_rating: null,
    completion_percentage: null,
    user_notes: null,

    created_at: now,
    updated_at: now,
  };

  await workoutRef.set(payload, { merge: false });

  return { workoutId: workoutRef.id };
});
