/**
 * Server-side presence write throttle: skip if last write was within minIntervalMs.
 * Uses wall-clock ms for "now" (route runs on server).
 */
export const PRESENCE_MIN_INTERVAL_MS = 60_000;

export function shouldSkipPresenceWrite(
  prevLastSeenMs: number | null,
  nowMs: number,
  minIntervalMs: number = PRESENCE_MIN_INTERVAL_MS
): boolean {
  if (prevLastSeenMs === null || !Number.isFinite(prevLastSeenMs)) {
    return false;
  }
  // If Firestore last_seen is ahead of server wall clock (skew), do not skip — negative delta
  // would otherwise keep skipping until the gap closes.
  if (nowMs <= prevLastSeenMs) {
    return false;
  }
  return nowMs - prevLastSeenMs < minIntervalMs;
}
