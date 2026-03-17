/**
 * Next.js Server-Side Instrumentation
 *
 * This file is automatically loaded by Next.js to initialize
 * server-side instrumentation before any other code runs.
 *
 * Used for Sentry error tracking initialization on:
 * - Node.js runtime (API routes, Server Components)
 * - Edge runtime (Middleware)
 */

import * as Sentry from "@sentry/nextjs";

// Sentry: capture request errors (e.g. unhandled errors in route handlers)
export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
