import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { LEAD_SCORE_SPEC_V1, LEAD_SCORE_VERSION_V1 } from './lead-score-spec-v1';
import { LEAD_SCORE_SPEC_V2, LEAD_SCORE_VERSION_V2 } from './lead-score-spec-v2';
import { computeLeadScoreV2 } from './lead-score-v2';
import {
  getGrowthPipelineUserSource,
  listPipelineUsersFromFirestore,
} from './pipeline-users-firestore';
import type { GrowthEngineCard, GrowthEngineNarrative } from './types';
import type { GrowthPipelineRow, GrowthState } from './types';

export type DailyBriefRow = {
  id: string;
  generated_at: string;
  rule_pack_version: string;
  insight_run_id: string;
  summary: {
    cards: GrowthEngineCard[];
    narrative?: GrowthEngineNarrative;
  };
  metrics: Record<string, unknown> | null;
};

export type RealtimeAlertRow = {
  id: string;
  created_at: string;
  resolved_at: string | null;
  alert_type: string;
  dedupe_key: string;
  user_id: string | null;
  severity: 'P1' | 'P2' | 'P3';
  payload: Record<string, unknown>;
  source: string;
};

type PipelineProfileRow = {
  id: string;
  trial_ends_at: string | null;
  purchased_index: number | null;
  growth_state: GrowthState | null;
  full_name: string | null;
  email: string | null;
  firebase_uid: string | null;
};

type PipelineSeedRow = {
  id: string;
  trial_ends_at: string | null;
  purchased_index: number | null;
  growth_state: GrowthState | null;
  full_name: string | null;
  email: string | null;
  firebase_uid: string | null;
};

function pipelineDisplayName(row: PipelineProfileRow): string | null {
  const name = row.full_name?.trim();
  if (name) return name;
  const email = row.email?.trim();
  if (!email) return null;
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at).trim() || null : email;
}

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205';
}

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703';
}

/** Supabase `profiles.id` / `analytics_funnel_events.user_id` (when set) are UUIDs; Hub pipeline uses Firebase UIDs. */
const PROFILE_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSupabaseProfileUuid(id: string): boolean {
  return PROFILE_UUID_REGEX.test(id);
}

export async function insertDailyBrief(input: {
  rulePackVersion: string;
  insightRunId: string;
  cards: GrowthEngineCard[];
  narrative?: GrowthEngineNarrative;
  metrics?: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceRole();
  const summary: { cards: GrowthEngineCard[]; narrative?: GrowthEngineNarrative } = {
    cards: input.cards,
  };
  if (input.narrative) {
    summary.narrative = input.narrative;
  }
  const { data, error } = await supabase
    .from('daily_brief')
    .insert({
      rule_pack_version: input.rulePackVersion,
      insight_run_id: input.insightRunId,
      summary,
      metrics: input.metrics ?? null,
      source: 'batch',
    })
    .select('id, generated_at, rule_pack_version, insight_run_id, summary, metrics')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to write daily_brief');
  }
  return data as DailyBriefRow;
}

export async function getLatestDailyBrief(): Promise<DailyBriefRow | null> {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('daily_brief')
    .select('id, generated_at, rule_pack_version, insight_run_id, summary, metrics')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return (data as DailyBriefRow | null) ?? null;
}

export async function getActiveRealtimeAlerts(limit = 50): Promise<RealtimeAlertRow[]> {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('growth_realtime_alerts')
    .select('id, created_at, resolved_at, alert_type, dedupe_key, user_id, severity, payload, source')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data as RealtimeAlertRow[]) ?? [];
}

const NOTES_EXCERPT_MAX = 200;

export async function getRecentInterventionsForNarrative(params?: {
  limit?: number;
  days?: number;
}): Promise<
  Array<{
    id: string;
    created_at: string;
    directive_id: string | null;
    directive_type: string | null;
    channel: string | null;
    target_type: string;
    notes_excerpt: string | null;
  }>
> {
  const limit = Math.min(50, Math.max(1, params?.limit ?? 20));
  const days = Math.min(90, Math.max(1, params?.days ?? 7));
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabaseServiceRole();
  let data: unknown[] | null = null;
  let error: unknown = null;
  {
    const result = await supabase
      .from('intervention_logs')
      .select('id, created_at, directive_id, directive_type, channel, target_type, notes')
      .gte('created_at', from)
      .order('created_at', { ascending: false })
      .limit(limit);
    data = result.data as unknown[] | null;
    error = result.error;
  }
  if (error && (isMissingTableError(error) || isMissingColumnError(error))) {
    return [];
  }
  if (error) throw error;

  return (data ?? []).map((row) => {
    const notes = (row as { notes?: string | null }).notes;
    const excerpt =
      typeof notes === 'string' && notes.length > NOTES_EXCERPT_MAX
        ? `${notes.slice(0, NOTES_EXCERPT_MAX)}…`
        : notes ?? null;
    return {
      id: (row as { id: string }).id,
      created_at: (row as { created_at: string }).created_at,
      directive_id: (row as { directive_id: string | null }).directive_id ?? null,
      directive_type: (row as { directive_type?: string | null }).directive_type ?? null,
      channel: (row as { channel?: string | null }).channel ?? null,
      target_type: (row as { target_type: string }).target_type,
      notes_excerpt: excerpt,
    };
  });
}

