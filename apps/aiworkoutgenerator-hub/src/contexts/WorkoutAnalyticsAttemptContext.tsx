"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/** Logged in `details.surface` for workout player analytics (admin journey). */
export type WorkoutPlayerSurface =
  | "workout_player"
  | "simple_player"
  | "mobile_player";

const WorkoutAnalyticsAttemptContext = createContext<{
  workoutAttemptId: string;
  surface: WorkoutPlayerSurface;
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

  const value = useMemo(
    () => ({ workoutAttemptId, surface }),
    [workoutAttemptId, surface]
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
} | null {
  return useContext(WorkoutAnalyticsAttemptContext);
}
