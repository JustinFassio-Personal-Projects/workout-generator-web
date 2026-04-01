import type {
  TrainerSetDetail,
  TrainerWorkoutExercise,
  TrainerWorkoutSection,
  WorkoutSectionType,
} from "@/types/firestore";

const DEFAULT_SET_COUNT = 3;

function defaultSetRows(count: number): TrainerSetDetail[] {
  return Array.from({ length: count }, () => ({
    reps: "",
    weight: "",
    rest: "60s",
    actualWeight: "",
    notes: "",
  }));
}

/**
 * New user-authored exercise for manual insert/edit on the written sheet.
 */
export function createBlankTrainerExercise(
  overrides?: Partial<TrainerWorkoutExercise>
): TrainerWorkoutExercise {
  const setDetails =
    overrides?.setDetails && overrides.setDetails.length > 0
      ? structuredClone(overrides.setDetails)
      : defaultSetRows(DEFAULT_SET_COUNT);

  const base: TrainerWorkoutExercise = {
    name: "New exercise",
    sets: setDetails.length,
    muscleTarget: "General",
    tempo: null,
    cues: [],
    detailedInstructions: null,
    setDetails,
    equipment_needed: [],
    muscle_groups: [],
    completed: false,
  };

  const merged = { ...base, ...overrides, setDetails, sets: setDetails.length };
  return merged;
}

/**
 * New section with one blank exercise so the block is immediately usable.
 */
export function createEmptySection(
  type: WorkoutSectionType
): TrainerWorkoutSection {
  return {
    type,
    durationEstimate: "—",
    exercises: [createBlankTrainerExercise()],
  };
}
