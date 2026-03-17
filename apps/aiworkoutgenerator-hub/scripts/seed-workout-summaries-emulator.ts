#!/usr/bin/env tsx
/**
 * Seed the Firestore emulator with sample workout_summaries (and minimal
 * trainer_workouts) so the iteration workflow can be tested.
 *
 * Session reports are normally created when a user completes a workout in the
 * app. In the emulator there is no data by default, so this script creates
 * sample documents for a given user.
 *
 * Usage:
 *   # With emulator env set (emulators must be running)
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/seed-workout-summaries-emulator.ts <USER_ID>
 *
 *   # Or use --emulator to set host automatically
 *   npx tsx scripts/seed-workout-summaries-emulator.ts --emulator <USER_ID>
 *
 * Get USER_ID: After creating a user (e.g. scripts/create-pro-user.ts), use
 * the UID printed by that script, or copy it from the Emulator UI (Auth tab).
 *
 * Prerequisites:
 *   - Firebase emulators running (e.g. npm run firebase:emulators)
 *   - A test user created in the Auth emulator (e.g. create-pro-user.ts)
 */

import admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ai-workout-generator-hub";

function initializeAdmin(useEmulator: boolean) {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST =
      process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
    console.log(
      "[seed-workout-summaries] Using Firestore emulator:",
      process.env.FIRESTORE_EMULATOR_HOST
    );
  }
  return admin.initializeApp({ projectId: PROJECT_ID });
}

function parseArgs(argv: string[]): { userId: string; emulator: boolean } {
  let userId = "";
  let emulator = !!process.env.FIRESTORE_EMULATOR_HOST;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--emulator") {
      emulator = true;
    } else if (!arg.startsWith("--")) {
      userId = arg;
    }
  }

  if (!userId.trim()) {
    console.error(
      "Usage: npx tsx scripts/seed-workout-summaries-emulator.ts [--emulator] <USER_ID>"
    );
    console.error(
      "  USER_ID  - Firebase Auth UID of the test user (from create-pro-user or Emulator UI)"
    );
    console.error(
      "  --emulator - Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 if not already set"
    );
    process.exit(1);
  }
  return { userId, emulator };
}

/** Minimal trainer_workout-like document for reference by workout_summaries */
function makeMinimalTrainerWorkout(
  workoutId: string,
  userId: string,
  title: string,
  focus: string | null,
  trainerName: string
) {
  const now = Timestamp.now();
  return {
    id: workoutId,
    user_id: userId,
    trainerId: "marcus_chen",
    trainerName,
    title,
    description: "Sample workout for iteration testing",
    focus,
    duration_minutes: 45,
    difficulty: "intermediate" as const,
    trainerNotes: "Sample notes",
    totalDuration: 45,
    estimatedCalories: 250,
    sections: [
      {
        type: "Warmup",
        durationEstimate: "8 mins",
        exercises: [
          {
            name: "Jumping Jacks",
            sets: 1,
            muscleTarget: "Full body",
            tempo: null,
            cues: ["Stay light on feet"],
            detailedInstructions: null,
            setDetails: [{ reps: "30", weight: "Bodyweight", rest: "30s" }],
            equipment_needed: [],
            muscle_groups: ["full body"],
          },
        ],
      },
      {
        type: "Main Workout",
        durationEstimate: "35 mins",
        exercises: [
          {
            name: "Goblet Squat",
            sets: 3,
            muscleTarget: "Quadriceps",
            tempo: "3-0-1-0",
            cues: ["Keep chest up", "Knees over toes"],
            detailedInstructions: null,
            setDetails: [
              { reps: "10", weight: "RPE 7", rest: "60s" },
              { reps: "10", weight: "RPE 7", rest: "60s" },
              { reps: "10", weight: "RPE 8", rest: "60s" },
            ],
            equipment_needed: ["kettlebell"],
            muscle_groups: ["quadriceps", "glutes"],
          },
        ],
      },
    ],
    personalization: [],
    generation_context: {
      profile_snapshot: {
        fitness_level: "intermediate",
        injuries: [],
        equipment_access: [],
        available_equipment: [],
      },
      daily_state_snapshot: null,
      used_profile_data: true,
      used_daily_state: false,
      equipment_override: false,
    },
    generated_by: "genkit",
    genkit_trace_id: null,
    ai_model: null,
    generation_tokens: null,
    generation_cost_usd: null,
    completed: true,
    completed_at: now,
    scheduled_for: null,
    difficulty_rating: null,
    enjoyment_rating: null,
    completion_percentage: 100,
    user_notes: null,
    session_rpe: null,
    weight_selection: null,
    session_feedback: [],
    joint_pain_location: null,
    visibility: "private",
    created_at: now,
    updated_at: now,
  };
}

