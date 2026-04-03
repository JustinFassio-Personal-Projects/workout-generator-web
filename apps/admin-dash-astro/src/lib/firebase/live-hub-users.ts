/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Live" hub users: distinct users with recent user_activity_logs in a short window.
 */

import admin from 'firebase-admin';
import { getFirebaseFirestore } from './admin';
import { getStartOfPacificCalendarDayUtc } from './live-hub-pacific-day';
import {
  getUserActivityCollectionName,
  parseUserActivityLogDoc,
  type WorkoutActivityLogRow,
} from './workout-journey';

export const LIVE_HUB_DEFAULT_WINDOW_MINUTES = 5;
export const LIVE_HUB_MAX_WINDOW_MINUTES = 60;
export const LIVE_HUB_DEFAULT_USER_LIMIT = 25;
export const LIVE_HUB_MAX_USER_LIMIT = 50;
export const LIVE_HUB_DEFAULT_SCAN_LIMIT = 500;
/** Default scan cap when activity window is “since midnight Pacific” (heavier volume than 5 minutes). */
export const LIVE_HUB_DEFAULT_SCAN_LIMIT_PACIFIC_DAY = 2000;
export const LIVE_HUB_MAX_ACTIONS_PER_USER = 3;

export type LiveHubActivityWindowKind = 'rolling' | 'pacific_day';

export interface LiveHubRecentAction {
  action: string;
  timestamp: string;
  log_id: string;
}

export interface LiveHubUserAggregated {
  user_id: string;
  last_seen: string;
  recent_actions: LiveHubRecentAction[];
  session_id: string | null;
}

/**
 * Pure aggregation for tests and Firestore post-processing.
 * `rowsNewestFirst` must be ordered newest-first (Firestore query order).
 */
export function aggregateLiveUsersFromLogRows(
  rowsNewestFirst: WorkoutActivityLogRow[],
  maxUsers: number,
  maxActionsPerUser: number = LIVE_HUB_MAX_ACTIONS_PER_USER
): { distinctUserCount: number; users: LiveHubUserAggregated[] } {
  const distinct = new Set<string>();
  type Acc = {
    last_seen: string;
    session_id: string | null;
    actions: LiveHubRecentAction[];
  };
  const byUid = new Map<string, Acc>();

  for (const row of rowsNewestFirst) {
    const uid = row.user_id?.trim();
    if (!uid) continue;

    distinct.add(uid);
    let acc = byUid.get(uid);
    if (!acc) {
      acc = {
        last_seen: row.timestamp,
        session_id: row.session_id,
        actions: [
          {
            action: row.action,
            timestamp: row.timestamp,
            log_id: row.id,
          },
        ],
      };
      byUid.set(uid, acc);
      continue;
    }
    if (acc.actions.length < maxActionsPerUser) {
      acc.actions.push({
        action: row.action,
        timestamp: row.timestamp,
        log_id: row.id,
      });
    }
  }

  const distinctUserCount = distinct.size;

  const list: LiveHubUserAggregated[] = [...byUid.entries()].map(([user_id, acc]) => ({
    user_id,
    last_seen: acc.last_seen,
    recent_actions: acc.actions,
    session_id: acc.session_id,
  }));

  list.sort((a, b) => (a.last_seen < b.last_seen ? 1 : a.last_seen > b.last_seen ? -1 : 0));

  const capped = Math.min(LIVE_HUB_MAX_USER_LIMIT, Math.max(1, maxUsers));
  return {
    distinctUserCount,
    users: list.slice(0, capped),
  };
}

export interface FetchLiveHubUsersOptions {
  /** `rolling`: last N minutes; `pacific_day`: from midnight America/Los_Angeles through now. */
  activityWindow: LiveHubActivityWindowKind;
  windowMinutes: number;
  userLimit: number;
  scanLimit: number;
  /** For tests only — fixed “now” for rolling window and Pacific day boundary. */
  now?: Date;
}

/**
 * Query recent activity logs and aggregate per-user recent actions. Returns null if Firestore unavailable.
 */
export async function fetchLiveHubUsersAggregates(
  options: FetchLiveHubUsersOptions
): Promise<{ distinctUserCount: number; users: LiveHubUserAggregated[] } | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;

  const scanLimit = Math.min(2000, Math.max(1, Math.floor(options.scanLimit)));
  const userLimit = Math.min(
    LIVE_HUB_MAX_USER_LIMIT,
    Math.max(1, Math.floor(options.userLimit))
  );

  const now = options.now ?? new Date();
  let fromDate: Date;
  if (options.activityWindow === 'pacific_day') {
    fromDate = getStartOfPacificCalendarDayUtc(now);
  } else {
    const windowMinutes = Math.min(
      LIVE_HUB_MAX_WINDOW_MINUTES,
      Math.max(1, Math.floor(options.windowMinutes))
    );
    fromDate = new Date(now.getTime() - windowMinutes * 60 * 1000);
  }
  const fromTs = admin.firestore.Timestamp.fromDate(fromDate);

  const snap = await db
    .collection(getUserActivityCollectionName())
    .where('timestamp', '>=', fromTs)
    .orderBy('timestamp', 'desc')
    .limit(scanLimit)
    .get();

  const rows = snap.docs
    .map((d) => parseUserActivityLogDoc(d))
    .filter(Boolean) as WorkoutActivityLogRow[];

  return aggregateLiveUsersFromLogRows(rows, userLimit, LIVE_HUB_MAX_ACTIONS_PER_USER);
}
