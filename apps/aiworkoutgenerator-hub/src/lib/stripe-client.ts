import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Client-side Stripe instance (lazy loaded).
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Your Stripe publishable key (pk_test_... or pk_live_...)
 *
 * Use this in:
 * - Client components for Stripe Elements integration (if needed later)
 */
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Check if Stripe publishable key is for test mode.
 */
function isPublishableKeyTestMode(key: string): boolean | null {
  if (key.startsWith("pk_test_")) return true;
  if (key.startsWith("pk_live_")) return false;
  return null;
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
      return Promise.resolve(null);
    }

    // Warn if using live keys in development (client-side)
    if (typeof window !== "undefined") {
      const isTestMode = isPublishableKeyTestMode(publishableKey);
      const isDevelopment = process.env.NODE_ENV === "development";

      if (isDevelopment && isTestMode === false) {
        console.warn(
          "⚠️  Stripe LIVE publishable key detected in development! Switch to test mode for safe testing."
        );
        console.warn(
          "Update NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to use a test key (pk_test_...)"
        );
      } else if (isDevelopment && isTestMode === true) {
        console.info("✅ Stripe test mode enabled in development");
      }
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

/**
 * Redirect to Stripe Checkout using the session URL.
 * This is the modern approach - use the URL returned from the checkout API.
 *
 * @param checkoutUrl - The checkout URL from the API response
 */
export function redirectToCheckoutUrl(checkoutUrl: string): void {
  window.location.href = checkoutUrl;
}
