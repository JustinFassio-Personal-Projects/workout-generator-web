"use client";

import { useEffect, useRef, useState } from "react";

import type { WorkoutPlayerSurface } from "@/contexts/WorkoutAnalyticsAttemptContext";
import { logUserActivity } from "@/lib/user-activity-logger";
import { clearGenerationIdForWorkout } from "@/lib/workout-generation-analytics-storage";

/** Cap replay attempts when `workout:open` does not persist (offline, 5xx, etc.). */
const MAX_WORKOUT_OPEN_ATTEMPTS = 5;

type OpenAnalytics = {
  surface: WorkoutPlayerSurface;
  workoutAttemptId: string;
  generationId: string | null;
};

/**
 * Fires `workout:open` once per successful persist for the loaded workout document.
 * Retries up to {@link MAX_WORKOUT_OPEN_ATTEMPTS} times when `logUserActivity` returns false.
 * Clears generation sessionStorage only after a persisted open.
 */
export function useLogWorkoutOpenActivity(args: {
  workoutRouteId: string;
  workoutDocumentId: string | undefined;
  userId: string | undefined;
  workoutInitialLoad: boolean;
  sessionId: string | undefined;
  analytics: OpenAnalytics | null;
  surfaceLegacy?: string;
}): void {
  const {
    workoutRouteId,
    workoutDocumentId,
    userId,
    workoutInitialLoad,
    sessionId,
    analytics,
    surfaceLegacy,
  } = args;

  const persistedForDocIdRef = useRef<string | null>(null);
  const inFlightDocIdRef = useRef<string | null>(null);
  const failedAttemptsRef = useRef(0);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    persistedForDocIdRef.current = null;
    inFlightDocIdRef.current = null;
    failedAttemptsRef.current = 0;
    setRetryNonce(0);
  }, [workoutDocumentId]);

  useEffect(() => {
    if (!analytics || !workoutDocumentId || !userId || workoutInitialLoad)
      return;
    if (persistedForDocIdRef.current === workoutDocumentId) return;
    if (inFlightDocIdRef.current === workoutDocumentId) return;
    if (failedAttemptsRef.current >= MAX_WORKOUT_OPEN_ATTEMPTS) return;

    inFlightDocIdRef.current = workoutDocumentId;
    let cancelled = false;

    void logUserActivity(
      userId,
      "workout:open",
      "workout",
      workoutRouteId,
      {
        surface: analytics.surface,
        workout_attempt_id: analytics.workoutAttemptId,
        ...(surfaceLegacy ? { surface_legacy: surfaceLegacy } : {}),
        ...(analytics.generationId
          ? { generation_id: analytics.generationId }
          : {}),
      },
      {
        sessionId: sessionId || undefined,
        workoutAttemptId: analytics.workoutAttemptId,
        ...(analytics.generationId
          ? { generationId: analytics.generationId }
          : {}),
      }
    )
      .then((persisted) => {
        if (cancelled) {
          inFlightDocIdRef.current = null;
          return;
        }
        inFlightDocIdRef.current = null;
        if (persisted) {
          persistedForDocIdRef.current = workoutDocumentId;
          clearGenerationIdForWorkout(workoutRouteId);
        } else if (failedAttemptsRef.current < MAX_WORKOUT_OPEN_ATTEMPTS) {
          failedAttemptsRef.current += 1;
          setRetryNonce((n) => n + 1);
        }
      })
      .catch(() => {
        if (cancelled) {
          inFlightDocIdRef.current = null;
          return;
        }
        inFlightDocIdRef.current = null;
        if (failedAttemptsRef.current < MAX_WORKOUT_OPEN_ATTEMPTS) {
          failedAttemptsRef.current += 1;
          setRetryNonce((n) => n + 1);
        }
      });

    return () => {
      cancelled = true;
      // Allow a following effect (e.g. React Strict Mode remount) to start a new attempt;
      // may produce duplicate `workout:open` in dev-only double-invoke scenarios.
      inFlightDocIdRef.current = null;
    };
  }, [
    analytics,
    workoutDocumentId,
    userId,
    workoutInitialLoad,
    workoutRouteId,
    sessionId,
    surfaceLegacy,
    retryNonce,
  ]);
}
