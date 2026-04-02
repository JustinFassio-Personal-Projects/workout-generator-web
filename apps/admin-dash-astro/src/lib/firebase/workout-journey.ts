/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query ordered activity rows for one workout attempt or list recent workout:start events.
 */

import admin from 'firebase-admin';
import { getFirebaseFirestore } from './admin';

const WORKOUT_ATTEMPT_ID_MAX_LEN = 64;

export interface WorkoutActivityLogRow {
  id: string;
  timestamp: string;
  action: string;
  user_id: string | null;
  session_id: string | null;
  resource_id: string | null;
  workout_attempt_id: string | null;
  details: Record<string, unknown>;
}

function activityCollectionName(): string {
  return process.env.FIREBASE_USER_ACTIVITY_COLLECTION ?? 'user_activity_logs';
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof (value as admin.firestore.Timestamp).toDate === 'function') {
    return (value as admin.firestore.Timestamp).toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return null;
}

function docToRow(doc: admin.firestore.DocumentSnapshot): WorkoutActivityLogRow | null {
  const data = doc.data();
  if (!data) return null;
  const iso = timestampToIso(data.timestamp);
  if (!iso) return null;
  const details =
    typeof data.details === 'object' && data.details !== null
      ? (data.details as Record<string, unknown>)
      : {};
  return {
    id: doc.id,
    timestamp: iso,
    action: String(data.action ?? ''),
    user_id: data.user_id != null ? String(data.user_id) : null,
    session_id: data.session_id != null ? String(data.session_id) : null,
    resource_id: data.resource_id != null ? String(data.resource_id) : null,
    workout_attempt_id:
      data.workout_attempt_id != null ? String(data.workout_attempt_id) : null,
    details,
  };
}

/**
 * All log rows for a single attempt, oldest first. Returns null if Firestore is unavailable.
 */
export async function getWorkoutJourneyByAttemptId(
  attemptId: string
): Promise<WorkoutActivityLogRow[] | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;
  const trimmed = attemptId.trim();
  if (!trimmed || trimmed.length > WORKOUT_ATTEMPT_ID_MAX_LEN) {
    return [];
  }

  const snap = await db
    .collection(activityCollectionName())
    .where('workout_attempt_id', '==', trimmed)
    .orderBy('timestamp', 'asc')
    .limit(100)
    .get();

  return snap.docs.map((d) => docToRow(d)).filter(Boolean) as WorkoutActivityLogRow[];
}

/**
 * Recent workout:start rows in range, newest first. Returns null if Firestore is unavailable.
 */
export async function listRecentWorkoutStarts(
  days: number,
  limit: number
): Promise<WorkoutActivityLogRow[] | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;

  const cappedDays = Math.min(90, Math.max(1, days));
  const cappedLimit = Math.min(200, Math.max(1, limit));
  const fromDate = new Date(Date.now() - cappedDays * 24 * 60 * 60 * 1000);
  const fromTs = admin.firestore.Timestamp.fromDate(fromDate);

  const snap = await db
    .collection(activityCollectionName())
    .where('action', '==', 'workout:start')
    .where('timestamp', '>=', fromTs)
    .orderBy('timestamp', 'desc')
    .limit(cappedLimit)
    .get();

  return snap.docs.map((d) => docToRow(d)).filter(Boolean) as WorkoutActivityLogRow[];
}
