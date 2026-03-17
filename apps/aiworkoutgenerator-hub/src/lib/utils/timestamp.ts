import type { Timestamp } from "firebase/firestore";

/**
 * Converts a Firestore Timestamp to a JavaScript Date object.
 * Handles both client SDK Timestamp (with toMillis) and server SDK Timestamp (with seconds).
 * Also handles plain objects with seconds/nanoseconds structure.
 *
 * @param timestamp - Firestore Timestamp, Date, or timestamp-like object
 * @returns JavaScript Date object, or epoch date (1970-01-01) if conversion fails
 * @note Returns epoch date (new Date(0)) for invalid/missing timestamps to make errors obvious in UI
 */
export function timestampToDate(
  timestamp:
    | Timestamp
    | Date
    | { toMillis?: () => number; seconds?: number; _seconds?: number }
    | undefined
    | null
): Date {
  if (!timestamp) {
    // Log warning in development to catch missing timestamp data
    // Return epoch (1970-01-01) instead of current date to make it obvious the data is missing
    // This will display as "1/1/1970" or similar, clearly indicating an error
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[timestampToDate] Missing timestamp - falling back to epoch (1970-01-01). This may indicate missing data in Firestore."
      );
    }
    return new Date(0); // Epoch date - obviously wrong, won't be confused with real data
  }

  // If it's already a Date, return it
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Try toMillis() method (client SDK Timestamp)
  if (
    typeof (timestamp as { toMillis?: () => number }).toMillis === "function"
  ) {
    const millis = (timestamp as { toMillis: () => number }).toMillis();
    return new Date(millis);
  }

  // Try seconds property (server SDK Timestamp or plain object)
  if (typeof (timestamp as { seconds?: number }).seconds === "number") {
    const seconds = (timestamp as { seconds: number }).seconds;
    return new Date(seconds * 1000);
  }

  // Try _seconds property (Admin SDK serialized format)
  if (typeof (timestamp as { _seconds?: number })._seconds === "number") {
    const seconds = (timestamp as { _seconds: number })._seconds;
    return new Date(seconds * 1000);
  }

  // Fallback to epoch (1970-01-01) for invalid timestamp format
  // Using epoch instead of current date makes it obvious the data is invalid
  // This will display as "1/1/1970" or similar, clearly indicating an error
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[timestampToDate] Invalid timestamp format - falling back to epoch (1970-01-01).",
      timestamp
    );
  }
  return new Date(0); // Epoch date - obviously wrong, won't be confused with real data
}

/**
 * Formats a Firestore Timestamp as a localized date string.
 *
 * @param timestamp - Firestore Timestamp, Date, or timestamp-like object
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatTimestamp(
  timestamp:
    | Timestamp
    | Date
    | { toMillis?: () => number; seconds?: number }
    | undefined
    | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = timestampToDate(timestamp);
  return date.toLocaleDateString(undefined, options);
}

/**
 * Formats a Firestore Timestamp as a localized date and time string.
 *
 * @param timestamp - Firestore Timestamp, Date, or timestamp-like object
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date and time string
 */
export function formatTimestampDateTime(
  timestamp:
    | Timestamp
    | Date
    | { toMillis?: () => number; seconds?: number; _seconds?: number }
    | undefined
    | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = timestampToDate(timestamp);
  return date.toLocaleString(undefined, options);
}
