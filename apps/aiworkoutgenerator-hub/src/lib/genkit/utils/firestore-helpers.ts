/**
 * Shared utility functions for Genkit flows to ensure Firestore compatibility.
 */

/**
 * Recursively removes undefined values from a value to make it Firestore-compatible.
 * Firestore doesn't accept undefined values anywhere in nested data.
 *
 * @param value - The value to clean (can be any type)
 * @returns The cleaned value with all undefined values removed
 *
 * @example
 * ```typescript
 * const dirty = { a: 1, b: undefined, c: { d: 2, e: undefined } };
 * const clean = removeUndefined(dirty);
 * // Result: { a: 1, c: { d: 2 } }
 * ```
 */
export function removeUndefined<T>(value: T): T {
  // Handle arrays by recursively cleaning each element
  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined);
    return cleanedArray as unknown as T;
  }
  // Handle non-null objects by recursively cleaning each property
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (entryValue === undefined) {
        continue;
      }
      const cleaned = removeUndefined(entryValue);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result as unknown as T;
  }
  // Primitive (or null) values are returned as-is
  return value;
}
