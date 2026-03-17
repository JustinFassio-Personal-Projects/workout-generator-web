import Stripe from "stripe";
import {
  WORKOUT_LIMITS,
  RECIPE_LIMITS,
  type SubscriptionTier,
} from "./subscription-constants";
import { logger } from "./logger";

// Re-export for convenience
export type { SubscriptionTier };

/**
 * Check if Stripe is configured.
 * Returns false if STRIPE_SECRET_KEY is not set.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Check if Stripe is using test mode (test keys) or live mode (live keys).
 * Returns true if using test keys (sk_test_... or pk_test_...), false if live keys.
 * Returns null if keys are not set or invalid.
 */
export function isStripeTestMode(): boolean | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Check secret key first (most reliable)
  if (secretKey) {
    if (secretKey.startsWith("sk_test_")) return true;
    if (secretKey.startsWith("sk_live_")) return false;
  }

  // Fall back to publishable key
  if (publishableKey) {
    if (publishableKey.startsWith("pk_test_")) return true;
    if (publishableKey.startsWith("pk_live_")) return false;
  }

  // No keys set or invalid format
  return null;
}

/**
 * Server-side Stripe client instance (lazy loaded).
 *
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 *
 * Use this in:
 * - API routes for creating checkout sessions
 * - Webhook handlers
 * - Server-side subscription management
 *
 * Note: Returns null if STRIPE_SECRET_KEY is not configured.
 * Check isStripeConfigured() before calling API routes that require Stripe.
 */
let stripeInstance: Stripe | null = null;

export function getStripeServer(): Stripe | null {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      // Return null instead of throwing during build time
      // This allows the app to build without Stripe configured
      logger.warn("STRIPE_SECRET_KEY not set. Stripe features disabled.", {
        function: "getStripeServer",
      });
      return null;
    }

    // Check if using live keys in development and warn
    const isTestMode = isStripeTestMode();
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment && isTestMode === false) {
      logger.warn(
        "⚠️  Stripe LIVE keys detected in development! Switch to test mode for safe testing.",
        {
          function: "getStripeServer",
          mode: "LIVE",
          recommendation:
            "Update STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to use test keys (sk_test_... and pk_test_...)",
        }
      );
    } else if (isDevelopment && isTestMode === true) {
      logger.info("✅ Stripe test mode enabled in development", {
        function: "getStripeServer",
        mode: "TEST",
      });
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Get the Stripe server instance, throwing if not configured.
 * Use this in API routes after checking isStripeConfigured().
 */
function getStripeServerOrThrow(): Stripe {
  const instance = getStripeServer();
  if (!instance) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return instance;
}

// For backwards compatibility - use getStripeServer() for lazy initialization
export const stripe = {
  get customers() {
    return getStripeServerOrThrow().customers;
  },
  get checkout() {
    return getStripeServerOrThrow().checkout;
  },
  get billingPortal() {
    return getStripeServerOrThrow().billingPortal;
  },
  get subscriptions() {
    return getStripeServerOrThrow().subscriptions;
  },
  get webhooks() {
    return getStripeServerOrThrow().webhooks;
  },
  get prices() {
    return getStripeServerOrThrow().prices;
  },
};

/**
 * Subscription tier configuration.
 * Maps Stripe price IDs to internal tier names.
 * Uses shared WORKOUT_LIMITS and RECIPE_LIMITS for consistency.
 * NOTE: WORKOUT_LIMITS semantics:
 *   - free: lifetime total (no reset)
 *   - basic/pro/elite/coach/coach_pro: monthly
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    features: {
      workoutsPerMonth: WORKOUT_LIMITS.free,
      recipesPerMonth: RECIPE_LIMITS.free,
      calendarScheduling: false,
      coachAccess: false,
      prioritySupport: false,
    },
  },
  basic: {
    name: "Basic",
    price: 5.99,
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: {
      workoutsPerMonth: WORKOUT_LIMITS.basic,
      recipesPerMonth: RECIPE_LIMITS.basic,
      calendarScheduling: false,
      coachAccess: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: "Pro",
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      workoutsPerMonth: WORKOUT_LIMITS.pro,
      recipesPerMonth: RECIPE_LIMITS.pro,
      calendarScheduling: true,
      coachAccess: false,
      prioritySupport: false,
    },
  },
  elite: {
    name: "Elite",
    price: 49,
    priceId: process.env.STRIPE_ELITE_PRICE_ID,
    features: {
      workoutsPerMonth: WORKOUT_LIMITS.elite,
      recipesPerMonth: RECIPE_LIMITS.elite,
      calendarScheduling: true,
      coachAccess: true,
      prioritySupport: true,
    },
  },
  coach: {
    name: "Coach",
    price: 99,
    priceId: process.env.STRIPE_COACH_PRICE_ID,
    features: {
      workoutsPerMonth: WORKOUT_LIMITS.coach,
      recipesPerMonth: RECIPE_LIMITS.coach,
      calendarScheduling: true,
      coachAccess: true,
      prioritySupport: true,
    },
  },
  coach_pro: {
    name: "Coach Pro",
    price: 199,
    priceId: process.env.STRIPE_COACH_PRO_PRICE_ID,
    features: {
      workoutsPerMonth: WORKOUT_LIMITS.coach_pro,
      recipesPerMonth: RECIPE_LIMITS.coach_pro,
      calendarScheduling: true,
      coachAccess: true,
      prioritySupport: true,
    },
  },
} as const;

/**
 * Get the tier name from a Stripe price ID.
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === SUBSCRIPTION_TIERS.basic.priceId) return "basic";
  if (priceId === SUBSCRIPTION_TIERS.pro.priceId) return "pro";
  if (priceId === SUBSCRIPTION_TIERS.elite.priceId) return "elite";
  if (priceId === SUBSCRIPTION_TIERS.coach.priceId) return "coach";
  if (priceId === SUBSCRIPTION_TIERS.coach_pro.priceId) return "coach_pro";
  logger.warn("Unknown Stripe priceId passed to getTierFromPriceId", {
    priceId,
    function: "getTierFromPriceId",
  });
  return "free";
}

/**
 * Get the workout limit for a tier.
 * free: lifetime total, basic/pro/elite/coach/coach_pro: monthly.
 */
export function getWorkoutLimit(tier: SubscriptionTier): number | null {
  return SUBSCRIPTION_TIERS[tier].features.workoutsPerMonth;
}
