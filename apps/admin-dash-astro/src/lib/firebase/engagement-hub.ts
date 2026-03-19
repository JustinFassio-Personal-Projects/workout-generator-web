/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hub engagement: DAU/WAU/MAU/stickiness and feature adoption from Firestore user_activity_logs.
 * Distinct Firebase UIDs per UTC calendar day with ≥1 log row (any action).
 */

import admin from 'firebase-admin';
import { getFirebaseFirestore } from './admin';

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hub actions to count for feature adoption. Align with user-activity-logger / ACTIVITY_LOGGING. */
const HUB_FEATURE_ADOPTION_ACTIONS = [
  'app:open',
  'app:session_start',
  'app:session_end',
  'workout:generate',
  'workout:open',
  'workout:start',
  'workout:complete',
  'workout:save',
  'workout:share',
  'profile:update',
  'profile:onboarding_complete',
  'recipe:view',
  'recipe:save',
  'subscription:upgrade',
  'subscription:downgrade',
] as const;

/** Human-readable labels for feature adoption table. */
const ACTION_LABELS: Record<string, string> = {
  'app:open': 'App opened',
  'app:session_start': 'Session started',
  'app:session_end': 'Session ended',
  'workout:generate': 'Workout generated',
  'workout:open': 'Workout opened',
  'workout:start': 'Workout started',
  'workout:complete': 'Workout completed',
  'workout:save': 'Workout saved',
  'workout:share': 'Workout shared',
  'profile:update': 'Profile updated',
  'profile:onboarding_complete': 'Onboarding completed',
  'recipe:view': 'Recipe viewed',
  'recipe:save': 'Recipe saved',
  'subscription:upgrade': 'Subscription upgraded',
  'subscription:downgrade': 'Subscription downgraded',
};

export interface FeatureAdoptionRow {
  eventName: string;
  displayLabel: string;
  count7d: number;
  count30d: number;
}

export interface HubActiveUsersResult {
  dauByDay: { date: string; count: number }[];
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  featureAdoptionHub: FeatureAdoptionRow[];
  warnings?: string[];
}

/**
 * Returns null when Firebase / Firestore is not available.
 */
export async function getHubActiveUsersFromFirestore(
  days: number
): Promise<HubActiveUsersResult | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;

  const cappedDays = Math.min(90, Math.max(1, days));
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - cappedDays * 24 * 60 * 60 * 1000);

  const sevenDaysAgo = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from7 = dateKey(sevenDaysAgo);
  const from30 = dateKey(thirtyDaysAgo);

  const dauByDayMap = new Map<string, Set<string>>();
  const hubActionsSet = new Set<string>(HUB_FEATURE_ADOPTION_ACTIONS);
  const count7ByAction = new Map<string, number>();
  const count30ByAction = new Map<string, number>();
  for (const a of HUB_FEATURE_ADOPTION_ACTIONS) {
    count7ByAction.set(a, 0);
    count30ByAction.set(a, 0);
  }
  const warnings: string[] = [];

  const addUserToDay = (dateStr: string, userId: string) => {
    if (!dateStr || !userId) return;
    let set = dauByDayMap.get(dateStr);
    if (!set) {
      set = new Set();
      dauByDayMap.set(dateStr, set);
    }
    set.add(userId);
  };

  const collectionName =
    process.env.FIREBASE_USER_ACTIVITY_COLLECTION ?? 'user_activity_logs';

  try {
    const start = admin.firestore.Timestamp.fromDate(fromDate);
    const end = admin.firestore.Timestamp.fromDate(toDate);
    let lastDoc: admin.firestore.DocumentSnapshot | null = null;
    const pageSize = 500;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = db
        .collection(collectionName)
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .orderBy('timestamp')
        .limit(pageSize);

      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      if (snapshot.empty) break;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const userId = data?.user_id;
        if (typeof userId !== 'string') continue;
        const ts = data?.timestamp;
        if (!ts || typeof ts.toDate !== 'function') continue;
        const date = ts.toDate();
        const dk = dateKey(date);
        addUserToDay(dk, userId);
        const action = data?.action;
        if (typeof action === 'string' && hubActionsSet.has(action)) {
          if (dk >= from30) {
            count30ByAction.set(action, (count30ByAction.get(action) ?? 0) + 1);
          }
          if (dk >= from7) {
            count7ByAction.set(action, (count7ByAction.get(action) ?? 0) + 1);
          }
        }
      }

      if (snapshot.docs.length < pageSize) break;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Firestore (hub engagement): ${msg}`);
    if (msg.includes('index') || msg.includes('PERMISSION_DENIED')) {
      warnings.push(
        'Ensure service account has Cloud Datastore User. See docs/FIRESTORE_INDEXES_RETENTION.md.'
      );
    }
  }

  const dauByDay = Array.from(dauByDayMap.entries())
    .map(([date, set]) => ({ date, count: set.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const lastDayInRange = dauByDay.length ? dauByDay[dauByDay.length - 1].date : dateKey(toDate);
  const dau = dauByDayMap.get(lastDayInRange)?.size ?? 0;

  let wauSet = new Set<string>();
  let mauSet = new Set<string>();
  for (const [date, set] of dauByDayMap) {
    if (date >= from7) set.forEach((u) => wauSet.add(u));
    if (date >= from30) set.forEach((u) => mauSet.add(u));
  }
  const wau = wauSet.size;
  const mau = mauSet.size;
  const stickiness = mau > 0 ? wau / mau : 0;

  const featureAdoptionHub: FeatureAdoptionRow[] = HUB_FEATURE_ADOPTION_ACTIONS.map((eventName) => ({
    eventName,
    displayLabel: ACTION_LABELS[eventName] ?? eventName,
    count7d: count7ByAction.get(eventName) ?? 0,
    count30d: count30ByAction.get(eventName) ?? 0,
  }));

  return {
    dauByDay,
    dau,
    wau,
    mau,
    stickiness,
    featureAdoptionHub,
    warnings: warnings.length ? warnings : undefined,
  };
}
