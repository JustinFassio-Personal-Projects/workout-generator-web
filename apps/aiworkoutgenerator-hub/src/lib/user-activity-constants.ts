/**
 * Shared limits for user activity logging — safe to import from API routes
 * (no client Firebase SDK). Keep in sync with admin Firestore query validation
 * where the same cap is applied.
 */
/** UUID v4 is 36 chars; 64 allows headroom for prefixed or composite ids. */
export const WORKOUT_ATTEMPT_ID_MAX_LEN = 64;