/** One workout_summary document for the emulator */
function makeWorkoutSummary(
  summaryId: string,
  workoutId: string,
  userId: string,
  title: string,
  focus: string | null,
  trainerName: string,
  completedAt: Date,
  sessionRpe: number | null,
  weightSelection: "too_light" | "perfect" | "too_heavy" | null,
  completionPct: number
) {
  const now = Timestamp.now();
  const completedAtTs = Timestamp.fromDate(completedAt);
  return {
    id: summaryId,
    user_id: userId,
    workout_id: workoutId,
    title,
    focus,
    difficulty: "intermediate" as const,
    completed_at: completedAtTs,
    trainer_name: trainerName,
    stats: {
      totalTimeMinutes: 45,
      warmupMinutes: 8,
      mainMinutes: 35,
      finisherMinutes: 2,
      estimatedVolumeLoad: null,
      strainScore: null,
      completionPercentage: completionPct,
    },
    sections: [
      {
        type: "Warmup",
        durationEstimate: "8 mins",
        exercises: [
          {
            name: "Jumping Jacks",
            muscleTarget: "Full body",
            tempo: null,
            setsPlanned: 1,
            setsCompleted: 1,
            averageRestSeconds: null,
            cues: ["Stay light on feet"],
            setDetails: [
              { index: 0, reps: "30", weight: "Bodyweight", rest: "30s" },
            ],
          },
        ],
      },
      {
        type: "Main Workout",
        durationEstimate: "35 mins",
        exercises: [
          {
            name: "Goblet Squat",
            muscleTarget: "Quadriceps",
            tempo: "3-0-1-0",
            setsPlanned: 3,
            setsCompleted: 3,
            averageRestSeconds: 60,
            cues: ["Keep chest up", "Knees over toes"],
            setDetails: [
              { index: 0, reps: "10", weight: "RPE 7", rest: "60s" },
              { index: 1, reps: "10", weight: "RPE 7", rest: "60s" },
              { index: 2, reps: "10", weight: "RPE 8", rest: "60s" },
            ],
          },
        ],
      },
    ],
    user_notes: null,
    difficulty_rating: null,
    enjoyment_rating: null,
    session_rpe: sessionRpe,
    weight_selection: weightSelection,
    session_feedback: [],
    joint_pain_location: null,
    visibility: "private",
    created_at: now,
    updated_at: now,
  };
}

async function main() {
  const { userId, emulator } = parseArgs(process.argv);

  if (emulator && !process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      "Emulator flag set but FIRESTORE_EMULATOR_HOST is not set. Emulators must be running."
    );
    process.exit(1);
  }

  initializeAdmin(emulator);
  const db = admin.firestore();

  const workout1Id = `seed-workout-${userId}-1`;
  const workout2Id = `seed-workout-${userId}-2`;
  const summary1Id = `seed-summary-${userId}-1`;
  const summary2Id = `seed-summary-${userId}-2`;

  const baseDate = new Date();
  const completed1 = new Date(baseDate);
  completed1.setDate(completed1.getDate() - 3);
  const completed2 = new Date(baseDate);
  completed2.setDate(completed2.getDate() - 1);

  console.log(
    "Seeding trainer_workouts and workout_summaries for user:",
    userId
  );

  // 1. Create minimal trainer_workouts (so workout_id is valid)
  const workout1 = makeMinimalTrainerWorkout(
    workout1Id,
    userId,
    "Upper Body Strength",
    "Upper Body",
    "Marcus Chen"
  );
  const workout2 = makeMinimalTrainerWorkout(
    workout2Id,
    userId,
    "Full Body HIIT",
    "HIIT",
    "Alex Kim"
  );

  await db.collection("trainer_workouts").doc(workout1Id).set(workout1);
  await db.collection("trainer_workouts").doc(workout2Id).set(workout2);
  console.log("  Created trainer_workouts:", workout1Id, workout2Id);

  // 2. Create workout_summaries (session reports)
  const summary1 = makeWorkoutSummary(
    summary1Id,
    workout1Id,
    userId,
    "Upper Body Strength",
    "Upper Body",
    "Marcus Chen",
    completed1,
    7,
    "perfect",
    100
  );
  const summary2 = makeWorkoutSummary(
    summary2Id,
    workout2Id,
    userId,
    "Full Body HIIT",
    "HIIT",
    "Alex Kim",
    completed2,
    8,
    "too_light",
    95
  );

  // Omit id from document (Firestore uses doc id)
  const { id: _, ...summary1Data } = summary1;
  const { id: __, ...summary2Data } = summary2;

  await db.collection("workout_summaries").doc(summary1Id).set(summary1Data);
  await db.collection("workout_summaries").doc(summary2Id).set(summary2Data);

  console.log("  Created workout_summaries:", summary1Id, summary2Id);
  console.log("");
  console.log("Done. In the app:");
  console.log("  1. Sign in as the user with UID:", userId);
  console.log("  2. Go to Generate → Iterate Previous");
  console.log(
    "  3. You should see 'Upper Body Strength' and 'Full Body HIIT' in the dropdown"
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});