export async function getRealtimeAlertSummaryForNarrative(): Promise<{
  activeCount: number;
  bySeverity: Record<string, number>;
  byAlertType: Record<string, number>;
}> {
  const alerts = await getActiveRealtimeAlerts(500);
  const bySeverity: Record<string, number> = {};
  const byAlertType: Record<string, number> = {};
  for (const a of alerts) {
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
    byAlertType[a.alert_type] = (byAlertType[a.alert_type] ?? 0) + 1;
  }
  return {
    activeCount: alerts.length,
    bySeverity,
    byAlertType,
  };
}

export async function upsertLeadScoreSpecVersion() {
  const supabase = getSupabaseServiceRole();
  const versions = [
    { version: LEAD_SCORE_VERSION_V1, spec_json: LEAD_SCORE_SPEC_V1 },
    { version: LEAD_SCORE_VERSION_V2, spec_json: LEAD_SCORE_SPEC_V2 },
  ];
  let lastVersion = LEAD_SCORE_VERSION_V2;
  for (const row of versions) {
    const { data, error } = await supabase
      .from('growth_lead_score_versions')
      .upsert(row, { onConflict: 'version' })
      .select('version')
      .single();
    if (error) {
      if (isMissingTableError(error)) {
        return { version: lastVersion };
      }
      throw error;
    }
    if (data) lastVersion = (data as { version: string }).version;
  }
  return { version: lastVersion };
}

async function getRecentFunnelSignalsByUser(userIds: string[]): Promise<
  Map<
    string,
    {
      checkoutStarted7d: boolean;
      checkoutAbandoned48h: boolean;
      returnSuccessNoActivation: boolean;
      workoutSignals30d: number;
    }
  >
