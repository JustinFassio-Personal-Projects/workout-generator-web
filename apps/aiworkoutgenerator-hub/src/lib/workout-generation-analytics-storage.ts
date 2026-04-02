/**
 * Bridges `generation_id` from the generate flow to player routes. Workout details
 * navigates to `/workouts/[id]/player` without query params, so we persist the id
 * in sessionStorage keyed by workout id.
 *
 * Read with `getGenerationIdForWorkout` (peek) for open/start/complete. Call
 * `clearGenerationIdForWorkout` only after `workout:open` **persists** (`logUserActivity` returns true) so library re-opens
 * do not reuse a stale id (and so React Strict Mode remounts still see the value
 * until open is logged once).
 */

const storageKey = (workoutId: string) => `wg_generation_id:${workoutId}`;

export function setGenerationIdForWorkout(
  workoutId: string,
  generationId: string
): void {
  if (typeof window === "undefined" || !workoutId.trim()) return;
  try {
    window.sessionStorage.setItem(storageKey(workoutId), generationId);
  } catch {
    /* quota or private mode */
  }
}

/** Non-destructive read for analytics payloads until `clearGenerationIdForWorkout`. */
export function getGenerationIdForWorkout(workoutId: string): string | null {
  if (typeof window === "undefined" || !workoutId.trim()) return null;
  try {
    const value = window.sessionStorage.getItem(storageKey(workoutId));
    return value != null && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function clearGenerationIdForWorkout(workoutId: string): void {
  if (typeof window === "undefined" || !workoutId.trim()) return;
  try {
    window.sessionStorage.removeItem(storageKey(workoutId));
  } catch {
    /* ignore */
  }
}
