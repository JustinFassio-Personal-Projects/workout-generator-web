"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { TrainerWorkout } from "@/types/firestore";

interface CompleteWorkoutFABProps {
  workout: TrainerWorkout | null;
  onClick: () => void;
}

function allExercisesComplete(workout: TrainerWorkout | null): boolean {
  if (!workout?.sections?.length) return false;
  for (const section of workout.sections) {
    const exercises = section.exercises ?? [];
    if (exercises.length === 0) return false;
    for (const ex of exercises) {
      if (ex.completed !== true) return false;
    }
  }
  return true;
}

export function CompleteWorkoutFAB({
  workout,
  onClick,
}: CompleteWorkoutFABProps) {
  const allComplete = useMemo(() => allExercisesComplete(workout), [workout]);

  // Only show FAB if workout exists and is not already completed
  if (!workout || workout.completed) {
    return null;
  }

  const baseClasses =
    "fixed bottom-20 left-1/2 -translate-x-1/2 z-40 font-semibold px-6 py-3 rounded-full shadow-lg transition-all sm:bottom-8 sm:z-50";

  return (
    <Button
      onClick={onClick}
      className={
        allComplete
          ? `${baseClasses} border-2 border-orange-400/50 bg-background/95 text-orange-400 dark:text-orange-400 hover:bg-orange-500/10 animate-breathe-orange-glow`
          : `${baseClasses} bg-orange-500 text-black hover:bg-orange-600 hover:shadow-xl`
      }
      aria-label="Complete Workout"
    >
      Complete Workout
    </Button>
  );
}
