/**
 * Development-only logging. Avoids writing full Error objects (and stacks) to
 * production browser consoles.
 */
export function devLogError(context: string, error: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";
  console.error(`[${context}]`, message);
}

export function devWarn(message: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(message);
}
