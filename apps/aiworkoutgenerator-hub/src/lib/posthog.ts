/**
 * PostHog client-side utilities
 *
 * This file provides a typed wrapper around PostHog for easier usage
 * throughout the application.
 */

import posthog from "posthog-js";

/**
 * Capture a custom event with optional properties
 *
 * @param eventName - The name of the event
 * @param properties - Optional properties to attach to the event
 *
 * @example
 * ```tsx
 * import { captureEvent } from '@/lib/posthog'
 *
 * captureEvent('purchase_completed', { amount: 99, currency: 'USD' })
 * ```
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window !== "undefined") {
    posthog.capture(eventName, properties);
  }
}

/**
 * Identify a user with PostHog
 *
 * @param distinctId - The unique identifier for the user
 * @param properties - Optional user properties
 *
 * @example
 * ```tsx
 * import { identifyUser } from '@/lib/posthog'
 *
 * identifyUser('user-123', { email: 'user@example.com', plan: 'pro' })
 * ```
 */
export function identifyUser(
  distinctId: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window !== "undefined") {
    posthog.identify(distinctId, properties);
  }
}

/**
 * Reset user identification (useful for logout)
 */
export function resetUser(): void {
  if (typeof window !== "undefined") {
    posthog.reset();
  }
}

/**
 * Get the PostHog instance (for advanced usage)
 *
 * @returns The PostHog instance or undefined if not available
 */
export function getPostHog(): typeof posthog | undefined {
  if (typeof window !== "undefined") {
    return posthog;
  }
  return undefined;
}