> {
  const supabase = getSupabaseServiceRole();
  const now = new Date();
  const from30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const from7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const from48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const uuidIds = userIds.filter(isSupabaseProfileUuid);
  const firebaseIds = new Set(userIds.filter((id) => !isSupabaseProfileUuid(id)));

  /** Map Hub firebase_uid → Supabase profile UUID (mirrored profiles). */
  const firebaseUidToProfileId = new Map<string, string>();
  if (uuidIds.length > 0) {
    const { data, error } = await supabase.from('profiles').select('id, firebase_uid').in('id', uuidIds);
    if (!error && data) {
      for (const r of data as Array<{ id: string; firebase_uid?: string | null }>) {
        const fb = r.firebase_uid;
        if (typeof fb === 'string' && fb) firebaseUidToProfileId.set(fb, r.id);
      }
    }
    // Missing column: treat as no links (funnel still uses user_id for UUID rows).
  }

  for (const fb of firebaseUidToProfileId.keys()) firebaseIds.add(fb);

  const funnelSelect = 'id, user_id, event_name, timestamp, properties';

  const rows: Array<{
    id: string;
    user_id: string | null;
    event_name: string;
    timestamp: string;
    properties?: Record<string, unknown> | null;
  }> = [];

  if (uuidIds.length > 0) {
    const { data, error } = await supabase
      .from('analytics_funnel_events')
      .select(funnelSelect)
      .in('user_id', uuidIds)
      .gte('timestamp', from30d)
      .limit(50000);
    if (error) throw error;
    rows.push(...((data ?? []) as typeof rows));
  }

  const firebaseKeys = Array.from(firebaseIds);
  if (firebaseKeys.length > 0) {
    const { data, error } = await supabase
      .from('analytics_funnel_events')
      .select(funnelSelect)
      .in('properties->>firebase_uid', firebaseKeys)
      .gte('timestamp', from30d)
      .limit(50000);
    if (error) throw error;
    rows.push(...((data ?? []) as typeof rows));
  }

  const seenIds = new Set<string>();
  const deduped: typeof rows = [];
  for (const r of rows) {
    if (seenIds.has(r.id)) continue;
    seenIds.add(r.id);
    deduped.push(r);
  }

  const byUser = new Map<
    string,
    {
      checkoutStarted7d: boolean;
      checkoutAbandoned48h: boolean;
      returnSuccessNoActivation: boolean;
      workoutSignals30d: number;
      hadReturnSuccess: boolean;
      hadActivation: boolean;
    }
  >();

  for (const uid of userIds) {
    byUser.set(uid, {
      checkoutStarted7d: false,
      checkoutAbandoned48h: false,
      returnSuccessNoActivation: false,
      workoutSignals30d: 0,
      hadReturnSuccess: false,
      hadActivation: false,
    });
  }

  for (const row of deduped) {
    const rowObj = row as {
      user_id: string | null;
      event_name: string;
      timestamp: string;
      properties?: Record<string, unknown> | null;
    };
    const firebaseUid = typeof rowObj.properties?.firebase_uid === 'string' ? rowObj.properties.firebase_uid : null;
    // Prefer whichever id exists in byUser (Firebase pipeline keys by Hub UID; mirrored profiles use UUID id).
    let keyedUserId: string | null = null;
    for (const candidate of [firebaseUid, rowObj.user_id]) {
      if (typeof candidate === 'string' && candidate && byUser.has(candidate)) {
        keyedUserId = candidate;
        break;
      }
    }
    if (!keyedUserId && firebaseUid && firebaseUidToProfileId.has(firebaseUid)) {
      const profileId = firebaseUidToProfileId.get(firebaseUid)!;
      if (byUser.has(profileId)) keyedUserId = profileId;
    }
    const eventName = (row as { event_name: string }).event_name;
    const ts = (row as { timestamp: string }).timestamp;
    if (!keyedUserId) continue;
    const s = byUser.get(keyedUserId)!;

    if (eventName === 'purchase_cta_checkout_started' && ts >= from7d) s.checkoutStarted7d = true;
    if (eventName === 'purchase_checkout_session_created' && ts >= from48h) s.checkoutAbandoned48h = true;
    if (eventName === 'purchase_return_success') s.hadReturnSuccess = true;
    if (eventName === 'purchase_subscription_activated') s.hadActivation = true;
    if (eventName === 'workout_generated' || eventName === 'workout_completed') {
      s.workoutSignals30d += 1;
    }
  }

  const result = new Map<
    string,
    {
      checkoutStarted7d: boolean;
      checkoutAbandoned48h: boolean;
      returnSuccessNoActivation: boolean;
      workoutSignals30d: number;
    }
  >();
  for (const [uid, s] of byUser.entries()) {
    const checkoutAbandoned48h = s.checkoutAbandoned48h && !s.hadReturnSuccess && !s.hadActivation;
    result.set(uid, {
      checkoutStarted7d: s.checkoutStarted7d,
      checkoutAbandoned48h,
      returnSuccessNoActivation: s.hadReturnSuccess && !s.hadActivation,
      workoutSignals30d: s.workoutSignals30d,
    });
  }
  return result;
}

async function listPipelineSeedRowsFromSupabase(params?: {
  limit?: number;
  cursor?: string | null;
  growthState?: GrowthState | null;
}): Promise<{ rows: PipelineSeedRow[]; nextCursor: string | null }> {
  const supabase = getSupabaseServiceRole();
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  const growthStateRequired =
    process.env.GROWTH_STATE_REQUIRED === 'true' || process.env.GROWTH_STATE_REQUIRED === '1';

  async function runProfilesSelect(select: string) {
    let q = supabase.from('profiles').select(select).order('id', { ascending: false }).limit(limit + 1);
    if (params?.cursor) q = q.lt('id', params.cursor);
    if (params?.growthState) q = q.eq('growth_state', params.growthState);
    return q;
  }

  let data: PipelineProfileRow[] | null = null;
  let error: unknown = null;
  {
    const result = await runProfilesSelect(
      'id, trial_ends_at, purchased_index, growth_state, full_name, email, firebase_uid'
    );
    data = (result.data as PipelineProfileRow[] | null) ?? null;
    error = result.error;
  }
  if (error && isMissingColumnError(error)) {
    const retry = await runProfilesSelect('id, trial_ends_at, purchased_index, growth_state, full_name, email');
    if (!retry.error) {
      data = ((retry.data ?? []) as unknown as PipelineProfileRow[]).map((row) => ({
        ...row,
        firebase_uid: null,
      }));
      error = null;
    } else {
      error = retry.error;
    }
  }
  if (error && isMissingColumnError(error)) {
    const retry2 = await runProfilesSelect('id, trial_ends_at, purchased_index, growth_state');
    if (!retry2.error) {
      data = (
        (retry2.data ?? []) as unknown as Array<{
          id: string;
          trial_ends_at: string | null;
          purchased_index: number | null;
          growth_state: GrowthState | null;
        }>
      ).map((row) => ({
        ...row,
        full_name: null,
        email: null,
        firebase_uid: null,
      }));
      error = null;
    } else {
      error = retry2.error;
    }
  }
  if (error && isMissingColumnError(error)) {
    let fallbackQuery = supabase
      .from('profiles')
      .select('id, purchased_index')
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (params?.cursor) fallbackQuery = fallbackQuery.lt('id', params.cursor);
    const fallback = await fallbackQuery;
    if (fallback.error) throw fallback.error;
    data = ((fallback.data ?? []) as Array<{ id: string; purchased_index: number | null }>).map((row) => ({
      id: row.id,
      purchased_index: row.purchased_index,
      growth_state: null,
      trial_ends_at: null,
      full_name: null,
      email: null,
      firebase_uid: null,
    }));
    error = null;
  }
  if (error) throw error;
  const rawRows = data ?? [];
  const hasMore = rawRows.length > limit;
  const selectedPreFilter = hasMore ? rawRows.slice(0, limit) : rawRows;
  const selected = growthStateRequired
    ? selectedPreFilter.filter((row) => Boolean(row.growth_state))
    : selectedPreFilter;
  const nextCursor = hasMore ? selected[selected.length - 1]?.id ?? null : null;
  return { rows: selected, nextCursor };
}

