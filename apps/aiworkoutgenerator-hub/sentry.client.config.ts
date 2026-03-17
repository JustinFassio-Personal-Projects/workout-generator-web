import * as Sentry from "@sentry/nextjs";

// Sentry is optional - only initialize when DSN is set to avoid 403 on /monitoring and ERR_CONNECTION_REFUSED to Spotlight (8969).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";
const spotlightEnabled = process.env.NEXT_PUBLIC_SENTRY_SPOTLIGHT === "true";
const shouldInit = !!dsn && (isProduction || isDevelopment);

if (shouldInit) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Spotlight (localhost:8969) only when explicitly enabled so we don't get ERR_CONNECTION_REFUSED if not running.
    spotlight: isDevelopment && spotlightEnabled,

    // Set trace sample rate (100% for performance baseline during early-stage growth; reduce when traffic grows)
    tracesSampleRate: 1.0,

    // Send console.warn/error as Sentry logs (correlates with traces/errors); log excluded to reduce volume and PII risk
    enableLogs: true,
    integrations: [
      Sentry.replayIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
      Sentry.feedbackIntegration({ autoInject: false, colorScheme: "system" }),
    ],

    // Session Replay: capture 10% of all sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Redact sensitive data before sending
    beforeSend(event) {
      // Redact authorization headers
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = "[REDACTED]";
      }
      return event;
    },

    // Ignore known non-critical errors that create noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Load failed", // Network errors from image loading
    ],
  });
}
