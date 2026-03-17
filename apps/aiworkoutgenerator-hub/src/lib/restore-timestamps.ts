/**
 * Utility functions to restore Firestore Timestamps after JSON serialization.
 * When Firestore Timestamp objects are serialized via JSON.stringify, they become
 * plain objects. This utility restores them to proper Timestamp instances.
 */

import { Timestamp } from "firebase/firestore";

/**
 * Check if an object looks like a serialized Firestore Timestamp.
 * Firestore Timestamps serialize to objects with `seconds` and `nanoseconds` properties,
 * or sometimes with `_seconds` and `_nanoseconds` (Admin SDK format).
 *
 * This function uses strict checking to ensure the object ONLY contains timestamp
 * properties and no additional fields, preventing false positives that could lead
 * to data loss.
 */
function isSerializedTimestamp(value: unknown): value is {
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
} {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "seconds",
    "nanoseconds",
    "_seconds",
    "_nanoseconds",
  ]);
  const keys = Object.keys(obj);

  // Ensure the object does not contain any unexpected properties
  if (!keys.every((key) => allowedKeys.has(key))) {
    return false;
  }

  // Check for client SDK format (seconds + nanoseconds)
  const hasClientFields =
    keys.includes("seconds") &&
    keys.includes("nanoseconds") &&
    typeof obj.seconds === "number" &&
    typeof obj.nanoseconds === "number";

  // Check for Admin SDK format (_seconds + _nanoseconds)
  const hasAdminFields =
    keys.includes("_seconds") &&
    keys.includes("_nanoseconds") &&
    typeof obj._seconds === "number" &&
    typeof obj._nanoseconds === "number";

  // Must match exactly one format (not both, not neither)
  return hasClientFields || hasAdminFields;
}

/**
 * Convert a serialized Timestamp object back to a Firestore Timestamp.
 */
function restoreTimestamp(value: {
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
}): Timestamp {
  const seconds = value.seconds ?? value._seconds ?? 0;
  const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
  return new Timestamp(seconds, nanoseconds);
}

/**
 * Recursively restore all Firestore Timestamps in an object.
 * This function walks through the object and converts any serialized Timestamps
 * back to proper Timestamp instances.
 */
export function restoreTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // If this is a serialized Timestamp, restore it
  if (isSerializedTimestamp(obj)) {
    return restoreTimestamp(obj) as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(restoreTimestamps) as T;
  }

  // Handle objects
  if (typeof obj === "object") {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      (result as Record<string, unknown>)[key] = restoreTimestamps(value);
    }
    return result;
  }

  // Primitive values (string, number, boolean) are returned as-is
  return obj;
}
