/**
 * Sentry Error Tracking Utility
 *
 * Provides helper functions for capturing errors with standardized context.
 * Follows existing patterns in the codebase (similar to logger.ts and PostHog utilities).
 *
 * Features:
 * - Graceful degradation: Works without Sentry configured
 * - Standardized context: Consistent error tagging across API routes
 * - User context management: Track errors by user without PII
 *
 * Usage:
 *   captureApiError(error, { endpoint: "workout_generation", userId: uid });
 *   setUserContext(uid);
 *   clearUserContext();
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Check if Sentry is configured
 */
function isSentryConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * Increment a Sentry custom metric counter (for business KPIs / dashboards).
 * No-op when Sentry is not configured. Use attributes (e.g. tier, endpoint) for filtering in Sentry.
 *
 * @param name - Metric name (e.g. "workout.generated", "ai.failure")
 * @param value - Count to add (default 1)
 * @param attributes - Optional attributes for grouping (e.g. { tier: "pro", endpoint: "workout_generation" })
 */
export function incrementMetric(
  name: string,
  value?: number,
  attributes?: Record<string, string>
): void {
  if (!isSentryConfigured()) return;
  Sentry.metrics.count(
    name,
    value ?? 1,
    attributes ? { attributes } : undefined
  );
}

/**
 * Capture an API error with standardized context
 *
 * Follows existing logger.ts pattern for consistent error handling.
 * All errors are tagged with endpoint for easy filtering in Sentry dashboard.
 *
 * @param error - The error to capture
 * @param context - Context about the error
 * @param context.endpoint - The API endpoint name (e.g., "workout_generation", "stripe_checkout")
 * @param context.operation - Optional operation within the endpoint
 * @param context.userId - Optional user ID (non-PII identifier)
 * @param context.requestId - Optional request ID for correlation
 * @param context.extra - Optional additional context
 */
export function captureApiError(
  error: unknown,
  context: {
    endpoint: string;
    operation?: string;
    userId?: string;
    requestId?: string;
    extra?: Record<string, unknown>;
  }
): void {
  if (!isSentryConfigured()) return; // Graceful degradation like PostHog

  Sentry.captureException(error, {
    tags: {
      endpoint: context.endpoint,
      ...(context.operation && { operation: context.operation }),
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      ...(context.requestId && { requestId: context.requestId }),
      ...context.extra,
    },
  });
}

/**
 * Capture a message with context (for non-exception events)
 *
 * Use for tracking important events that aren't errors but should be monitored.
 *
 * @param message - The message to capture
 * @param level - Severity level
 * @param context - Optional context
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: {
    endpoint?: string;
    userId?: string;
    extra?: Record<string, unknown>;
  }
): void {
  if (!isSentryConfigured()) return;

  Sentry.captureMessage(message, {
    level,
    tags: context?.endpoint ? { endpoint: context.endpoint } : undefined,
    user: context?.userId ? { id: context.userId } : undefined,
    extra: context?.extra,
  });
}

/**
 * Set user context for Sentry
 *
 * Call this after authentication to associate errors with a user.
 * Only the user ID is sent (non-PII).
 *
 * @param userId - The user's unique identifier
 * @param traits - Optional additional traits (tier, etc.)
 */
export function setUserContext(
  userId: string,
  traits?: { tier?: string }
): void {
  if (!isSentryConfigured()) return;

  Sentry.setUser({
    id: userId,
    ...(traits?.tier && { subscription_tier: traits.tier }),
  });
}

/**
 * Clear user context
 *
 * Call this on logout to stop associating errors with a user.
 */
export function clearUserContext(): void {
  if (!isSentryConfigured()) return;

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 *
 * Breadcrumbs are trail of events leading up to an error.
 *
 * @param category - Category of the breadcrumb
 * @param message - Description of the event
 * @param data - Optional additional data
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isSentryConfigured()) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
  });
}

/**
 * Token usage for Sentry AI span (estimated or from provider).
 */
export type GenAIUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

/**
 * Options for withGenAISpan (Sentry AI Insights / gen_ai.request).
 */
export type WithGenAISpanOptions = {
  /** Operation name for gen_ai.operation.name (e.g. "generate_content"). */
  operationName: string;
  /** Model name for gen_ai.request.model. */
  model: string;
  /** AI system identifier (e.g. "gcp.gemini"). */
  system?: string;
  /** Request temperature. */
  temperature?: number;
  /** Request max output tokens. */
  maxTokens?: number;
  /** Optional flow name for filtering. */
  flowName?: string;
};

/**
 * Wraps an AI/LLM call in a Sentry span for AI Insights (performance, token usage, failures).
 * Use around Genkit ai.generate() so spans show in Sentry's AI Agents dashboard.
 *
 * The callback receives the span so it can set gen_ai.usage.* after the call (e.g. from
 * estimateTokenUsage). If Sentry is not configured, the callback runs without a span.
 *
 * @param options - Operation name, model, and optional request params
 * @param callback - Async function that performs the AI call; can call span.setAttribute for usage
 * @returns The result of the callback
 */
export async function withGenAISpan<T>(
  options: WithGenAISpanOptions,
  callback: (span: { setUsage: (usage: GenAIUsage) => void }) => Promise<T>
): Promise<T> {
  const {
    operationName,
    model,
    system = "gcp.gemini",
    temperature,
    maxTokens,
    flowName,
  } = options;

  if (!isSentryConfigured()) {
    return callback({
      setUsage: () => {},
    });
  }

  const op = `gen_ai.${operationName}` as const;
  const name = `${operationName} ${model}`;

  const attributes: Record<string, string | number | undefined> = {
    "gen_ai.operation.name": operationName,
    "gen_ai.request.model": model,
    "gen_ai.system": system,
  };
  if (temperature !== undefined)
    attributes["gen_ai.request.temperature"] = temperature;
  if (maxTokens !== undefined)
    attributes["gen_ai.request.max_tokens"] = maxTokens;
  if (flowName) attributes["gen_ai.agent.name"] = flowName;

  return Sentry.startSpan(
    {
      op,
      name,
      attributes,
    },
    async (span) => {
      const setUsage = (usage: GenAIUsage) => {
        span.setAttribute("gen_ai.usage.input_tokens", usage.inputTokens);
        span.setAttribute("gen_ai.usage.output_tokens", usage.outputTokens);
        span.setAttribute("gen_ai.usage.total_tokens", usage.totalTokens);
      };
      return callback({ setUsage });
    }
  );
}
