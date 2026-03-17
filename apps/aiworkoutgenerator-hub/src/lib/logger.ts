/**
 * Environment-aware logging utility
 *
 * Follows existing codebase patterns (similar to getEnvAwareErrorMessage):
 * - Development: Logs full error details for debugging
 * - Production: Logs sanitized messages only (no stack traces, no sensitive data)
 *
 * Usage:
 *   logger.error("Operation failed", error, { context: "api/board/state" });
 *   logger.warn("Deprecated feature used", { feature: "old-api" });
 *   logger.info("Operation completed", { userId: "123" });
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Sanitize error object for production logging
 * Removes stack traces and sensitive data
 */
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // In production, only return the message, not the stack trace
    return error.message;
  }
  return String(error);
}

/**
 * Sanitize context object to remove sensitive fields
 */
function sanitizeContext(
  context?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const sensitiveKeysExact = ["key"];
  const sensitiveKeysSubstring = [
    "token",
    "password",
    "secret",
    "apikey",
    "api_key",
    "authorization",
    "auth",
    "credential",
    "private",
    "user_id",
    "userid", // catches userId (camelCase), user_id, uid
    "uid",
    "email",
    "bearer",
    "session",
    "cookie",
    "jwt",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive =
      sensitiveKeysExact.includes(lowerKey) ||
      sensitiveKeysSubstring.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive && !isDevelopment) {
      // For user_id, userId, and uid, show truncated version instead of full redaction
      if (
        (lowerKey === "user_id" ||
          lowerKey === "userid" ||
          lowerKey === "uid") &&
        typeof value === "string"
      ) {
        sanitized[key] =
          value.length > 8 ? `${value.slice(0, 8)}...` : "[REDACTED]";
      } else {
        sanitized[key] = "[REDACTED]";
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const logger = {
  /**
   * Log error messages
   * In production: Only logs message and sanitized context
   * In development: Logs full error details including stack traces
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const sanitizedContext = sanitizeContext(context);

    if (isDevelopment) {
      // Development: Full error details
      if (error) {
        console.error(`[ERROR] ${message}`, error, sanitizedContext || {});
      } else {
        console.error(`[ERROR] ${message}`, sanitizedContext || {});
      }
    } else {
      // Production: Sanitized only
      const errorMessage = error ? sanitizeError(error) : undefined;
      const logData: Record<string, unknown> = {
        message,
        ...(errorMessage && { error: errorMessage }),
        ...sanitizedContext,
      };
      console.error("[ERROR]", JSON.stringify(logData));
    }
  },

  /**
   * Log warning messages
   * In production: Only logs message and sanitized context
   * In development: Logs full error details including stack traces
   */
  warn(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const sanitizedContext = sanitizeContext(context);

    if (isDevelopment) {
      // Development: Full error details
      if (error) {
        console.warn(`[WARN] ${message}`, error, sanitizedContext || {});
      } else {
        console.warn(`[WARN] ${message}`, sanitizedContext || {});
      }
    } else {
      // Production: Sanitized only
      const errorMessage = error ? sanitizeError(error) : undefined;
      const logData: Record<string, unknown> = {
        message,
        ...(errorMessage && { error: errorMessage }),
        ...sanitizedContext,
      };
      console.warn("[WARN]", JSON.stringify(logData));
    }
  },

  /**
   * Log informational messages
   */
  info(message: string, context?: Record<string, unknown>): void {
    const sanitizedContext = sanitizeContext(context);

    if (isDevelopment) {
      console.log(`[INFO] ${message}`, sanitizedContext || {});
    } else {
      const logData: Record<string, unknown> = {
        message,
        ...sanitizedContext,
      };
      console.log("[INFO]", JSON.stringify(logData));
    }
  },

  /**
   * Log debug messages (development only)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (isDevelopment) {
      const sanitizedContext = sanitizeContext(context);
      console.log(`[DEBUG] ${message}`, sanitizedContext || {});
    }
    // No-op in production
  },
};
