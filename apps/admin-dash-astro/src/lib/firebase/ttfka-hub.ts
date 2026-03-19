/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hub TTFKA (Time to first key action): anchor = Firebase Auth creationTime,
 * key action = first user_activity_logs row in TTFKA_HUB_KEY_ACTIONS.
 * Excludes noisy signals (e.g. app:open) for meaningful adoption latency.
 */

import admin from 'firebase-admin';
import { getFirebaseAuth, getFirebaseFirestore } from './admin';

/** Hub actions that count as "first key action" for TTFKA. Excludes app:open, app:session_*. */
const TTFKA_HUB_KEY_ACTIONS = [
  'workout:generate',
  'workout:start',
  'workout:complete',
  'workout:save',
  'workout:share',
  'profile:onboarding_complete',
] as const;

const MS_15M = 15 * 60 * 1000;
const MS_1H = 60 * 60 * 1000;
const MS_24H = 24 * MS_1H;
const MS_7D = 7 * MS_24H;

export interface TtfkaDistribution {
  under15m: number;
  '15mTo1h': number;
  '1hTo24h': number;
  '1dTo7d': number;
  '7dPlus': number;
  never: number;
}

export interface TtfkaHubResult {
  ttfkaDistributionHub: TtfkaDistribution;
  warnings?: string[];
}

/**
 * Returns null when Firebase / Firestore is not available.
 */
export async function getTtfkaHub(days: number): Promise<TtfkaHubResult | null> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  if (!auth || !db) return null;

  const cappedDays = Math.min(90, Math.max(1, days));
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - cappedDays * 24 * 60 * 60 * 1000);
  const fromTime = fromDate.getTime();
  const toTime = toDate.getTime();

  const signupByUid = new Map<string, number>();
  let pageToken: string | undefined;
  const maxResults = 1000;
  do {
    const result = await auth.listUsers(maxResults, pageToken);
    for (const user of result.users) {
      const created = user.metadata?.creationTime;
      if (!created) continue;
      const ts = new Date(created).getTime();
      if (ts < fromTime || ts > toTime) continue;
      signupByUid.set(user.uid, ts);
    }
    pageToken = result.pageToken;
  } while (pageToken);

  const keyActionsSet = new Set<string>(TTFKA_HUB_KEY_ACTIONS);
  const firstKeyByUid = new Map<string, number>();
  const warnings: string[] = [];
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
        const action = data?.action;
        if (typeof action !== 'string' || !keyActionsSet.has(action)) continue;
        const userId = data?.user_id;
        if (typeof userId !== 'string') continue;
        const ts = data?.timestamp;
        if (!ts || typeof ts.toDate !== 'function') continue;
        const tsMs = ts.toDate().getTime();
        const existing = firstKeyByUid.get(userId);
        if (existing == null || tsMs < existing) {
          firstKeyByUid.set(userId, tsMs);
        }
      }

      if (snapshot.docs.length < pageSize) break;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Firestore (TTFKA hub): ${msg}`);
    if (msg.includes('index') || msg.includes('PERMISSION_DENIED')) {
      warnings.push(
        'Ensure service account has Cloud Datastore User. See docs/FIRESTORE_INDEXES_RETENTION.md.'
      );
    }
  }

  const ttfkaDistributionHub: TtfkaDistribution = {
    under15m: 0,
    '15mTo1h': 0,
    '1hTo24h': 0,
    '1dTo7d': 0,
    '7dPlus': 0,
    never: 0,
  };

  for (const [uid, signupTs] of signupByUid) {
    const firstTs = firstKeyByUid.get(uid);
    if (firstTs == null) {
      ttfkaDistributionHub.never += 1;
      continue;
    }
    const deltaMs = firstTs - signupTs;
    if (deltaMs < MS_15M) ttfkaDistributionHub.under15m += 1;
    else if (deltaMs < MS_1H) ttfkaDistributionHub['15mTo1h'] += 1;
    else if (deltaMs < MS_24H) ttfkaDistributionHub['1hTo24h'] += 1;
    else if (deltaMs < MS_7D) ttfkaDistributionHub['1dTo7d'] += 1;
    else ttfkaDistributionHub['7dPlus'] += 1;
  }

  return {
    ttfkaDistributionHub,
    warnings: warnings.length ? warnings : undefined,
  };
}
