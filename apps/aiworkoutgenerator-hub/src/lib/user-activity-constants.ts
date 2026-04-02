/**
 * Shared limits for user activity logging — safe to import from API routes
 * (no client Firebase SDK). Keep in sync with admin Firestore query validation
 * where the same cap is applied.
 */
/** UUID v4 is 36 chars; 64 allows headroom for prefixed or composite ids. */
export const WORKOUT_ATTEMPT_ID_MAX_LEN = 64;

/** Same cap as `workout_attempt_id` for optional top-level `generation_id` (admin generation-scoped journeys). */
export const GENERATION_ID_MAX_LEN = WORKOUT_ATTEMPT_ID_MAX_LEN;
