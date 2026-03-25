import type { TrainerWorkoutExercise } from "@/types/firestore";

/** True if at least one set is marked completed (for exercise-level completion validation). */
export function exerciseHasCompletedSet(
  exercise: TrainerWorkoutExercise | undefined
): boolean {
  return exercise?.setDetails?.some((s) => s.completed === true) ?? false;
}