export async function getGrowthPipelineRows(params?: {
  limit?: number;
  cursor?: string | null;
  growthState?: GrowthState | null;
  sort?: 'score_desc' | 'score_asc';
}): Promise<{ rows: GrowthPipelineRow[]; nextCursor: string | null; scoreVersion: string }> {
  const sort = params?.sort ?? 'score_desc';
  const source = getGrowthPipelineUserSource();
  let selected: PipelineSeedRow[] = [];
  let nextCursor: string | null = null;
  if (source === 'firebase') {
    const out = await listPipelineUsersFromFirestore({
      limit: params?.limit,
      cursor: params?.cursor,
      growthState: params?.growthState,
    });
    selected = out.users.map((row) => ({
      id: row.id,
      trial_ends_at: row.trialEndsAt,
      purchased_index: row.purchasedIndex,
      growth_state: row.growthState,
      full_name: row.displayName,
      email: row.email,
      firebase_uid: row.id,
    }));
    nextCursor = out.nextCursor;
  } else {
    const out = await listPipelineSeedRowsFromSupabase(params);
    selected = out.rows;
    nextCursor = out.nextCursor;
  }

  const userIds = selected.map((row) => row.id);
  const signalsByUser = userIds.length ? await getRecentFunnelSignalsByUser(userIds) : new Map();

  const rows: GrowthPipelineRow[] = selected.map((row) => {
    const signals = signalsByUser.get(row.id) ?? {
      checkoutStarted7d: false,
      checkoutAbandoned48h: false,
      returnSuccessNoActivation: false,
      workoutSignals30d: 0,
    };
    const score = computeLeadScoreV2({
      growthState: row.growth_state,
      checkoutStarted7d: signals.checkoutStarted7d,
      checkoutAbandoned48h: signals.checkoutAbandoned48h,
      returnSuccessNoActivation: signals.returnSuccessNoActivation,
      workoutSignals30d: signals.workoutSignals30d,
    });
    const displayLabel = `User ${row.id.slice(0, 8)}`;
    const displayName = pipelineDisplayName(row);
    const insight = signals.checkoutAbandoned48h
      ? 'Recent checkout abandonment detected; prioritize immediate recovery outreach.'
      : signals.checkoutStarted7d
        ? 'Recent checkout start indicates conversion intent; follow-up while intent is high.'
        : 'Moderate conversion intent; validate onboarding and value reinforcement.';

    return {
      uid: row.id,
      displayLabel,
      displayName,
      email: row.email,
      firebaseUid: row.firebase_uid,
      growthState: row.growth_state,
      trialEndsAt: row.trial_ends_at,
      purchasedIndex: row.purchased_index,
      leadScore: score.score,
      scoreVersion: score.scoreVersion,
      drivers: score.drivers,
      insight,
      recommendedTrigger: signals.checkoutAbandoned48h ? 'checkout_recovery_push' : 'value_reinforcement_email',
    };
  });

  rows.sort((a, b) => (sort === 'score_asc' ? a.leadScore - b.leadScore : b.leadScore - a.leadScore));
  return { rows, nextCursor, scoreVersion: LEAD_SCORE_VERSION_V2 };
}

export async function logGrowthPipelineExport(input: {
  actorId: string;
  rowCount: number;
  filters: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceRole();
  const { error } = await supabase.from('growth_pipeline_export_logs').insert({
    actor_id: input.actorId,
    row_count: input.rowCount,
    filters_json: input.filters,
  });
  if (error && !isMissingTableError(error)) throw error;
}
