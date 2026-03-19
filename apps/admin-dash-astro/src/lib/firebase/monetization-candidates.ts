/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Monetization candidates: high-intent users from Firestore activity + Firebase Auth.
 * Surfaces Firebase UIDs for lookup in admin dashboard. Phase 1: Firestore + Auth only.
 */

import admin from 'firebase-admin';
import { getFirebaseAuth, getFirebaseFirestore } from './admin';
import { getQualifyingActions } from './retention-cohorts';
import type { ActiveDefinition } from './retention-cohorts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** UTC calendar day key (YYYY-MM-DD). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface CandidateSignals {
  workoutEvents: number;
  sessionEvents: number;
  /** Distinct UTC days with any activity log in the segment window (eligibility / reasons). */
  distinctDays: number;
  /**
   * Distinct UTC days with any activity log in the lookback window (not Auth logins).
   * Multiple events on the same calendar day count as one; a new day = new count.
   */
  totalActiveDays: number;
  lastActivityAt: string;
}

export interface MonetizationCandidate {
  uid: string;
  displayName?: string;
  signupAt: string;
  lastActivityAt: string;
  signupAgeDays: number;
  signals: CandidateSignals;
  reasons: string[];
}

export interface MonetizationCandidatesResult {
  enabled: boolean;
  segment: 'new' | 'return';
  generatedAt: string;
  candidates: MonetizationCandidate[];
  source: 'firebase';
  /** Lookback used for `signals.totalActiveDays` (distinct days with any activity log). */
  totalActiveLookbackDays?: number;
  warnings?: string[];
}

export type MonetizationCandidatesParams = {
  segment: 'new' | 'return';
  windowDays?: number;
  recentDays?: number;
  /** Days to count distinct active days (any activity log); default 365. */
  totalActiveLookbackDays?: number;
  limit?: number;
  minWorkoutEvents?: number;
  activeDefinition?: ActiveDefinition;
};

interface PerUidAggregate {
  workoutEvents: number;
  sessionEvents: number;
  distinctDays: Set<string>;
  totalActiveDays: Set<string>;
  lastActivityTs: number;
}

/**
 * Paginate Firestore user_activity_logs and build per-UID aggregates.
 * Segment window drives eligibility (workout/session counts); total-active window counts
 * distinct calendar days with any logged action (not login sessions).
 */
