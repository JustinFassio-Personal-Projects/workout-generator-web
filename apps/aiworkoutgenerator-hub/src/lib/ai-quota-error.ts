/**
 * Thrown when an AI workout API returns a plan/quota limit (403 or 429 with usage metadata).
 * This is expected UX, not an application failure — callers should open upgrade/pricing
 * without logging console.error (which triggers Next.js dev error overlays).
 */
export class AIQuotaExceededError extends Error {
  readonly code = "AI_QUOTA_EXCEEDED" as const;
  readonly tier?: string;
  /** Remaining AI actions in the current period; 0 when the limit is exhausted. */
  readonly remaining: number;

  constructor(
    message: string,
    options: { tier?: string; remaining?: number | null } = {}
  ) {
    super(message);
    this.name = "AIQuotaExceededError";
    this.tier = options.tier;
    this.remaining =
      typeof options.remaining === "number" ? options.remaining : 0;
  }

  static is(err: unknown): err is AIQuotaExceededError {
    return err instanceof AIQuotaExceededError;
  }
}
