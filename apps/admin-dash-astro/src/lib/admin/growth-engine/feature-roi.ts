import admin from 'firebase-admin';

import { getFirebaseFirestore, isFirebaseConfigured } from '@/lib/firebase/admin';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import type {
  GrowthFeatureRoiAdoptionBucket,
  GrowthFeatureRoiCorrelationTier,
  GrowthFeatureRoiRow,
  GrowthFeatureRoiSource,
} from './types';

type FeatureDefinitionRow = {
  feature_key: string;
  display_label: string;
  source: GrowthFeatureRoiSource;
  event_names: string[] | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
};

type SourceSignals = {
  distinctUsers30dByFeature: Map<string, Set<string>>;
  firstByFeatureUser: Map<string, Map<string, number>>;
  firstAnyByUser: Map<string, number>;
  upgradedByUser: Map<string, number>;
  warnings: string[];
};

const UPGRADE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TREATED_MIN_SAMPLE = 20;
const ADOPTION_HIGH_USERS_30D = 25;

const UPGRADE_FUNNEL_EVENTS = ['purchase_subscription_activated', 'purchase_return_success'];
const HUB_UPGRADE_ACTION = 'subscription:upgrade';

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205';
}

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703';
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function getCorrelationTier(treatedUsers: number, upgradeRate: number, baselineRate: number): GrowthFeatureRoiCorrelationTier {
  if (treatedUsers < TREATED_MIN_SAMPLE) return 'unknown';
  const uplift = upgradeRate - baselineRate;
  if (uplift >= 0.05) return 'strong';
  return 'weak';
}

function getAdoptionBucket(distinctUsers30d: number): GrowthFeatureRoiAdoptionBucket {
  return distinctUsers30d >= ADOPTION_HIGH_USERS_30D ? 'high' : 'low';
}

function buildDirective(
  tier: GrowthFeatureRoiCorrelationTier,
  adoption: GrowthFeatureRoiAdoptionBucket,
  label: string,
  notes: string | null
): string {
  if (tier === 'unknown') {
    if (notes?.trim()) return notes.trim();
    return `Instrumentation or sample size is insufficient for ${label}. Validate events and collect more data before claiming ROI.`;
  }
  if (tier === 'strong' && adoption === 'high') {
    return `${label} shows strong conversion correlation at current adoption. Prioritize reliability and scale this behavior in lifecycle messaging.`;
  }
  if (tier === 'strong') {
    return `${label} shows strong conversion correlation but low adoption. Add onboarding prompts to increase exposure to this behavior.`;
  }
  if (adoption === 'high') {
    return `${label} adoption is healthy but correlation is weak. Run UX tests to improve completion quality before scaling traffic.`;
  }
  return `${label} currently has low adoption and weak correlation. Keep as backlog and revisit after higher-signal features are optimized.`;
}

async function listActiveDefinitions(): Promise<FeatureDefinitionRow[]> {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('growth_feature_roi_definitions')
    .select('feature_key, display_label, source, event_names, notes, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) return [];
    throw error;
  }
  return (data as FeatureDefinitionRow[]) ?? [];
}

