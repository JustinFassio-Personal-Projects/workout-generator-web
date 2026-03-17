import { Timestamp } from "firebase-admin/firestore";

import type {
  TrainerWorkoutSection,
  TrainerWorkoutExercise,
  TrainerWorkoutQualityAssurance,
  QAAlertItem,
  QAAlertSeverity,
  QAExerciseImageStatus,
  QAExerciseDetail,
  QAGenerationStatus,
  QAImageGenerationStatus,
  WorkoutDifficulty,
  QATimestamp,
} from "@/types/firestore";

import { QA_ALERT_CODES, type QAAlertCode } from "@/types/firestore";

/**
 * Cast Admin SDK Timestamp to QATimestamp interface for type compatibility.
 * Both SDK Timestamps satisfy the QATimestamp interface at runtime.
 */
function toQATimestamp(ts: Timestamp): QATimestamp {
  return ts as unknown as QATimestamp;
}

function toQATimestampOrNull(
  ts: Timestamp | null | undefined
): QATimestamp | null {
  return ts ? toQATimestamp(ts) : null;
}

// -----------------------------
// Constants
// -----------------------------

/** Current QA schema version for future migrations */
export const QA_SCHEMA_VERSION = 1;

/** Generic titles that indicate low quality */
const GENERIC_TITLES = new Set([
  "workout",
  "strength builder",
  "cardio session",
  "hiit session",
  "yoga flow",
  "mobility flow",
  "training session",
  "exercise routine",
  "fitness session",
]);

/** Valid focus values */
const VALID_FOCUSES = new Set([
  "strength",
  "cardio",
  "hiit",
  "flexibility",
  "yoga",
]);

/** Keywords that may indicate injury-sensitive exercises */
const INJURY_KEYWORDS: Record<string, string[]> = {
  knee: ["squat", "lunge", "jump", "leg press", "leg extension"],
  shoulder: ["overhead", "press", "pull-up", "lateral raise", "military"],
  back: ["deadlift", "row", "good morning", "hyperextension"],
  wrist: ["push-up", "plank", "handstand", "burpee"],
  ankle: ["jump", "run", "skip", "hop", "calf raise"],
  hip: ["squat", "lunge", "deadlift", "hip thrust"],
  neck: ["overhead", "shoulder stand", "headstand"],
};

// -----------------------------
// Input Types
// -----------------------------

export interface QAComputeInput {
  // Workout data
  title: string | null | undefined;
  description: string | null | undefined;
  focus: string | null | undefined;
  difficulty: WorkoutDifficulty | null | undefined;
  duration_minutes: number | null | undefined;
  totalDuration: number | null | undefined;
  sections: TrainerWorkoutSection[] | null | undefined;

  // Generation context
  generation_context?: {
    profile_snapshot?: {
      fitness_level?: string;
      injuries?: string[];
      equipment_access?: string[]; // Changed from string to string[] categories
    };
    daily_state_snapshot?: {
      energy_level?: number;
      sleep_quality?: number;
      stress_level?: number;
      soreness_areas?: Array<{ area: string; level: number }>;
    } | null;
    used_profile_data?: boolean;
    used_daily_state?: boolean;
    equipment_override?: boolean;
  };

  // User equipment (from request/profile resolution)
  user_equipment?: string[];

  // Image generation state
  has_images?: boolean;
  images_generated_at?: Timestamp | null;

  // Generation timing (captured in the API route)
  generation_started_at?: Timestamp | null;
  generation_completed_at?: Timestamp | null;
  generation_duration_ms?: number | null;
  generation_error?: string | null;
  generation_retry_count?: number;

  // Image generation timing (for PATCH updates)
  image_generation_started_at?: Timestamp | null;
  image_generation_completed_at?: Timestamp | null;
  image_generation_duration_ms?: number | null;
}

// -----------------------------
// Alert Severity Mapping
// -----------------------------

