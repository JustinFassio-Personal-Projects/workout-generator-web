/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retention cohort stats: Auth signup + Firestore activity logs.
 * P0: weekly granularity. P1: daily granularity, pooled KPIs (W1/W4/W8 or D1/D7/D30).
 */

import admin from 'firebase-admin';
import { getFirebaseAuth, getFirebaseFirestore } from './admin';

export type ActiveDefinition = 'session' | 'workout';

/**
 * Returns the set of action strings that qualify as "active" for the given definition.
 * - session: app open / session start
 * - workout: explicit workout engagement events
 */
export function getQualifyingActions(
  activeDefinition: ActiveDefinition
): Set<string> {
  if (activeDefinition === 'session') {
    return new Set(['app:open', 'app:session_start']);
  }
  return new Set([
    'workout:generate',
    'workout:open',
    'workout:start',
    'workout:complete',
    'workout:save',
    'workout:share',
  ]);
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Get Monday 00:00 UTC for a given date.
 */
function getWeekStart(d: Date): Date {
  const copy = new Date(d.getTime());
  const day = copy.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  copy.setUTCDate(copy.getUTCDate() - daysToMonday);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function weekKey(d: Date): string {
  return getWeekStart(d).toISOString().slice(0, 10);
}

/** UTC calendar day key (YYYY-MM-DD). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addWeeks(d: Date, n: number): Date {
  d.setTime(d.getTime() + n * MS_PER_WEEK);
  return d;
}

function addDays(d: Date, n: number): Date {
  d.setTime(d.getTime() + n * MS_PER_DAY);
  return d;
}

export interface RetentionCohortRow {
  label: string;
  start: string;
  end: string;
  size: number;
  retained: number[];
  rates: number[];
}

export interface RetentionCohortsResult {
  granularity: 'week' | 'day';
  activeDefinition: ActiveDefinition;
  cohorts: RetentionCohortRow[];
  source: 'firebase';
  enabled?: boolean;
  kpis?: { label: string; rate: number }[];
  warnings?: string[];
}

/** Pooled retention: sum(retained[k]) / sum(size) over cohorts with size > 0. */
function computePooledKpis(
  cohorts: RetentionCohortRow[],
  granularity: 'week' | 'day',
  periods: number
): { label: string; rate: number }[] {
  const kpiIndices = granularity === 'week' ? [1, 4, 8] : [1, 7, 30];
  const kpiLabels = granularity === 'week' ? ['W1', 'W4', 'W8'] : ['D1', 'D7', 'D30'];
  const kpis: { label: string; rate: number }[] = [];
  for (let i = 0; i < kpiIndices.length; i++) {
    const k = kpiIndices[i];
    if (k >= periods) break;
    let totalRetained = 0;
    let totalSize = 0;
    for (const c of cohorts) {
      if (c.size > 0 && c.retained[k] !== undefined) {
        totalRetained += c.retained[k];
        totalSize += c.size;
      }
    }
    kpis.push({
      label: kpiLabels[i],
      rate: totalSize > 0 ? totalRetained / totalSize : 0,
    });
  }
  return kpis;
}

/**
 * Paginate Firestore user_activity_logs and build activityByKey map.
 * keyExtractor: (date: Date) => string for week or day key.
 * qualifyingActions: set of action strings to count as "active".
 */
async function fetchActivityByPeriod(
  db: admin.firestore.Firestore,
  collectionName: string,
  startDate: Date,
  endDate: Date,
  keyExtractor: (d: Date) => string,
  qualifyingActions: Set<string>,
  warnings: string[]
): Promise<Map<string, Set<string>>> {
  const activityByKey = new Map<string, Set<string>>();
  try {
    const start = admin.firestore.Timestamp.fromDate(startDate);
    const end = admin.firestore.Timestamp.fromDate(endDate);
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
        if (!qualifyingActions.has(data?.action)) continue;
        const userId = data?.user_id;
        if (typeof userId !== 'string') continue;
        const ts = data?.timestamp;
        if (!ts || typeof ts.toDate !== 'function') continue;
        const key = keyExtractor(ts.toDate());
        if (!activityByKey.has(key)) activityByKey.set(key, new Set());
        activityByKey.get(key)!.add(userId);
      }

      if (snapshot.docs.length < limit) break;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Firestore read error: ${msg}`);
    if (msg.includes('index') || msg.includes('PERMISSION_DENIED')) {
      warnings.push(
        'Ensure service account has Cloud Datastore User and required Firestore index. See docs/FIRESTORE_INDEXES_RETENTION.md.'
      );
    }
  }
  return activityByKey;
}

async function computeWeeklyRetention(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  cohortWeeks: number,
  periods: number,
  qualifyingActions: Set<string>,
  warnings: string[]
): Promise<RetentionCohortRow[]> {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const cohortWeekKeys: string[] = [];
  for (let i = 0; i < cohortWeeks; i++) {
    const monday = new Date(currentWeekStart.getTime());
    addWeeks(monday, -i);
    cohortWeekKeys.push(weekKey(monday));
  }
  const cohortSet = new Set(cohortWeekKeys);

  const earliestCohortMonday = new Date(currentWeekStart.getTime());
  addWeeks(earliestCohortMonday, -(cohortWeeks - 1));
  const latestActivityMonday = new Date(earliestCohortMonday.getTime());
  addWeeks(latestActivityMonday, periods - 1);
  const activityEnd = addWeeks(new Date(latestActivityMonday.getTime()), 1);

  const cohortToUsers = new Map<string, Set<string>>();
  for (const k of cohortWeekKeys) cohortToUsers.set(k, new Set());

  let pageToken: string | undefined;
  const maxResults = 1000;
  do {
    const result = await auth.listUsers(maxResults, pageToken);
    for (const user of result.users) {
      const created = user.metadata?.creationTime;
      if (!created) continue;
      const key = weekKey(new Date(created));
      if (!cohortSet.has(key)) continue;
      cohortToUsers.get(key)!.add(user.uid);
    }
    pageToken = result.pageToken;
  } while (pageToken);

  const collectionName =
    process.env.FIREBASE_USER_ACTIVITY_COLLECTION ?? 'user_activity_logs';
  const activityEndCapped =
    activityEnd.getTime() > now.getTime() ? now : activityEnd;
  const activityByWeek = await fetchActivityByPeriod(
    db,
    collectionName,
    earliestCohortMonday,
    activityEndCapped,
    weekKey,
    qualifyingActions,
    warnings
  );

  const sortedCohortKeys = [...cohortWeekKeys].reverse();
  const cohorts: RetentionCohortRow[] = [];

  for (const cohortKey of sortedCohortKeys) {
    const cohortUserIds = cohortToUsers.get(cohortKey) ?? new Set();
    const size = cohortUserIds.size;
    const retained: number[] = [];
    const rates: number[] = [];
    const cohortMonday = new Date(cohortKey + 'T00:00:00Z');

    for (let n = 0; n < periods; n++) {
      const targetMonday = new Date(cohortMonday.getTime());
      addWeeks(targetMonday, n);
      const targetKey = weekKey(targetMonday);
      const activeInWeek = activityByWeek.get(targetKey) ?? new Set();
      let count = 0;
      for (const uid of cohortUserIds) {
        if (activeInWeek.has(uid)) count++;
      }
      retained.push(count);
      rates.push(size > 0 ? count / size : 0);
    }

    const cohortEnd = new Date(cohortMonday.getTime());
    addWeeks(cohortEnd, 1);

    cohorts.push({
      label: cohortKey,
      start: cohortMonday.toISOString().slice(0, 10),
      end: cohortEnd.toISOString().slice(0, 10),
      size,
      retained,
      rates,
    });
  }
  return cohorts;
}

/**
 * Daily retention: cohort = signup day (UTC), activity = day offset.
 * Window: last cohortDays days including today UTC.
 */
async function computeDailyRetention(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  cohortDays: number,
  periods: number,
  qualifyingActions: Set<string>,
  warnings: string[]
): Promise<RetentionCohortRow[]> {
  const now = new Date();
  const cohortDayKeys: string[] = [];
  for (let i = 0; i < cohortDays; i++) {
    const d = new Date(now.getTime());
    addDays(d, -i);
    cohortDayKeys.push(dayKey(d));
  }
  const cohortSet = new Set(cohortDayKeys);

  const earliestCohortDay = new Date(now.getTime());
  addDays(earliestCohortDay, -(cohortDays - 1));
  earliestCohortDay.setUTCHours(0, 0, 0, 0);
  const latestNeededDay = new Date(earliestCohortDay.getTime());
  addDays(latestNeededDay, periods - 1);
  const activityEnd = new Date(latestNeededDay.getTime());
  addDays(activityEnd, 1);
  const activityEndCapped = activityEnd.getTime() > now.getTime() ? now : activityEnd;

  const cohortToUsers = new Map<string, Set<string>>();
  for (const k of cohortDayKeys) cohortToUsers.set(k, new Set());

  let pageToken: string | undefined;
  const maxResults = 1000;
  do {
    const result = await auth.listUsers(maxResults, pageToken);
    for (const user of result.users) {
      const created = user.metadata?.creationTime;
      if (!created) continue;
      const key = dayKey(new Date(created));
      if (!cohortSet.has(key)) continue;
      cohortToUsers.get(key)!.add(user.uid);
    }
    pageToken = result.pageToken;
  } while (pageToken);

  const collectionName =
    process.env.FIREBASE_USER_ACTIVITY_COLLECTION ?? 'user_activity_logs';
  const activityByDay = await fetchActivityByPeriod(
    db,
    collectionName,
    earliestCohortDay,
    activityEndCapped,
    dayKey,
    qualifyingActions,
    warnings
  );

  const sortedCohortKeys = [...cohortDayKeys].reverse();
  const cohorts: RetentionCohortRow[] = [];

  for (const cohortKey of sortedCohortKeys) {
    const cohortUserIds = cohortToUsers.get(cohortKey) ?? new Set();
    const size = cohortUserIds.size;
    const retained: number[] = [];
    const rates: number[] = [];
    const cohortDay = new Date(cohortKey + 'T00:00:00Z');

    for (let n = 0; n < periods; n++) {
      const targetDay = new Date(cohortDay.getTime());
      addDays(targetDay, n);
      const targetKey = dayKey(targetDay);
      const activeInDay = activityByDay.get(targetKey) ?? new Set();
      let count = 0;
      for (const uid of cohortUserIds) {
        if (activeInDay.has(uid)) count++;
      }
      retained.push(count);
      rates.push(size > 0 ? count / size : 0);
    }

    const cohortEnd = new Date(cohortDay.getTime());
    addDays(cohortEnd, 1);

    cohorts.push({
      label: cohortKey,
      start: cohortDay.toISOString().slice(0, 10),
      end: cohortEnd.toISOString().slice(0, 10),
      size,
      retained,
      rates,
    });
  }
  return cohorts;
}

export type RetentionParams =
  | {
      granularity: 'week';
      cohortWeeks: number;
      periods: number;
      activeDefinition?: ActiveDefinition;
    }
  | {
      granularity: 'day';
      cohortDays: number;
      periods: number;
      activeDefinition?: ActiveDefinition;
    };

/**
 * Compute retention cohort stats.
 * Returns null when Firebase is not configured or Firestore unavailable.
 */
export async function getRetentionCohortStats(
  params: RetentionParams
): Promise<RetentionCohortsResult | null> {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  if (!auth) return null;
  if (!db) return null;

  const warnings: string[] = [];
  const activeDefinition = params.activeDefinition ?? 'session';
  const qualifyingActions = getQualifyingActions(activeDefinition);
  let cohorts: RetentionCohortRow[];
  let periods: number;
  let granularity: 'week' | 'day';

  if (params.granularity === 'week') {
    const { cohortWeeks, periods: p } = params;
    cohorts = await computeWeeklyRetention(
      auth,
      db,
      cohortWeeks,
      p,
      qualifyingActions,
      warnings
    );
    periods = p;
    granularity = 'week';
  } else {
    const { cohortDays, periods: p } = params;
    cohorts = await computeDailyRetention(
      auth,
      db,
      cohortDays,
      p,
      qualifyingActions,
      warnings
    );
    periods = p;
    granularity = 'day';
  }

  const kpis = computePooledKpis(cohorts, granularity, periods);

  return {
    granularity,
    activeDefinition,
    cohorts,
    source: 'firebase',
    enabled: true,
    kpis: kpis.length ? kpis : undefined,
    warnings: warnings.length ? warnings : undefined,
  };
}
