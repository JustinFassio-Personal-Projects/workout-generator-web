// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Align with client: env-based DSN, production-only init, no PII, same sampling
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === "production";

if (dsn && isProduction) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Match client: 100% of transactions for performance baseline during early-stage growth
    tracesSampleRate: 1.0,

    // Send console.warn/error as Sentry logs (correlates with traces/errors); log excluded to reduce volume and PII risk
    enableLogs: true,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],

    // Do not send PII by default; we only attach userId in captureApiError where needed
  });
}