const ALERT_SEVERITY_MAP: Record<QAAlertCode, QAAlertSeverity> = {
  // Critical - Workout unusable
  [QA_ALERT_CODES.NO_EXERCISES]: "critical",
  [QA_ALERT_CODES.EXERCISES_MISSING_FIELD]: "critical",
  [QA_ALERT_CODES.GENERATION_FAILED]: "critical",
  [QA_ALERT_CODES.NO_MAIN_WORKOUT]: "critical",
  [QA_ALERT_CODES.IMAGE_GEN_FAILED]: "critical",

  // Warning - Quality issues
  [QA_ALERT_CODES.GENERATION_PARTIAL]: "warning",
  [QA_ALERT_CODES.IMAGE_GEN_PARTIAL]: "warning",
  [QA_ALERT_CODES.NO_INSTRUCTIONS]: "warning",
  [QA_ALERT_CODES.NO_FORM_CUES]: "warning",
  [QA_ALERT_CODES.NO_WARMUP]: "warning",
  [QA_ALERT_CODES.WARMUP_INSUFFICIENT_EXERCISES]: "warning",
  [QA_ALERT_CODES.WARMUP_MISSING_LOWER_BACK]: "warning",
  [QA_ALERT_CODES.WARMUP_MISSING_FOCUS_MUSCLES]: "warning",
  [QA_ALERT_CODES.NO_COOLDOWN]: "warning",
  [QA_ALERT_CODES.EQUIPMENT_MISMATCH]: "warning",
  [QA_ALERT_CODES.DIFFICULTY_MISMATCH]: "warning",
  [QA_ALERT_CODES.POTENTIAL_INJURY_CONFLICT]: "warning",
  [QA_ALERT_CODES.DURATION_INACCURATE]: "warning",
  [QA_ALERT_CODES.LOW_VARIETY]: "warning",
  [QA_ALERT_CODES.MISSING_TITLE]: "warning",
  [QA_ALERT_CODES.GENERIC_TITLE]: "warning",

  // Info - Minor issues
  [QA_ALERT_CODES.IMAGE_GEN_PENDING]: "info",
  [QA_ALERT_CODES.DAILY_STATE_UNUSED]: "info",
  [QA_ALERT_CODES.MISSING_MUSCLE_GROUPS]: "info",
  [QA_ALERT_CODES.MISSING_REST_PERIODS]: "info",
  [QA_ALERT_CODES.LOW_PERSONALIZATION]: "info",
  [QA_ALERT_CODES.MISSING_DESCRIPTION]: "info",
  [QA_ALERT_CODES.MISSING_FOCUS]: "info",
};

// -----------------------------
// Helper Functions
// -----------------------------

function createAlert(
  code: QAAlertCode,
  category: QAAlertItem["category"],
  message: string,
  details?: Record<string, unknown>
): QAAlertItem {
  return {
    id: `${category}_${code}_${Date.now()}`,
    severity: ALERT_SEVERITY_MAP[code],
    category,
    code,
    message,
    ...(details && { details }),
  };
}

