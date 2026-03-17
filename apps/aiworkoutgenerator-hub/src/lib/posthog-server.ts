/**
 * PostHog server-side utilities
 *
 * This file provides utilities for using PostHog in API routes and server actions.
 * Always call shutdown() after use to ensure events are flushed.
 */

import { PostHog } from "posthog-node";
import { getEnvAwareErrorMessage } from "@/lib/utils";

/**
 * Create a PostHog client instance for server-side usage
 *
 * @returns A PostHog client instance
 * @throws {Error} If PostHog environment variables are not configured
 *
 * @example
 * ```ts
 * import { createPostHogClient } from '@/lib/posthog-server'
 *
 * export async function POST(request: Request) {
 *   const posthog = createPostHogClient()
 *
 *   posthog.capture({
 *     distinctId: 'user-123',
 *     event: 'api_request',
 *     properties: { endpoint: '/api/workouts/generate' }
 *   })
 *
 *   await posthog.shutdown()
 * }
 * ```
 */
export function createPostHogClient(): PostHog {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    throw new Error(
      getEnvAwareErrorMessage(
        "NEXT_PUBLIC_POSTHOG_KEY environment variable is not set. Please add it to your .env.local file.",
        "NEXT_PUBLIC_POSTHOG_KEY environment variable is not configured. For Firebase App Hosting, ensure the 'posthog-key' secret is configured in Cloud Secret Manager."
      )
    );
  }

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!host) {
    throw new Error(
      getEnvAwareErrorMessage(
        "NEXT_PUBLIC_POSTHOG_HOST environment variable is not set. Please add it to your .env.local file.",
        "NEXT_PUBLIC_POSTHOG_HOST environment variable is not configured. For Firebase App Hosting, ensure the 'posthog-host' secret is configured in Cloud Secret Manager."
      )
    );
  }

  return new PostHog(apiKey, {
    host,
  });
}

/**
 * Capture an event on the server side
 *
 * This is a convenience function that creates a client, captures an event,
 * and shuts down automatically.
 *
 * @param distinctId - The unique identifier for the user
 * @param eventName - The name of the event
 * @param properties - Optional properties to attach to the event
 *
 * @example
 * ```ts
 * import { captureServerEvent } from '@/lib/posthog-server'
 *
 * await captureServerEvent('user-123', 'workout_generated', {
 *   workoutId: 'workout-456'
 * })
 * ```
 */
export async function captureServerEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const posthog = createPostHogClient();

  try {
    posthog.capture({
      distinctId,
      event: eventName,
      properties,
    });
  } finally {
    await posthog.shutdown();
  }
}
