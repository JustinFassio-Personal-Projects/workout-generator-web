import type { Timestamp } from "firebase-admin/firestore";

function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  );
}

/** Normalize Firestore Timestamp, ISO string, or millis to ISO string for growth_state derive. */
export function firestoreTimeToIsoString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim()) {
    const t = Date.parse(value);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (isFirestoreTimestamp(value)) {
    return value.toDate().toISOString();
  }
  return null;
}

export function pickTrialEndsAtIso(
  data: Record<string, unknown>
): string | null {
  return (
    firestoreTimeToIsoString(data.trial_ends_at) ??
    firestoreTimeToIsoString(data.trial_end_at) ??
    firestoreTimeToIsoString(data.trial_end)
  );
}

export function normalizeTierField(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}
