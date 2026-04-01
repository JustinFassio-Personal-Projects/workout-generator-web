"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  adjustFocusAfterExerciseInsert,
  createEmptySession,
  getSegmentSeconds,
  getTotalSessionSeconds,
  parseStoredSession,
  reduceWrittenSession,
  serializeSession,
  storageKey,
  type WrittenSessionState,
} from "@/lib/workout/writtenSession";

/**
 * Written workout session: work/rest splits + localStorage persistence.
 * Timers tick once per second for display.
 */
export function useWrittenWorkoutSession(workoutId: string, userId: string) {
  const [state, setState] = useState<WrittenSessionState>(() =>
    createEmptySession(workoutId, userId)
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(storageKey(userId, workoutId));
    const parsed = parseStoredSession(raw);
    queueMicrotask(() => {
      if (parsed) {
        setState(
          reduceWrittenSession(
            createEmptySession(workoutId, userId),
            { type: "HYDRATE", payload: parsed },
            workoutId,
            userId
          )
        );
      } else {
        setState(createEmptySession(workoutId, userId));
      }
      setHydrated(true);
    });
  }, [workoutId, userId]);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey(userId, workoutId),
          serializeSession(state)
        );
      } catch {
        /* quota */
      }
    }, 300);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state, workoutId, userId, hydrated]);

  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalSeconds = getTotalSessionSeconds(state, nowMs);
  const segmentSeconds = getSegmentSeconds(state, nowMs);

  const startWorkout = useCallback(() => {
    const t = Date.now();
    setState((s) =>
      reduceWrittenSession(
        s,
        { type: "START_WORKOUT", now: t },
        workoutId,
        userId
      )
    );
    setNowMs(t);
  }, [workoutId, userId]);

  const lap = useCallback(
    (maxExerciseIndex: number) => {
      const t = Date.now();
      setState((s) =>
        reduceWrittenSession(
          s,
          { type: "LAP", now: t, maxExerciseIndex },
          workoutId,
          userId
        )
      );
      setNowMs(t);
    },
    [workoutId, userId]
  );

  const endSession = useCallback(() => {
    const t = Date.now();
    setState((s) =>
      reduceWrittenSession(
        s,
        { type: "END_SESSION", now: t },
        workoutId,
        userId
      )
    );
    setNowMs(t);
  }, [workoutId, userId]);

  const resetSession = useCallback(() => {
    const t = Date.now();
    setState(createEmptySession(workoutId, userId));
    setNowMs(t);
    try {
      localStorage.removeItem(storageKey(userId, workoutId));
    } catch {
      /* ignore */
    }
  }, [workoutId, userId]);

  /**
   * When an exercise is inserted at insertFlatIndex, bump focus if needed.
   * Pass total exercise count **before** the insert (so new max flat index = that count).
   */
  const bumpFocusAfterExerciseInsertAt = useCallback(
    (insertFlatIndex: number, exerciseCountBeforeInsert: number) => {
      const newMaxFlatIndex = exerciseCountBeforeInsert;
      setState((s) =>
        adjustFocusAfterExerciseInsert(s, insertFlatIndex, newMaxFlatIndex)
      );
    },
    []
  );

  return {
    state,
    hydrated,
    totalSeconds,
    segmentSeconds,
    startWorkout,
    lap,
    endSession,
    resetSession,
    bumpFocusAfterExerciseInsertAt,
  };
}
