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

const storageKey = (normalizedWorkoutId: string) =>
  `wg_generation_id:${normalizedWorkoutId}`;

export function setGenerationIdForWorkout(
  workoutId: string,
  generationId: string
): void {
  const id = workoutId.trim();
  if (typeof window === "undefined" || !id) return;
  try {
    window.sessionStorage.setItem(storageKey(id), generationId);
  } catch {
    /* quota or private mode */
  }
}

/** Non-destructive read for analytics payloads until `clearGenerationIdForWorkout`. */
export function getGenerationIdForWorkout(workoutId: string): string | null {
  const id = workoutId.trim();
  if (typeof window === "undefined" || !id) return null;
  try {
    const value = window.sessionStorage.getItem(storageKey(id));
    return value != null && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function clearGenerationIdForWorkout(workoutId: string): void {
  const id = workoutId.trim();
  if (typeof window === "undefined" || !id) return;
  try {
    window.sessionStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
}
