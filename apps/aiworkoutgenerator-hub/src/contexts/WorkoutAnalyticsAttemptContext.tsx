"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { getGenerationIdForWorkout } from "@/lib/workout-generation-analytics-storage";

/** Logged in `details.surface` for workout player analytics (admin journey). */
export type WorkoutPlayerSurface =
  | "workout_player"
  | "simple_player"
  | "mobile_player";

const WorkoutAnalyticsAttemptContext = createContext<{
  workoutAttemptId: string;
  surface: WorkoutPlayerSurface;
  generationId: string | null;
} | null>(null);

/**
 * One UUID per mount for correlating workout:open → workout:start → workout:complete.
 * Remount when route `workoutId` changes (use `key={workoutId}` on the provider).
 */
export function WorkoutAnalyticsAttemptProvider({
  workoutId: _workoutId,
  surface,
  children,
}: {
  workoutId: string;
  surface: WorkoutPlayerSurface;
  children: ReactNode;
}) {
  const workoutAttemptId = useMemo(() => crypto.randomUUID(), [_workoutId]);

  const generationId = useMemo(
    () => (_workoutId ? getGenerationIdForWorkout(_workoutId) : null),
    [_workoutId]
  );

  const value = useMemo(
    () => ({
      workoutAttemptId,
      surface,
      generationId,
    }),
    [workoutAttemptId, surface, generationId]
  );

  return (
    <WorkoutAnalyticsAttemptContext.Provider value={value}>
      {children}
    </WorkoutAnalyticsAttemptContext.Provider>
  );
}

export function useWorkoutAnalyticsAttempt(): {
  workoutAttemptId: string;
  surface: WorkoutPlayerSurface;
  generationId: string | null;
} | null {
  return useContext(WorkoutAnalyticsAttemptContext);
}
