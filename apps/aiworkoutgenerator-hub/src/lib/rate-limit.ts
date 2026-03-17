import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "./firebase-admin";
import { logger } from "./logger";

const COLLECTION = "api_rate_limits";

/**
 * Endpoint keys for per-user, per-minute rate limiting.
 * Used by API routes when calling checkApiRateLimit(uid, endpoint).
 */
export type RateLimitEndpoint =
  | "workout_generation"
  | "generate_images"
  | "coach_explain"
  | "image_generate"
  | "biomechanical_analysis"
  | "ai_exercise_edit"
  | "ai_exercise_swap"
  | "ai_exercise_add"
  | "ai_exercise_apply"
  | "ai_exercise_apply_add"
  | "ai_exercise_apply_rating"
  | "ai_exercise_order_check"
  | "ai_interval_timer"
  | "default";

/**
 * Requests per user per minute by endpoint.
 * Costly/AI endpoints have lower limits; general API uses default.
 */
const ENDPOINT_LIMITS: Record<RateLimitEndpoint, number> = {
  workout_generation: 10,
  generate_images: 10,
  coach_explain: 15,
  image_generate: 10,
  biomechanical_analysis: 10,
  ai_exercise_edit: 15,
  ai_exercise_swap: 15,
  ai_exercise_add: 15,
  ai_exercise_apply: 15,
  ai_exercise_apply_add: 15,
  ai_exercise_apply_rating: 15,
  ai_exercise_order_check: 15,
  ai_interval_timer: 15,
  default: 30,
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number | null;
}

/**
 * Check per-user, per-endpoint rate limit using Firestore.
 * Uses a single transaction: read current count for the current minute window,
 * increment if under limit, and return allowed/retryAfter.
 *
 * @param uid - Firebase user ID (from verified ID token)
 * @param endpoint - Rate limit bucket (e.g. "workout_generation")
 * @param context - Optional context for logging (e.g. { requestId })
 * @returns { allowed: true, retryAfter: null } or { allowed: false, retryAfter: 60 }
 */
export async function checkApiRateLimit(
  uid: string,
  endpoint: RateLimitEndpoint,
  context?: { requestId?: string }
): Promise<RateLimitResult> {
  const minute = Math.floor(Date.now() / 60000);
  const docId = `${uid}_${endpoint}_${minute}`;
  const limit = ENDPOINT_LIMITS[endpoint] ?? ENDPOINT_LIMITS.default;
  const rateLimitRef = adminDb.collection(COLLECTION).doc(docId);

  try {
    const result = await adminDb.runTransaction<RateLimitResult>(
      async (transaction) => {
        const doc = await transaction.get(rateLimitRef);
        const currentCount = doc.exists
          ? (doc.data()?.count as number) || 0
          : 0;

        if (currentCount >= limit) {
          return { allowed: false, retryAfter: 60 };
        }

        transaction.set(
          rateLimitRef,
          {
            count: currentCount + 1,
            expires_at: Timestamp.fromMillis((minute + 2) * 60000),
          },
          { merge: true }
        );

        return { allowed: true, retryAfter: null };
      }
    );

    if (!result.allowed) {
      logger.warn("Rate limit exceeded", undefined, {
        endpoint,
        ...context,
      });
    }

    return result;
  } catch (error) {
    logger.error("Rate limit transaction failed", error, {
      endpoint,
      ...context,
    });
    // Fail open: allow request if Firestore is unavailable to avoid blocking all traffic
    return { allowed: true, retryAfter: null };
  }
}