async function fetchSupabaseSignals(
  definitions: FeatureDefinitionRow[],
  days: number,
  correlationWindowDays: number
): Promise<SourceSignals> {
  const supabase = getSupabaseServiceRole();
  const now = new Date();
  const from30d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const fromCorrelation = new Date(
    now.getTime() - correlationWindowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const toIso = now.toISOString();

  const sourceDefs = definitions.filter((d) => d.source === 'supabase_funnel');
  const eventNames = Array.from(
    new Set(sourceDefs.flatMap((d) => (d.event_names ?? []).filter(Boolean)))
  );

  const distinctUsers30dByFeature = new Map<string, Set<string>>();
  const firstByFeatureUser = new Map<string, Map<string, number>>();
  const firstAnyByUser = new Map<string, number>();
  const upgradedByUser = new Map<string, number>();

  for (const def of sourceDefs) {
    distinctUsers30dByFeature.set(def.feature_key, new Set());
    firstByFeatureUser.set(def.feature_key, new Map());
  }

  if (eventNames.length) {
    const { data: adoptionRows, error: adoptionError } = await supabase
      .from('analytics_funnel_events')
      .select('user_id, event_name, timestamp')
      .in('event_name', eventNames)
      .gte('timestamp', from30d)
      .lte('timestamp', toIso)
      .not('user_id', 'is', null)
      .limit(20000);

    if (adoptionError && !isMissingTableError(adoptionError) && !isMissingColumnError(adoptionError)) {
      throw adoptionError;
    }

    for (const row of adoptionRows ?? []) {
      const userId = (row as { user_id: string | null }).user_id;
      const eventName = (row as { event_name: string }).event_name;
      if (!userId) continue;
      for (const def of sourceDefs) {
        if (!(def.event_names ?? []).includes(eventName)) continue;
        distinctUsers30dByFeature.get(def.feature_key)?.add(userId);
      }
    }

    const { data: correlationRows, error: correlationError } = await supabase
      .from('analytics_funnel_events')
      .select('user_id, event_name, timestamp')
      .in('event_name', eventNames)
      .gte('timestamp', fromCorrelation)
      .lte('timestamp', toIso)
      .not('user_id', 'is', null)
      .order('timestamp', { ascending: true })
      .limit(50000);

    if (correlationError && !isMissingTableError(correlationError) && !isMissingColumnError(correlationError)) {
      throw correlationError;
    }

    for (const row of correlationRows ?? []) {
      const userId = (row as { user_id: string | null }).user_id;
      const eventName = (row as { event_name: string }).event_name;
      const timestamp = (row as { timestamp: string }).timestamp;
      if (!userId || !timestamp) continue;
      const tsMs = new Date(timestamp).getTime();
      const existingAny = firstAnyByUser.get(userId);
      if (existingAny == null || tsMs < existingAny) firstAnyByUser.set(userId, tsMs);
      for (const def of sourceDefs) {
        if (!(def.event_names ?? []).includes(eventName)) continue;
        const featureMap = firstByFeatureUser.get(def.feature_key);
        if (!featureMap) continue;
        const existing = featureMap.get(userId);
        if (existing == null || tsMs < existing) {
          featureMap.set(userId, tsMs);
        }
      }
    }
  }

  const { data: upgradeRows, error: upgradeError } = await supabase
    .from('analytics_funnel_events')
    .select('user_id, timestamp')
    .in('event_name', UPGRADE_FUNNEL_EVENTS)
    .gte('timestamp', fromCorrelation)
    .lte('timestamp', toIso)
    .not('user_id', 'is', null)
    .order('timestamp', { ascending: true })
    .limit(50000);

  if (upgradeError && !isMissingTableError(upgradeError) && !isMissingColumnError(upgradeError)) {
    throw upgradeError;
  }

  for (const row of upgradeRows ?? []) {
    const userId = (row as { user_id: string | null }).user_id;
    const timestamp = (row as { timestamp: string }).timestamp;
    if (!userId || !timestamp) continue;
    const tsMs = new Date(timestamp).getTime();
    const existing = upgradedByUser.get(userId);
    if (existing == null || tsMs < existing) upgradedByUser.set(userId, tsMs);
  }

  return {
    distinctUsers30dByFeature,
    firstByFeatureUser,
    firstAnyByUser,
    upgradedByUser,
    warnings: [],
  };
}

async function fetchHubSignals(
  definitions: FeatureDefinitionRow[],
  days: number,
  correlationWindowDays: number
): Promise<SourceSignals> {
  const sourceDefs = definitions.filter((d) => d.source === 'hub_firestore');
  const distinctUsers30dByFeature = new Map<string, Set<string>>();
  const firstByFeatureUser = new Map<string, Map<string, number>>();
  const firstAnyByUser = new Map<string, number>();
  const upgradedByUser = new Map<string, number>();
  const warnings: string[] = [];

  for (const def of sourceDefs) {
    distinctUsers30dByFeature.set(def.feature_key, new Set());
    firstByFeatureUser.set(def.feature_key, new Map());
  }

  if (!sourceDefs.length) {
    return { distinctUsers30dByFeature, firstByFeatureUser, firstAnyByUser, upgradedByUser, warnings };
  }

  if (!isFirebaseConfigured()) {
    warnings.push('Firebase is not configured. Hub feature ROI rows are skipped.');
    return { distinctUsers30dByFeature, firstByFeatureUser, firstAnyByUser, upgradedByUser, warnings };
  }

  const db = getFirebaseFirestore();
  if (!db) {
    warnings.push('Firestore is unavailable. Hub feature ROI rows are skipped.');
    return { distinctUsers30dByFeature, firstByFeatureUser, firstAnyByUser, upgradedByUser, warnings };
  }

  const now = new Date();
  const from30Date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const fromCorrelationDate = new Date(now.getTime() - correlationWindowDays * 24 * 60 * 60 * 1000);
  const start = admin.firestore.Timestamp.fromDate(fromCorrelationDate);
  const end = admin.firestore.Timestamp.fromDate(now);
  const collectionName = process.env.FIREBASE_USER_ACTIVITY_COLLECTION ?? 'user_activity_logs';
  const pageSize = 500;
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;

  const featureActions = new Map<string, Set<string>>();
  for (const def of sourceDefs) {
    featureActions.set(def.feature_key, new Set((def.event_names ?? []).filter(Boolean)));
  }

  try {
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
        const userId = data?.user_id;
        const ts = data?.timestamp;
        if (typeof action !== 'string' || typeof userId !== 'string' || !ts || typeof ts.toDate !== 'function') {
          continue;
        }
        const tsMs = ts.toDate().getTime();

        if (tsMs >= from30Date.getTime()) {
          for (const def of sourceDefs) {
            if (featureActions.get(def.feature_key)?.has(action)) {
              distinctUsers30dByFeature.get(def.feature_key)?.add(userId);
            }
          }
        }

        const anyExisting = firstAnyByUser.get(userId);
        if (anyExisting == null || tsMs < anyExisting) firstAnyByUser.set(userId, tsMs);

        for (const def of sourceDefs) {
          if (!featureActions.get(def.feature_key)?.has(action)) continue;
          const featureMap = firstByFeatureUser.get(def.feature_key);
          if (!featureMap) continue;
          const existing = featureMap.get(userId);
          if (existing == null || tsMs < existing) {
            featureMap.set(userId, tsMs);
          }
        }

        if (action === HUB_UPGRADE_ACTION) {
          const existingUpgrade = upgradedByUser.get(userId);
          if (existingUpgrade == null || tsMs < existingUpgrade) {
            upgradedByUser.set(userId, tsMs);
          }
        }
      }

      if (snapshot.docs.length < pageSize) break;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Firestore (feature ROI): ${message}`);
  }

  return { distinctUsers30dByFeature, firstByFeatureUser, firstAnyByUser, upgradedByUser, warnings };
}

function countUpgradedWithin7d(firstByUser: Map<string, number>, upgradedByUser: Map<string, number>): number {
  let count = 0;
  for (const [userId, firstTs] of firstByUser.entries()) {
    const upgradeTs = upgradedByUser.get(userId);
    if (upgradeTs != null && upgradeTs >= firstTs && upgradeTs <= firstTs + UPGRADE_WINDOW_MS) {
      count += 1;
    }
  }
  return count;
}

export async function getGrowthFeatureRoi(params?: {
  days?: number;
  correlationWindowDays?: number;
}): Promise<{ generatedAt: string; rows: GrowthFeatureRoiRow[]; warnings: string[] }> {
  const days = Math.min(90, Math.max(7, params?.days ?? 30));
  const correlationWindowDays = Math.min(180, Math.max(days, params?.correlationWindowDays ?? 90));
  const definitions = await listActiveDefinitions();
  if (!definitions.length) {
    return {
      generatedAt: new Date().toISOString(),
      rows: [],
      warnings: ['No active growth_feature_roi_definitions rows found.'],
    };
  }

  const [hubSignals, supabaseSignals] = await Promise.all([
    fetchHubSignals(definitions, days, correlationWindowDays),
    fetchSupabaseSignals(definitions, days, correlationWindowDays),
  ]);

  const rows: GrowthFeatureRoiRow[] = [];
  const warnings = [...hubSignals.warnings, ...supabaseSignals.warnings];

  for (const def of definitions) {
    const signals = def.source === 'hub_firestore' ? hubSignals : supabaseSignals;
    const featureFirstByUser = signals.firstByFeatureUser.get(def.feature_key) ?? new Map<string, number>();
    const distinctUsers30d = signals.distinctUsers30dByFeature.get(def.feature_key)?.size ?? 0;
    const treatedUsers = featureFirstByUser.size;
    const upgradedWithin7d = countUpgradedWithin7d(featureFirstByUser, signals.upgradedByUser);
    const upgradeRate = toRate(upgradedWithin7d, treatedUsers);
    const baselineTreated = signals.firstAnyByUser.size;
    const baselineUpgraded = countUpgradedWithin7d(signals.firstAnyByUser, signals.upgradedByUser);
    const baselineRate = toRate(baselineUpgraded, baselineTreated);
    const adoptionBucket = getAdoptionBucket(distinctUsers30d);
    const correlationTier = getCorrelationTier(treatedUsers, upgradeRate, baselineRate);

    rows.push({
      featureKey: def.feature_key,
      label: def.display_label,
      source: def.source,
      adoptionBucket,
      correlationTier,
      distinctUsers30d,
      treatedUsers,
      upgradedWithin7d,
      upgradeRate,
      baselineRate,
      directive: buildDirective(correlationTier, adoptionBucket, def.display_label, def.notes),
      evidence: {
        path: def.source === 'hub_firestore' ? '/analytics/details/engagement' : '/analytics/details/monetization-dropoff',
        label: def.source === 'hub_firestore' ? 'View engagement detail' : 'View monetization drop-off detail',
      },
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    rows,
    warnings,
  };
}