function computeOverallScore(alerts: QAAlertItem[]): number {
  let score = 100;
  for (const alert of alerts) {
    switch (alert.severity) {
      case "critical":
        score -= 25;
        break;
      case "warning":
        score -= 10;
        break;
      case "info":
        score -= 2;
        break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function isGenericTitle(title: string): boolean {
  return GENERIC_TITLES.has(title.toLowerCase().trim());
}

function normalizeEquipmentName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function checkInjuryConflict(
  exercises: TrainerWorkoutExercise[],
  injuries: string[]
): { hasConflict: boolean; conflictingExercises: string[] } {
  if (!injuries.length) {
    return { hasConflict: false, conflictingExercises: [] };
  }

  const conflictingExercises: string[] = [];
  const injuryLower = injuries.map((i) => i.toLowerCase());

  for (const exercise of exercises) {
    const exerciseLower = exercise.name.toLowerCase();

    for (const injury of injuryLower) {
      const keywords = INJURY_KEYWORDS[injury] || [];
      for (const keyword of keywords) {
        if (exerciseLower.includes(keyword)) {
          conflictingExercises.push(exercise.name);
          break;
        }
      }
    }
  }

  return {
    hasConflict: conflictingExercises.length > 0,
    conflictingExercises: [...new Set(conflictingExercises)],
  };
}

function mapFitnessLevelToOrdinal(level: string): number {
  const map: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    athlete: 4,
  };
  return map[level.toLowerCase()] ?? 2;
}

function mapDifficultyToOrdinal(difficulty: string): number {
  const map: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };
  return map[difficulty.toLowerCase()] ?? 2;
}

// -----------------------------
// Main Compute Function
// -----------------------------

/**
 * Computes the quality assurance object for a workout.
 * This is a pure function with no side effects.
 */
export function computeTrainerWorkoutQA(
  input: QAComputeInput,
  computedAt: Timestamp
): TrainerWorkoutQualityAssurance {
  const alerts: QAAlertItem[] = [];

  // Defensive: handle null/undefined sections
  const sections = input.sections ?? [];
  const exercises = sections.flatMap((s) => s.exercises ?? []);
  const totalExercises = exercises.length;

  // ═══════════════════════════════════════════════════════
  // GENERATION STATUS
  // ═══════════════════════════════════════════════════════

  let generationStatus: QAGenerationStatus = "complete";
  if (input.generation_error) {
    generationStatus = "failed";
    alerts.push(
      createAlert(
        QA_ALERT_CODES.GENERATION_FAILED,
        "generation",
        "Workout generation failed",
        { error: input.generation_error }
      )
    );
  } else if (totalExercises === 0 && sections.length > 0) {
    generationStatus = "partial";
    alerts.push(
      createAlert(
        QA_ALERT_CODES.GENERATION_PARTIAL,
        "generation",
        "Generation completed but produced no exercises"
      )
    );
  }

  const generation = {
    status: generationStatus,
    started_at: toQATimestampOrNull(input.generation_started_at),
    completed_at: toQATimestampOrNull(input.generation_completed_at),
    duration_ms: input.generation_duration_ms ?? null,
    error_message: input.generation_error ?? null,
    retry_count: input.generation_retry_count ?? 0,
  };

  // ═══════════════════════════════════════════════════════
  // IMAGE GENERATION
  // ═══════════════════════════════════════════════════════

  const exerciseImages: QAExerciseImageStatus[] = [];
  let withImages = 0;

  let globalIndex = 0;
  for (const section of sections) {
    for (const exercise of section.exercises ?? []) {
      const hasImage = !!exercise.image_url;
      if (hasImage) withImages++;

      exerciseImages.push({
        exercise_index: globalIndex,
        exercise_name: exercise.name,
        status: hasImage ? "complete" : "pending",
        image_url: exercise.image_url ?? null,
        error: null,
      });
      globalIndex++;
    }
  }

  let imageStatus: QAImageGenerationStatus = "pending";
  if (input.has_images) {
    if (withImages === 0 && totalExercises > 0) {
      imageStatus = "failed";
      alerts.push(
        createAlert(
          QA_ALERT_CODES.IMAGE_GEN_FAILED,
          "images",
          "All image generation failed"
        )
      );
    } else if (withImages === totalExercises) {
      imageStatus = "complete";
    } else if (withImages > 0) {
      imageStatus = "partial";
      alerts.push(
        createAlert(
          QA_ALERT_CODES.IMAGE_GEN_PARTIAL,
          "images",
          `${totalExercises - withImages} of ${totalExercises} exercise images failed`,
          { failed: totalExercises - withImages, total: totalExercises }
        )
      );
    }
  } else if (totalExercises > 0) {
    // Images not yet generated
    alerts.push(
      createAlert(
        QA_ALERT_CODES.IMAGE_GEN_PENDING,
        "images",
        "Image generation not yet started"
      )
    );
  }

  // Compute failed images when image generation was attempted
  const computedFailedImages = input.has_images
    ? totalExercises - withImages
    : 0;

  const image_generation = {
    status: imageStatus,
    started_at: toQATimestampOrNull(input.image_generation_started_at),
    completed_at: toQATimestampOrNull(input.image_generation_completed_at),
    duration_ms: input.image_generation_duration_ms ?? null,
    total_requested: totalExercises,
    total_complete: withImages,
    total_failed: computedFailedImages,
    error_message: null,
    exercise_images: exerciseImages,
  };

  // ═══════════════════════════════════════════════════════
  // EXERCISE COMPLETENESS
  // ═══════════════════════════════════════════════════════

  if (!input.sections) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.EXERCISES_MISSING_FIELD,
        "exercises",
        "Workout sections field is undefined"
      )
    );
  } else if (totalExercises === 0) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.NO_EXERCISES,
        "exercises",
        "Workout has no exercises"
      )
    );
  }

  let withInstructions = 0;
  let withFormCues = 0;
  let withSetsReps = 0;
  let withRestPeriods = 0;
  let withMuscleGroups = 0;
  let withEquipment = 0;
  let withDuration = 0;

  const exerciseDetails: QAExerciseDetail[] = [];
  globalIndex = 0;

  for (const section of sections) {
    for (const exercise of section.exercises ?? []) {
      const issues: string[] = [];

      const hasImage = !!exercise.image_url;
      const hasInstructions =
        !!exercise.detailedInstructions &&
        exercise.detailedInstructions.trim().length > 0;
      const hasFormCues =
        Array.isArray(exercise.cues) && exercise.cues.length > 0;
      const hasSetsReps =
        exercise.sets > 0 &&
        Array.isArray(exercise.setDetails) &&
        exercise.setDetails.length === exercise.sets;
      const hasRestPeriod =
        Array.isArray(exercise.setDetails) &&
        exercise.setDetails.some((s) => s.rest && s.rest.trim().length > 0);
      const hasMuscleGroups =
        Array.isArray(exercise.muscle_groups) &&
        exercise.muscle_groups.length > 0;
      const hasEquipment = Array.isArray(exercise.equipment_needed);
      const hasDuration =
        Array.isArray(exercise.setDetails) &&
        exercise.setDetails.some(
          (s) => s.duration && s.duration.trim().length > 0
        );

      if (hasImage) withImages++;
      if (hasInstructions) withInstructions++;
      if (hasFormCues) withFormCues++;
      if (hasSetsReps) withSetsReps++;
      if (hasRestPeriod) withRestPeriods++;
      if (hasMuscleGroups) withMuscleGroups++;
      if (hasEquipment) withEquipment++;
      if (hasDuration) withDuration++;

      if (!hasInstructions) issues.push("Missing detailed instructions");
      if (!hasFormCues) issues.push("Missing form cues");
      if (!hasSetsReps) issues.push("Sets/reps mismatch");
      if (!hasRestPeriod) issues.push("Missing rest period");
      if (!hasMuscleGroups) issues.push("Missing muscle groups");

      exerciseDetails.push({
        index: globalIndex,
        name: exercise.name,
        has_image: hasImage,
        has_instructions: hasInstructions,
        has_form_cues: hasFormCues,
        has_sets_reps: hasSetsReps,
        has_rest_period: hasRestPeriod,
        has_muscle_groups: hasMuscleGroups,
        has_equipment: hasEquipment,
        has_duration: hasDuration,
        issues,
      });
      globalIndex++;
    }
  }

  // Alert if >50% exercises missing instructions
  if (totalExercises > 0 && withInstructions / totalExercises < 0.5) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.NO_INSTRUCTIONS,
        "exercises",
        `${totalExercises - withInstructions} exercises missing detailed instructions`,
        { missing: totalExercises - withInstructions, total: totalExercises }
      )
    );
  }

  // Alert if >50% exercises missing form cues
  if (totalExercises > 0 && withFormCues / totalExercises < 0.5) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.NO_FORM_CUES,
        "exercises",
        `${totalExercises - withFormCues} exercises missing form cues`,
        { missing: totalExercises - withFormCues, total: totalExercises }
      )
    );
  }

  // Info alert for missing muscle groups
  if (totalExercises > 0 && withMuscleGroups < totalExercises) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.MISSING_MUSCLE_GROUPS,
        "exercises",
        `${totalExercises - withMuscleGroups} exercises missing muscle group tags`
      )
    );
  }

  // Info alert for missing rest periods
  if (totalExercises > 0 && withRestPeriods < totalExercises) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.MISSING_REST_PERIODS,
        "exercises",
        `${totalExercises - withRestPeriods} exercises missing rest periods`
      )
    );
  }

  const exercise_quality = {
    total_exercises: totalExercises,
    with_images: withImages,
    with_instructions: withInstructions,
    with_form_cues: withFormCues,
    with_sets_reps: withSetsReps,
    with_rest_periods: withRestPeriods,
    with_muscle_groups: withMuscleGroups,
    with_equipment: withEquipment,
    with_duration: withDuration,
    exercises: exerciseDetails,
  };

  // ═══════════════════════════════════════════════════════
  // WORKOUT STRUCTURE
  // ═══════════════════════════════════════════════════════

  const sectionTypes = sections.map((s) => s.type);
  const hasWarmup = sectionTypes.includes("Warmup");
  const hasCooldown = sectionTypes.includes("Cooldown");
  const hasMainWorkout = sectionTypes.includes("Main Workout");

  if (!hasWarmup) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.NO_WARMUP,
        "structure",
        "Workout missing warm-up section"
      )
    );
  } else {
    // Enhanced warmup quality checks
    const warmupSection = sections.find((s) => s.type === "Warmup");
    if (warmupSection) {
      const warmupExercises = warmupSection.exercises ?? [];
      const warmupExerciseCount = warmupExercises.length;

      // Check for minimum exercise count (5+ exercises)
      if (warmupExerciseCount < 5) {
        alerts.push(
          createAlert(
            QA_ALERT_CODES.WARMUP_INSUFFICIENT_EXERCISES,
            "structure",
            `Warmup has only ${warmupExerciseCount} exercises, should have at least 5 exercises for proper safety and preparation`,
            { exerciseCount: warmupExerciseCount, minimum: 5 }
          )
        );
      }

      // Check for lower back exercises
      const warmupExerciseNames = warmupExercises.map((e) =>
        e.name.toLowerCase()
      );
      const warmupMuscleGroups = warmupExercises.flatMap(
        (e) => e.muscle_groups ?? []
      );
      const lowerBackKeywords = [
        "lower back",
        "lumbar",
        "spine",
        "cat-cow",
        "cat cow",
        "hip circle",
        "hip circles",
        "spinal twist",
        "torso twist",
        "spinal",
        "back extension",
        "back flexion",
      ];
      const hasLowerBack =
        warmupExerciseNames.some((name) =>
          lowerBackKeywords.some((keyword) => name.includes(keyword))
        ) ||
        warmupMuscleGroups.some(
          (mg) =>
            mg.toLowerCase().includes("lower back") ||
            mg.toLowerCase().includes("lumbar") ||
            mg.toLowerCase().includes("spine")
        );

      if (!hasLowerBack) {
        alerts.push(
          createAlert(
            QA_ALERT_CODES.WARMUP_MISSING_LOWER_BACK,
            "structure",
            "Warmup missing lower back exercises (required for safety)",
            {
              suggested: [
                "Cat-Cow",
                "Hip Circles",
                "Gentle Spinal Twists",
                "Lower Back Extensions",
              ],
            }
          )
        );
      }

      // Check if warmup targets focus muscle groups from main workout
      const mainWorkoutSection = sections.find(
        (s) => s.type === "Main Workout"
      );
      if (mainWorkoutSection) {
        const mainWorkoutMuscleGroups = new Set(
          (mainWorkoutSection.exercises ?? [])
            .flatMap((e) => e.muscle_groups ?? [])
            .map((mg) => mg.toLowerCase().trim())
        );

        // Get warmup muscle groups (from exercise names and muscle_groups)
        const warmupTargetedMuscles = new Set<string>();
        // Convert Set to array once for efficient iteration
        const mainWorkoutMuscleGroupsArray = Array.from(
          mainWorkoutMuscleGroups
        );
        warmupExercises.forEach((e) => {
          // Add from muscle_groups
          (e.muscle_groups ?? []).forEach((mg) => {
            warmupTargetedMuscles.add(mg.toLowerCase().trim());
          });
          // Also check exercise name for muscle group keywords
          const exerciseNameLower = e.name.toLowerCase();
          mainWorkoutMuscleGroupsArray.forEach((mainMg) => {
            if (exerciseNameLower.includes(mainMg)) {
              warmupTargetedMuscles.add(mainMg);
            }
          });
        });

        // Check if at least 50% of main workout muscle groups are targeted in warmup
        const mainWorkoutMuscleArray = Array.from(mainWorkoutMuscleGroups);
        const warmupTargetedMusclesArray = Array.from(warmupTargetedMuscles);

        /**
         * Checks if two muscle group names match using word boundary matching
         * to avoid false positives (e.g., "back" matching "feedback").
         */
        const muscleGroupsMatch = (mg1: string, mg2: string): boolean => {
          // Exact match
          if (mg1 === mg2) return true;
          // Use word boundaries to match whole words/phrases
          // Escape special regex characters in the muscle group name
          const escaped1 = mg1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const escaped2 = mg2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Check if mg1 appears as a whole word/phrase in mg2
          const regex1 = new RegExp(`\\b${escaped1}\\b`, "i");
          // Check if mg2 appears as a whole word/phrase in mg1
          const regex2 = new RegExp(`\\b${escaped2}\\b`, "i");
          return regex1.test(mg2) || regex2.test(mg1);
        };

        const targetedInWarmup = mainWorkoutMuscleArray.filter((mg) =>
          warmupTargetedMusclesArray.some((warmupMg) =>
            muscleGroupsMatch(mg, warmupMg)
          )
        );

        if (
          mainWorkoutMuscleGroups.size > 0 &&
          targetedInWarmup.length < mainWorkoutMuscleArray.length * 0.5
        ) {
          const missingMuscles = mainWorkoutMuscleArray.filter(
            (mg) =>
              !warmupTargetedMusclesArray.some((warmupMg) =>
                muscleGroupsMatch(mg, warmupMg)
              )
          );
          alerts.push(
            createAlert(
              QA_ALERT_CODES.WARMUP_MISSING_FOCUS_MUSCLES,
              "structure",
              `Warmup does not adequately target focus muscle groups from main workout. Missing warmup for: ${missingMuscles.slice(0, 5).join(", ")}`,
              {
                mainWorkoutMuscles: Array.from(mainWorkoutMuscleGroups),
                warmupTargetedMuscles: warmupTargetedMusclesArray,
                missingMuscles: missingMuscles.slice(0, 5),
              }
            )
          );
        }
      }
    }
  }

  if (!hasCooldown) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.NO_COOLDOWN,
        "structure",
        "Workout missing cool-down section"
      )
    );
  }

  if (!hasMainWorkout) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.NO_MAIN_WORKOUT,
        "structure",
        "Workout missing main workout section"
      )
    );
  }

  // Exercise variety score (unique names / total)
  const uniqueNames = new Set(
    exercises.map((e) => e.name.toLowerCase().trim())
  );
  const exerciseVarietyScore =
    totalExercises > 0
      ? Math.round((uniqueNames.size / totalExercises) * 100)
      : 0;

  if (exerciseVarietyScore < 60 && totalExercises >= 3) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.LOW_VARIETY,
        "structure",
        `Low exercise variety: ${exerciseVarietyScore}% unique exercises`,
        { score: exerciseVarietyScore }
      )
    );
  }

  // Muscle group balance (simplified: count unique muscle groups)
  const allMuscleGroups = exercises.flatMap((e) => e.muscle_groups ?? []);
  const uniqueMuscleGroups = new Set(
    allMuscleGroups.map((m) => m.toLowerCase())
  );
  const muscleGroupBalance = Math.min(100, uniqueMuscleGroups.size * 15); // Rough score

  // Duration accuracy
  const requestedDuration = input.duration_minutes ?? 0;
  const calculatedDuration = input.totalDuration ?? 0;
  const durationDiff = Math.abs(calculatedDuration - requestedDuration);
  const durationThreshold = requestedDuration * 0.2;
  const estimatedDurationAccurate =
    requestedDuration === 0 || durationDiff <= durationThreshold;

  if (!estimatedDurationAccurate && requestedDuration > 0) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.DURATION_INACCURATE,
        "structure",
        `Duration mismatch: requested ${requestedDuration}min, estimated ${calculatedDuration}min`,
        { requested: requestedDuration, estimated: calculatedDuration }
      )
    );
  }

  const structure = {
    has_warmup: hasWarmup,
    has_cooldown: hasCooldown,
    has_main_workout: hasMainWorkout,
    exercise_variety_score: exerciseVarietyScore,
    muscle_group_balance: muscleGroupBalance,
    progressive_intensity: true, // TODO: Implement progressive check
    estimated_duration_accurate: estimatedDurationAccurate,
    calculated_duration_minutes: calculatedDuration,
  };

  // ═══════════════════════════════════════════════════════
  // PERSONALIZATION CHECKS
  // ═══════════════════════════════════════════════════════

  const profileSnapshot = input.generation_context?.profile_snapshot;
  const dailyStateSnapshot = input.generation_context?.daily_state_snapshot;
  const usedDailyState = input.generation_context?.used_daily_state ?? false;

  // Equipment match
  const userEquipment = (input.user_equipment ?? []).map(
    normalizeEquipmentName
  );
  const requiredEquipment = [
    ...new Set(exercises.flatMap((e) => e.equipment_needed ?? [])),
  ].map(normalizeEquipmentName);
  const missingEquipment = requiredEquipment.filter(
    (e) => e && !userEquipment.includes(e) && e !== "bodyweight" && e !== "none"
  );
  const equipmentMatchPassed = missingEquipment.length === 0;
  const equipmentMatchScore = requiredEquipment.length
    ? Math.round(
        ((requiredEquipment.length - missingEquipment.length) /
          requiredEquipment.length) *
          100
      )
    : 100;

  if (!equipmentMatchPassed) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.EQUIPMENT_MISMATCH,
        "personalization",
        `Workout requires equipment user doesn't have: ${missingEquipment.join(", ")}`,
        { missing: missingEquipment }
      )
    );
  }

  // Difficulty match
  const userLevel = profileSnapshot?.fitness_level ?? "intermediate";
  const workoutDifficulty = input.difficulty ?? "intermediate";
  const userOrdinal = mapFitnessLevelToOrdinal(userLevel);
  const difficultyOrdinal = mapDifficultyToOrdinal(workoutDifficulty);
  const difficultyDiff = Math.abs(userOrdinal - difficultyOrdinal);
  const difficultyMatchPassed = difficultyDiff <= 1;
  const difficultyMatchScore = difficultyMatchPassed ? 100 : 50;

  if (!difficultyMatchPassed) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.DIFFICULTY_MISMATCH,
        "personalization",
        `Difficulty mismatch: user level "${userLevel}", workout "${workoutDifficulty}"`,
        { userLevel, workoutDifficulty }
      )
    );
  }

  // Injury check
  const userInjuries = profileSnapshot?.injuries ?? [];
  const injuryCheck = checkInjuryConflict(exercises, userInjuries);
  const injuryCheckScore = injuryCheck.hasConflict ? 50 : 100;

  if (injuryCheck.hasConflict) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.POTENTIAL_INJURY_CONFLICT,
        "personalization",
        `Exercises may conflict with injuries: ${injuryCheck.conflictingExercises.join(", ")}`,
        { injuries: userInjuries, exercises: injuryCheck.conflictingExercises }
      )
    );
  }

  // Daily state applied
  const dailyStateAvailable = !!dailyStateSnapshot;
  const dailyStateAppliedPassed = !dailyStateAvailable || usedDailyState;

  if (dailyStateAvailable && !usedDailyState) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.DAILY_STATE_UNUSED,
        "personalization",
        "Daily state was available but not used for personalization"
      )
    );
  }

  const personalizationOverallScore = Math.round(
    (equipmentMatchScore +
      difficultyMatchScore +
      injuryCheckScore +
      (dailyStateAppliedPassed ? 100 : 50)) /
      4
  );

  if (personalizationOverallScore < 60) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.LOW_PERSONALIZATION,
        "personalization",
        `Low personalization score: ${personalizationOverallScore}%`
      )
    );
  }

  const personalization = {
    equipment_match: {
      passed: equipmentMatchPassed,
      user_equipment: input.user_equipment ?? [],
      required_equipment: requiredEquipment,
      missing_equipment: missingEquipment,
      score: equipmentMatchScore,
    },
    difficulty_match: {
      passed: difficultyMatchPassed,
      user_level: userLevel,
      workout_difficulty: workoutDifficulty,
      is_appropriate: difficultyMatchPassed,
      score: difficultyMatchScore,
    },
    injury_check: {
      passed: !injuryCheck.hasConflict,
      user_injuries: userInjuries,
      contraindicated_exercises: injuryCheck.conflictingExercises,
      score: injuryCheckScore,
    },
    daily_state_applied: {
      passed: dailyStateAppliedPassed,
      was_available: dailyStateAvailable,
      was_used: usedDailyState,
      adjustments_made: [], // TODO: Extract from personalization items if needed
    },
    overall_score: personalizationOverallScore,
  };

  // ═══════════════════════════════════════════════════════
  // CONTENT QUALITY
  // ═══════════════════════════════════════════════════════

  const hasTitle = !!input.title && input.title.trim().length > 0;
  const hasDescription =
    !!input.description && input.description.trim().length > 0;
  const hasFocus = !!input.focus;
  const focusIsValid =
    hasFocus && VALID_FOCUSES.has(input.focus!.toLowerCase());
  const hasDifficulty = !!input.difficulty;
  const hasDuration =
    typeof input.duration_minutes === "number" && input.duration_minutes > 0;

  const isGeneric = hasTitle && isGenericTitle(input.title!);
  let titleQuality: "good" | "generic" | "missing" = "good";
  if (!hasTitle) {
    titleQuality = "missing";
    alerts.push(
      createAlert(
        QA_ALERT_CODES.MISSING_TITLE,
        "content",
        "Workout has no title"
      )
    );
  } else if (isGeneric) {
    titleQuality = "generic";
    alerts.push(
      createAlert(
        QA_ALERT_CODES.GENERIC_TITLE,
        "content",
        `Title is too generic: "${input.title}"`
      )
    );
  }

  if (!hasDescription) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.MISSING_DESCRIPTION,
        "content",
        "Workout has no description"
      )
    );
  }

  if (!hasFocus) {
    alerts.push(
      createAlert(
        QA_ALERT_CODES.MISSING_FOCUS,
        "content",
        "Workout has no focus specified"
      )
    );
  }

  // Instructions clarity: average word count per instruction
  const allInstructions = exercises
    .filter((e) => e.detailedInstructions)
    .map((e) => e.detailedInstructions!);
  const avgWordCount =
    allInstructions.length > 0
      ? allInstructions.reduce((sum, i) => sum + i.split(/\s+/).length, 0) /
        allInstructions.length
      : 0;
  // Scale: 0-10 words = 0-50, 10-30 words = 50-100
  const instructionsClarity = Math.min(100, Math.round(avgWordCount * 3.5));

  const contentQualityScore = Math.round(
    ((hasTitle ? 30 : 0) +
      (hasDescription ? 20 : 0) +
      (titleQuality === "good" ? 20 : titleQuality === "generic" ? 10 : 0) +
      (hasFocus ? 15 : 0) +
      (hasDifficulty ? 10 : 0) +
      (hasDuration ? 5 : 0)) /
      1
  );

  const content_quality = {
    has_title: hasTitle,
    is_generic_title: isGeneric,
    has_description: hasDescription,
    has_focus: hasFocus,
    focus_is_valid: focusIsValid,
    has_difficulty: hasDifficulty,
    has_duration: hasDuration,
    title_quality: titleQuality,
    instructions_clarity: instructionsClarity,
    overall_score: contentQualityScore,
  };

  // ═══════════════════════════════════════════════════════
  // ALERT SUMMARY
  // ═══════════════════════════════════════════════════════

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  const alertsSummary = {
    critical_count: criticalCount,
    warning_count: warningCount,
    info_count: infoCount,
    has_critical: criticalCount > 0,
    has_warning: warningCount > 0,
    items: alerts,
  };

  // ═══════════════════════════════════════════════════════
  // OVERALL SCORE
  // ═══════════════════════════════════════════════════════

  const overallScore = computeOverallScore(alerts);

  return {
    schema_version: QA_SCHEMA_VERSION,
    overall_score: overallScore,
    computed_at: toQATimestamp(computedAt),
    generation,
    image_generation,
    exercise_quality,
    structure,
    personalization,
    content_quality,
    alerts: alertsSummary,
  };
}
