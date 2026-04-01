import type { TrainerWorkout } from "@/types/firestore";

/**
 * Exercise-level completion: fraction of exercises with `completed === true`,
 * rounded to nearest 10% (same rule as CompletionModal).
 */
export function getExerciseCompletionPercentRounded(
  workout: TrainerWorkout | null | undefined
): number {
  if (!workout?.sections?.length) return 100;

  let total = 0;
  let completed = 0;

  workout.sections.forEach((section) => {
    (section.exercises || []).forEach((exercise) => {
      total++;
      if (exercise.completed === true) completed++;
    });
  });

  if (total === 0) return 100;
  const pct = Math.round((completed / total) * 100);
  return Math.round(pct / 10) * 10;
}

export function countExercisesCompleted(
  workout: TrainerWorkout | null | undefined
): { completed: number; total: number } {
  if (!workout?.sections?.length) return { completed: 0, total: 0 };
  let total = 0;
  let completed = 0;
  workout.sections.forEach((section) => {
    (section.exercises || []).forEach((exercise) => {
      total++;
      if (exercise.completed === true) completed++;
    });
  });
  return { completed, total };
}
