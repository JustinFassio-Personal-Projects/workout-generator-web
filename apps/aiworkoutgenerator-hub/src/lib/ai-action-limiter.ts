import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "./firebase-admin";
import { getUserTier } from "./api-utils";
import {
  getAIActionLimit,
  type SubscriptionTier,
  type AIActionType,
} from "./subscription-constants";
import { logger } from "./logger";

const COLLECTION = "ai_usage_counters";

export interface AIActionRateLimitResult {
  allowed: boolean;
  tier: SubscriptionTier;
  /** Remaining actions after this one. null = unlimited. */
  remaining: number | null;
  /** Optional reason for denial (e.g. per-workout cap on Coach Explain). */
  reason?: string;
}

/**
 * Unified AI Action rate limiter.
 *
 * ALL AI actions (edit, swap, add, coach explain, interval timer, order check)
 * share a single counter per user:
 *   - Free tier:  `${uid}_ai_actions_lifetime`  (never resets)
 *   - Paid tiers: `${uid}_ai_actions_${year}_${month}` (monthly)
 *
 * Uses Firestore transactions for atomic check-and-increment.
 *
 * @param uid       Firebase user ID
 * @param action    Which AI action is being performed (for logging)
 * @param routeName Route name for logging context
 */
export async function checkAIActionRateLimit(
  uid: string,
  action: AIActionType,
  routeName: string
): Promise<AIActionRateLimitResult> {
  const tier = await getUserTier(uid);
  const limit = getAIActionLimit(tier);

  // Unlimited tiers
  if (limit === null) {
    return { allowed: true, tier, remaining: null };
  }

  // Defensive: 0 means no access
  if (limit === 0) {
    return { allowed: false, tier, remaining: 0 };
  }

  // --- Free tier: lifetime counter ---
  // NOTE: Single unified doc (no migration from legacy per-action counters). If Firestore
  // ever contained per-action docs (e.g. uid_ai_edit_*, uid_ai_swap_*), a one-time seed
  // on first read could sum those and set this doc's count before incrementing.
  if (tier === "free") {
    const docId = `${uid}_ai_actions_lifetime`;
    const ref = adminDb.collection(COLLECTION).doc(docId);

    try {
      const result = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const currentCount = snap.data()?.count || 0;

        if (currentCount >= limit) {
          return { allowed: false as const, remaining: 0 };
        }

        const newCount = currentCount + 1;

        if (snap.exists) {
          tx.update(ref, {
            count: FieldValue.increment(1),
            last_updated: FieldValue.serverTimestamp(),
          });
        } else {
          tx.set(ref, {
            user_id: uid,
            counter_type: "ai_actions_lifetime",
            tier,
            count: 1,
            created_at: FieldValue.serverTimestamp(),
            last_updated: FieldValue.serverTimestamp(),
          });
        }

        return {
          allowed: true as const,
          remaining: Math.max(0, limit - newCount),
        };
      });

      return { ...result, tier };
    } catch (error) {
      logger.error(
        `[AI Action] Error enforcing free-tier lifetime limit`,
        error,
        { route: routeName, action }
      );
      // Fail closed
      return { allowed: false, tier, remaining: 0 };
    }
  }

  // --- Paid tiers: monthly counter ---
  // NOTE: Single unified doc per user/month. We do not migrate or seed from any existing
  // per-action monthly counters; a one-time seed step could incorporate earlier-in-month
  // usage into this doc before incrementing if legacy counter docs exist (see free-tier NOTE).
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const docId = `${uid}_ai_actions_${year}_${month}`;
  const ref = adminDb.collection(COLLECTION).doc(docId);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const currentCount = snap.data()?.count || 0;

      if (currentCount >= limit) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }

      const newCount = currentCount + 1;

      if (snap.exists) {
        tx.update(ref, {
          count: FieldValue.increment(1),
          last_updated: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(ref, {
          user_id: uid,
          counter_type: "ai_actions_monthly",
          year,
          month,
          tier,
          count: 1,
          created_at: FieldValue.serverTimestamp(),
          last_updated: FieldValue.serverTimestamp(),
        });
      }

      return {
        allowed: true as const,
        remaining: Math.max(0, limit - newCount),
      };
    });

    return { ...result, tier };
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      // Re-read for accurate remaining
      const snap = await ref.get();
      const currentCount = snap.exists ? snap.data()?.count || 0 : 0;
      return {
        allowed: false,
        tier,
        remaining: Math.max(0, limit - currentCount),
      };
    }

    // Fallback: read counter doc without increment (logs can undercount since counter
    // is incremented before the flow and before usage log is written)
    logger.warn(
      "AI action rate limit transaction failed, using fallback counter doc",
      error,
      { route: routeName, action }
    );
    const snap = await ref.get();
    const currentCount = snap.exists ? snap.data()?.count || 0 : 0;
    return {
      allowed: currentCount < limit,
      tier,
      remaining: Math.max(0, limit - currentCount),
    };
  }
}

/**
 * Build a tier-aware error message when an AI action limit is reached.
 * Derives numbers from getAIActionLimit() so messaging stays in sync with enforced limits.
 */
export function buildLimitReachedMessage(
  tier: SubscriptionTier,
  actionLabel: string
): string {
  const limit = getAIActionLimit(tier);
  const current = limit ?? 0;
  switch (tier) {
    case "free": {
      const nextLimit = getAIActionLimit("basic");
      const nextStr =
        nextLimit !== null ? `${nextLimit} AI Actions/month` : "more";
      return `You've used all of your free AI Actions (${current} lifetime total). Upgrade to Basic for ${nextStr}.`;
    }
    case "basic": {
      const nextLimit = getAIActionLimit("pro");
      return `You've reached your monthly limit of ${current} AI Actions. Upgrade to Pro for ${nextLimit ?? 0}/month.`;
    }
    case "pro": {
      const nextLimit = getAIActionLimit("elite");
      return `You've reached your monthly limit of ${current} AI Actions. Upgrade to Elite for ${nextLimit ?? 0}/month.`;
    }
    case "elite": {
      return `You've reached your monthly limit of ${current} AI Actions. Upgrade to Coach for unlimited.`;
    }
    default:
      return `You've reached your ${actionLabel} limit.`;
  }
}
