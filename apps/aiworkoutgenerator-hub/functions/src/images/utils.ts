/**
 * Utility functions for image sync operations.
 */

/**
 * Trim exercise name for Firestore queries.
 * Exercise names in master_exercise_images are stored with exact match (trimmed only).
 * Use this for querying by exercise_name field.
 *
 * This must match the normalization used in both admin and hub repositories.
 */
export function trimExerciseName(name: string): string {
  return name.trim();
}

/**
 * Check if an error is transient and should be retried.
 * Firestore errors that are typically transient include:
 * - Rate limiting (RESOURCE_EXHAUSTED)
 * - Network issues (UNAVAILABLE, DEADLINE_EXCEEDED)
 * - Connection resets
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const code = (error as { code?: string }).code?.toLowerCase() || "";

  // Firestore error codes
  const transientCodes = [
    "resource_exhausted", // Rate limiting
    "unavailable", // Service unavailable
    "deadline_exceeded", // Timeout
    "aborted", // Transaction aborted (can retry)
    "internal", // Internal errors (sometimes transient)
  ];

  // Error message indicators
  const transientIndicators = [
    "network",
    "timeout",
    "unavailable",
    "deadline exceeded",
    "connection",
    "econnreset",
    "etimedout",
    "rate limit",
    "too many",
    "quota",
  ];

  return (
    transientCodes.some((c) => code.includes(c)) ||
    transientIndicators.some((indicator) => message.includes(indicator))
  );
}

/**
 * Retry a function with exponential backoff.
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 100)
 * @returns Result of the function
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's not a transient error
      if (!isTransientError(error)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt >= maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delay = initialDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
      const totalDelay = delay + jitter;

      console.log(
        `[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${Math.round(totalDelay)}ms:`,
        error instanceof Error ? error.message : String(error)
      );

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}
