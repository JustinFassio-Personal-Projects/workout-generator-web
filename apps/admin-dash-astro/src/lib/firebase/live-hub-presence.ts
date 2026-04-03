/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin “Live” list from hub `user_presence` heartbeat docs (v2).
 */

import admin from 'firebase-admin';
import { getFirebaseFirestore } from './admin';
import type { LiveHubRecentAction, LiveHubUserAggregated } from './live-hub-users';
import { LIVE_HUB_MAX_USER_LIMIT } from './live-hub-users';

export function getUserPresenceCollectionName(): string {
  return process.env.FIREBASE_USER_PRESENCE_COLLECTION ?? 'user_presence';
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  return null;
}

export interface FetchLiveHubPresenceOptions {
  windowMinutes: number;
  userLimit: number;
  scanLimit: number;
}

/**
 * Users with `last_seen_at` in the window, newest first. One doc per uid.
 * `recent_actions` is empty (heartbeats do not carry action history).
 */
export async function fetchLiveHubPresenceUsers(
  options: FetchLiveHubPresenceOptions
): Promise<{ distinctUserCount: number; users: LiveHubUserAggregated[] } | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;

  const windowMinutes = Math.min(60, Math.max(1, Math.floor(options.windowMinutes)));
  const scanLimit = Math.min(2000, Math.max(1, Math.floor(options.scanLimit)));
  const userLimit = Math.min(
    LIVE_HUB_MAX_USER_LIMIT,
    Math.max(1, Math.floor(options.userLimit))
  );

  const fromDate = new Date(Date.now() - windowMinutes * 60 * 1000);
  const fromTs = admin.firestore.Timestamp.fromDate(fromDate);

  const snap = await db
    .collection(getUserPresenceCollectionName())
    .where('last_seen_at', '>=', fromTs)
    .orderBy('last_seen_at', 'desc')
    .limit(scanLimit)
    .get();

  const rows: LiveHubUserAggregated[] = snap.docs.map((doc) => {
    const data = doc.data();
    const lastSeen =
      timestampToIso(data?.last_seen_at) ?? new Date(0).toISOString();
    const sessionId =
      typeof data?.session_id === 'string' && data.session_id.trim()
        ? data.session_id.trim()
        : null;
    return {
      user_id: doc.id,
      last_seen: lastSeen,
      recent_actions: [] as LiveHubRecentAction[],
      session_id: sessionId,
    };
  });

  const distinctUserCount = rows.length;
  const capped = rows.slice(0, userLimit);

  return { distinctUserCount, users: capped };
}
