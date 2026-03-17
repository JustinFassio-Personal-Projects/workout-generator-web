/**
 * Shared subscription tier constants.
 *
 * This file contains constants that need to be shared between
 * client-side hooks and server-side API routes.
 */

export type SubscriptionTier =
  | "free"
  | "basic"
  | "pro"
  | "elite"
  | "coach"
  | "coach_pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | null;

/**
 * Workout limits by subscription tier.
 * free: lifetime total (no reset), basic/pro/elite/coach/coach_pro: monthly
 */
export const WORKOUT_LIMITS: Record<SubscriptionTier, number | null> = {
  free: 5,
  basic: 20,
  pro: 50,
  elite: 50,
  coach: 50,
  coach_pro: 50,
};

/**
 * Monthly recipe limits by subscription tier.
 * null = unlimited
 */
export const RECIPE_LIMITS: Record<SubscriptionTier, number | null> = {
  free: 5,
  basic: 20,
  pro: 50,
  elite: null,
  coach: null,
  coach_pro: null,
};

/**
 * Get the workout limit for a tier.
 */
export function getWorkoutLimit(tier: SubscriptionTier): number | null {
  return WORKOUT_LIMITS[tier];
}

/**
 * Get the recipe limit for a tier.
 */
export function getRecipeLimit(tier: SubscriptionTier): number | null {
  return RECIPE_LIMITS[tier];
}

// ============================================
// Unified AI Actions — Single Source of Truth
// ============================================

/**
 * Unified AI Action limits by subscription tier.
 * null = unlimited
 *
 * This is the SINGLE SOURCE OF TRUTH for all AI action limits.
 * Every AI action (edit, swap, add, coach explain, interval timer,
 * order check) draws from this one shared pool.
 *
 * Free tier: lifetime total (no monthly reset)
 * Paid tiers: monthly limits (resets each calendar month)
 */
export const AI_ACTION_LIMITS: Record<SubscriptionTier, number | null> = {
  free: 10, // 10 lifetime total across ALL AI actions
  basic: 100, // 100/month
  pro: 500, // 500/month
  elite: 1000, // 1,000/month
  coach: null, // Unlimited
  coach_pro: null,
};

/**
 * Get the AI action limit for a tier.
 */
export function getAIActionLimit(tier: SubscriptionTier): number | null {
  return AI_ACTION_LIMITS[tier];
}

// ============================================
// Deprecated aliases (backward compatibility)
// ============================================

/**
 * AI edit limits by subscription tier.
 * null = unlimited
 *
 * @deprecated Use AI_ACTION_LIMITS instead. All AI actions now share a single
 * unified pool. Kept for backward compatibility with any external references.
 */
export const AI_EDIT_LIMITS: Record<SubscriptionTier, number | null> =
  AI_ACTION_LIMITS;

/**
 * AI swap limits by subscription tier.
 * null = unlimited
 *
 * @deprecated Use AI_ACTION_LIMITS instead. All AI actions now share a single
 * unified pool. Kept for backward compatibility with any external references.
 */
export const AI_SWAP_LIMITS: Record<SubscriptionTier, number | null> =
  AI_ACTION_LIMITS;

/**
 * @deprecated Use getAIActionLimit() instead.
 */
export function getAIEditLimit(tier: SubscriptionTier): number | null {
  return AI_ACTION_LIMITS[tier];
}

/**
 * @deprecated Use getAIActionLimit() instead.
 */
export function getAISwapLimit(tier: SubscriptionTier): number | null {
  return AI_ACTION_LIMITS[tier];
}

/**
 * Coach Explain limits by subscription tier.
 *
 * @deprecated Use AI_ACTION_LIMITS instead. Coach Explain now shares the
 * unified AI Actions pool with all other AI actions.
 */
export const COACH_EXPLAIN_LIMITS: Record<SubscriptionTier, number | null> =
  AI_ACTION_LIMITS;

/**
 * @deprecated Use getAIActionLimit() instead.
 */
export function getCoachExplainLimit(tier: SubscriptionTier): number | null {
  return AI_ACTION_LIMITS[tier];
}

/**
 * All AI action types that count against the unified pool.
 */
export type AIActionType =
  | "ai_edit"
  | "ai_swap"
  | "ai_add"
  | "coach_explain"
  | "ai_interval_timer"
  | "ai_order_check";
