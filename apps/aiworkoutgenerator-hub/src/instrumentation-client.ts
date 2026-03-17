// Initialize Sentry for client-side error tracking (optional)
import * as Sentry from "@sentry/nextjs";
import "../sentry.client.config";

// Required by Sentry SDK for navigation instrumentation (App Router)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import posthog from "posthog-js";

// PostHog is optional analytics - only initialize if configured
// This allows the app to work in development without PostHog configured
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (posthogKey && posthogHost) {
  try {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2025-11-30",
    });
  } catch (error) {
    // PostHog is optional, so we continue without it
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[PostHog] Failed to initialize PostHog analytics:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
} else if (process.env.NODE_ENV === "development") {
  console.warn(
    "[PostHog] PostHog analytics not configured. Set NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST to enable analytics."
  );
}
