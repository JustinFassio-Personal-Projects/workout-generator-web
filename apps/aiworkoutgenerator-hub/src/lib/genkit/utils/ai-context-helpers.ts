import type { TrainerWorkout, TrainerWorkoutExercise } from "@/types/firestore";
import type { AIEditContext } from "@/types/ai-exercise-editor";

/**
 * Build AIEditContext from workout data.
 * Extracts exercise, section, and user profile information needed for AI operations.
 *
 * @param workout - The workout containing the exercise
 * @param sectionIndex - Index of the section containing the exercise
 * @param exerciseIndex - Index of the exercise within the section
 * @returns AIEditContext with all necessary context for AI editing/swapping
 */
export function buildAIEditContext(
  workout: TrainerWorkout,
  sectionIndex: number,
  exerciseIndex: number
): AIEditContext {
  const section = workout.sections[sectionIndex];
  const exercise = section.exercises[exerciseIndex];

  // Extract user profile snapshot from generation context
  const profileSnapshot = workout.generation_context?.profile_snapshot;

  return {
    exercise,
    section_type: section.type,
    workout_focus: workout.focus,
    workout_difficulty: workout.difficulty,
    user_fitness_level:
      (profileSnapshot?.fitness_level as
        | "beginner"
        | "intermediate"
        | "advanced"
        | "athlete") || ("beginner" as const),
    user_injuries: profileSnapshot?.injuries || [],
    available_equipment: profileSnapshot?.available_equipment || [],
    adjacent_exercises: section.exercises
      .map((e, idx) => (idx !== exerciseIndex ? e.name : null))
      .filter((n): n is string => n !== null),
  };
}

/**
 * Deep equality comparison for values.
 * Handles primitives, arrays, and objects correctly.
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal, false otherwise
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Primitive comparison (including null and undefined)
  if (a === b) {
    return true;
  }

  // Handle null/undefined cases
  if (a == null || b == null) {
    return a === b;
  }

  // Type mismatch
  if (typeof a !== typeof b) {
    return false;
  }

  // Array comparison (order matters)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // Object comparison (order doesn't matter)
  if (
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      if (
        !deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      ) {
        return false;
      }
    }
    return true;
  }

  // Fallback for other types
  return false;
}

/**
 * Detect which fields were modified between previous and current exercise.
 * Only fields that are present (non-undefined) in `previous` are considered.
 *
 * @param previous - The previous exercise state (partial)
 * @param current - The current/modified exercise state
 * @returns Array of field names that were modified
 */
export function detectModifiedFields(
  previous: Partial<TrainerWorkoutExercise>,
  current: TrainerWorkoutExercise
): string[] {
  const modifiedFields: string[] = [];

  // Fields that can be compared with simple strict inequality
  const shallowFields: (keyof TrainerWorkoutExercise)[] = [
    "name",
    "sets",
    "detailedInstructions",
    "muscleTarget",
    "tempo",
    "image_url",
  ];

  // Fields that require deep comparison (arrays / nested structures)
  const deepFields: (keyof TrainerWorkoutExercise)[] = [
    "setDetails",
    "cues",
    "equipment_needed",
    "muscle_groups",
  ];

  for (const field of shallowFields) {
    const prevValue = previous[field];
    const currValue = current[field];
    if (prevValue !== undefined && prevValue !== currValue) {
      modifiedFields.push(field as string);
    }
  }

  for (const field of deepFields) {
    const prevValue = previous[field];
    const currValue = current[field];
    if (prevValue !== undefined && !deepEqual(prevValue, currValue)) {
      modifiedFields.push(field as string);
    }
  }

  return modifiedFields;
}