async function fetchActivityAggregates(
  db: admin.firestore.Firestore,
  collectionName: string,
  queryStartDate: Date,
  endDate: Date,
  segmentStartDate: Date,
  segmentEndDate: Date,
  totalActiveStartDate: Date,
  totalActiveEndDate: Date,
  workoutActions: Set<string>,
  sessionActions: Set<string>,
  warnings: string[]
): Promise<Map<string, PerUidAggregate>> {
  const byUid = new Map<string, PerUidAggregate>();
  try {
    const start = admin.firestore.Timestamp.fromDate(queryStartDate);
    const end = admin.firestore.Timestamp.fromDate(endDate);
    const segmentStartMs = segmentStartDate.getTime();
    const segmentEndMs = segmentEndDate.getTime();
    const totalActiveStartMs = totalActiveStartDate.getTime();
    const totalActiveEndMs = totalActiveEndDate.getTime();
    let lastDoc: admin.firestore.DocumentSnapshot | null = null;
    const limit = 500;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = db
        .collection(collectionName)
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .orderBy('timestamp')
        .limit(limit);

      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      if (snapshot.empty) break;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const action = data?.action;
        if (typeof action !== 'string') continue;
        const userId = data?.user_id;
        if (typeof userId !== 'string') continue;
        const ts = data?.timestamp;
        if (!ts || typeof ts.toDate !== 'function') continue;
        const date = ts.toDate();
        const tsMs = date.getTime();
        const dk = dayKey(date);

        if (!byUid.has(userId)) {
          byUid.set(userId, {
            workoutEvents: 0,
            sessionEvents: 0,
            distinctDays: new Set(),
            totalActiveDays: new Set(),
            lastActivityTs: 0,
          });
        }
        const agg = byUid.get(userId)!;
        if (tsMs >= totalActiveStartMs && tsMs <= totalActiveEndMs) {
          agg.totalActiveDays.add(dk);
        }
        if (tsMs >= segmentStartMs && tsMs <= segmentEndMs) {
          agg.distinctDays.add(dk);
          if (tsMs > agg.lastActivityTs) agg.lastActivityTs = tsMs;
          if (workoutActions.has(action)) agg.workoutEvents += 1;
          if (sessionActions.has(action)) agg.sessionEvents += 1;
        }
      }

      if (snapshot.docs.length < limit) break;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Firestore read error: ${msg}`);
    if (msg.includes('index') || msg.includes('PERMISSION_DENIED')) {
      warnings.push(
        'Ensure service account has Cloud Datastore User. See docs/FIRESTORE_INDEXES_RETENTION.md.'
      );
    }
  }
  return byUid;
}

/**
 * Fetch display names from Firestore user_profiles for given UIDs.
 */
async function fetchDisplayNames(
  db: admin.firestore.Firestore,
  uids: string[]
): Promise<Map<string, string>> {
  const byUid = new Map<string, string>();
  if (uids.length === 0) return byUid;

  const collectionName =
    process.env.FIREBASE_USER_PROFILES_COLLECTION ?? 'user_profiles';
  const refs = uids.map((uid) => db.collection(collectionName).doc(uid));

  try {
    const snapshots = await db.getAll(...refs);
    for (let i = 0; i < uids.length; i++) {
      const doc = snapshots[i];
      if (!doc?.exists) continue;
      const data = doc.data();
      const displayName = data?.display_name;
      if (typeof displayName === 'string' && displayName.trim()) {
        byUid.set(uids[i], displayName.trim());
      } else {
        const first = data?.first_name;
        const last = data?.last_name;
        if (typeof first === 'string' || typeof last === 'string') {
          const name = [first, last].filter(Boolean).join(' ').trim();
          if (name) byUid.set(uids[i], name);
        }
      }
    }
  } catch {
    // Non-fatal: names are optional; candidates still shown with UID only
  }
  return byUid;
}

function buildReasons(
  signals: CandidateSignals,
  signupAgeDays: number,
  segment: 'new' | 'return'
): string[] {
  const reasons: string[] = [];
  if (signals.workoutEvents >= 3) reasons.push('high workout count');
  if (signals.distinctDays >= 2) reasons.push('multi-day workout');
  if (signals.workoutEvents > 0 && signals.sessionEvents > 0) reasons.push('session+workout');
  if (segment === 'return' && signupAgeDays > 14) reasons.push('returned after gap');
  if (reasons.length === 0) reasons.push('workout engaged');
  return reasons;
}

function scoreCandidate(
  c: MonetizationCandidate,
  now: number
): number {
  const recencyDecay = Math.max(0.2, 1 - (now - new Date(c.lastActivityAt).getTime()) / (7 * MS_PER_DAY));
  const depth = c.signals.workoutEvents * 2 + c.signals.distinctDays * 3;
  return depth * recencyDecay;
}

/**
 * Get monetization candidates. Returns null when Firebase is not configured.
 */
export async function getMonetizationCandidates(
  params: MonetizationCandidatesParams
): Promise<MonetizationCandidatesResult | null> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  if (!auth || !db) return null;

  const warnings: string[] = [];
  const segment = params.segment ?? 'new';
  const windowDays = Math.min(90, Math.max(7, params.windowDays ?? 14));
  const recentDays = Math.min(30, Math.max(1, params.recentDays ?? 7));
  const totalActiveLookbackDays = Math.min(
    730,
    Math.max(7, params.totalActiveLookbackDays ?? 365)
  );
  const limit = Math.min(100, Math.max(10, params.limit ?? 50));
  const minWorkoutEvents = Math.max(0, params.minWorkoutEvents ?? 1);
  const activeDefinition = params.activeDefinition ?? 'workout';

  const workoutActions = getQualifyingActions('workout');
  const sessionActions = getQualifyingActions('session');

  const now = new Date();
  const nowMs = now.getTime();

  let segmentStartDate: Date;
  const segmentEndDate = new Date(now);
  let signupFilter: (createdAt: Date) => boolean;

  if (segment === 'new') {
    segmentStartDate = new Date(nowMs - windowDays * MS_PER_DAY);
    segmentStartDate.setUTCHours(0, 0, 0, 0);
    signupFilter = (createdAt) => {
      const age = (nowMs - createdAt.getTime()) / MS_PER_DAY;
      return age >= 0 && age <= windowDays;
    };
  } else {
    segmentStartDate = new Date(nowMs - recentDays * MS_PER_DAY);
    segmentStartDate.setUTCHours(0, 0, 0, 0);
    const minAgeDays = 7;
    signupFilter = (createdAt) => {
      const age = (nowMs - createdAt.getTime()) / MS_PER_DAY;
      return age > minAgeDays;
    };
  }

  const totalActiveStartDate = new Date(nowMs - totalActiveLookbackDays * MS_PER_DAY);
  totalActiveStartDate.setUTCHours(0, 0, 0, 0);
  const totalActiveEndDate = segmentEndDate;
  const queryStartDate = new Date(
    Math.min(segmentStartDate.getTime(), totalActiveStartDate.getTime())
  );

  const collectionName =
    process.env.FIREBASE_USER_ACTIVITY_COLLECTION ?? 'user_activity_logs';
  const aggregates = await fetchActivityAggregates(
    db,
    collectionName,
    queryStartDate,
    segmentEndDate,
    segmentStartDate,
    segmentEndDate,
    totalActiveStartDate,
    totalActiveEndDate,
    workoutActions,
    sessionActions,
    warnings
  );

  const uidToCreation = new Map<string, number>();
  let pageToken: string | undefined;
  const maxResults = 1000;
  do {
    const result = await auth.listUsers(maxResults, pageToken);
    for (const user of result.users) {
      const created = user.metadata?.creationTime;
      if (!created) continue;
      const createdAt = new Date(created);
      if (!signupFilter(createdAt)) continue;
      uidToCreation.set(user.uid, createdAt.getTime());
    }
    pageToken = result.pageToken;
  } while (pageToken);

  const candidates: MonetizationCandidate[] = [];
  for (const [uid, agg] of aggregates) {
    const createdAt = uidToCreation.get(uid);
    if (createdAt == null) continue;
    if (agg.workoutEvents < minWorkoutEvents) continue;

    const signupAgeDays = (nowMs - createdAt) / MS_PER_DAY;
    const signals: CandidateSignals = {
      workoutEvents: agg.workoutEvents,
      sessionEvents: agg.sessionEvents,
      distinctDays: agg.distinctDays.size,
      totalActiveDays: agg.totalActiveDays.size,
      lastActivityAt: agg.lastActivityTs > 0 ? new Date(agg.lastActivityTs).toISOString() : '',
    };

    const reasons = buildReasons(signals, signupAgeDays, segment);
    candidates.push({
      uid,
      signupAt: new Date(createdAt).toISOString(),
      lastActivityAt: signals.lastActivityAt,
      signupAgeDays: Math.round(signupAgeDays),
      signals,
      reasons,
    });
  }

  candidates.sort((a, b) => scoreCandidate(b, nowMs) - scoreCandidate(a, nowMs));
  const capped = candidates.slice(0, limit);

  const uids = capped.map((c) => c.uid);
  const displayNames = await fetchDisplayNames(db, uids);
  for (const c of capped) {
    const name = displayNames.get(c.uid);
    if (name) c.displayName = name;
  }

  return {
    enabled: true,
    segment,
    generatedAt: now.toISOString(),
    candidates: capped,
    source: 'firebase',
    totalActiveLookbackDays,
    warnings: warnings.length ? warnings : undefined,
  };
}
