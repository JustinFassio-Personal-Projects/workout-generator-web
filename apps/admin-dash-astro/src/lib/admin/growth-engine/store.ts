import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { LEAD_SCORE_SPEC_V1, LEAD_SCORE_VERSION_V1 } from './lead-score-spec-v1';
import { computeLeadScoreV1 } from './lead-score-v1';
import type { GrowthEngineCard } from './types';
import type { GrowthPipelineRow, GrowthState } from './types';

export type DailyBriefRow = {
  id: string;
  generated_at: string;
  rule_pack_version: string;
  insight_run_id: string;
  summary: {
    cards: GrowthEngineCard[];
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
};

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205';
}

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703';
}

export async function insertDailyBrief(input: {
  rulePackVersion: string;
  insightRunId: string;
  cards: GrowthEngineCard[];
  metrics?: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('daily_brief')
    .insert({
      rule_pack_version: input.rulePackVersion,
      insight_run_id: input.insightRunId,
      summary: { cards: input.cards },
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

export async function upsertLeadScoreSpecVersion() {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from('growth_lead_score_versions')
    .upsert(
      {
        version: LEAD_SCORE_VERSION_V1,
        spec_json: LEAD_SCORE_SPEC_V1,
      },
      { onConflict: 'version' }
    )
    .select('version')
    .single();

  if (error || !data) {
    if (isMissingTableError(error)) {
      return { version: LEAD_SCORE_VERSION_V1 };
    }
    throw error ?? new Error('Failed to upsert lead score version');
  }
  return data as { version: string };
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

  const { data: rows, error } = await supabase
    .from('analytics_funnel_events')
    .select('user_id, event_name, timestamp')
    .in('user_id', userIds)
    .gte('timestamp', from30d)
    .limit(50000);
  if (error) throw error;

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

  for (const row of rows ?? []) {
    const userId = (row as { user_id: string | null }).user_id;
    const eventName = (row as { event_name: string }).event_name;
    const ts = (row as { timestamp: string }).timestamp;
    if (!userId || !byUser.has(userId)) continue;
    const s = byUser.get(userId)!;

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

export async function getGrowthPipelineRows(params?: {
  limit?: number;
  cursor?: string | null;
  growthState?: GrowthState | null;
  sort?: 'score_desc' | 'score_asc';
}): Promise<{ rows: GrowthPipelineRow[]; nextCursor: string | null; scoreVersion: string }> {
  const supabase = getSupabaseServiceRole();
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  const sort = params?.sort ?? 'score_desc';
  const growthStateRequired =
    process.env.GROWTH_STATE_REQUIRED === 'true' || process.env.GROWTH_STATE_REQUIRED === '1';

  let query = supabase
    .from('profiles')
    .select('id, trial_ends_at, purchased_index, growth_state')
    .order('id', { ascending: false })
    .limit(limit + 1);
  if (params?.cursor) query = query.lt('id', params.cursor);
  if (params?.growthState) query = query.eq('growth_state', params.growthState);

  let data: PipelineProfileRow[] | null = null;
  let error: unknown = null;
  {
    const result = await query;
    data = (result.data as PipelineProfileRow[] | null) ?? null;
    error = result.error;
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

  const userIds = selected.map((row) => row.id);
  const signalsByUser = userIds.length ? await getRecentFunnelSignalsByUser(userIds) : new Map();

  const rows: GrowthPipelineRow[] = selected.map((row) => {
    const signals = signalsByUser.get(row.id) ?? {
      checkoutStarted7d: false,
      checkoutAbandoned48h: false,
      returnSuccessNoActivation: false,
      workoutSignals30d: 0,
    };
    const score = computeLeadScoreV1({
      growthState: row.growth_state,
      checkoutStarted7d: signals.checkoutStarted7d,
      checkoutAbandoned48h: signals.checkoutAbandoned48h,
      returnSuccessNoActivation: signals.returnSuccessNoActivation,
      workoutSignals30d: signals.workoutSignals30d,
    });
    const displayLabel = `User ${row.id.slice(0, 8)}`;
    const insight = signals.checkoutAbandoned48h
      ? 'Recent checkout abandonment detected; prioritize immediate recovery outreach.'
      : signals.checkoutStarted7d
        ? 'Recent checkout start indicates conversion intent; follow-up while intent is high.'
        : 'Moderate conversion intent; validate onboarding and value reinforcement.';

    return {
      uid: row.id,
      displayLabel,
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
  const nextCursor = hasMore ? selected[selected.length - 1]?.id ?? null : null;
  return { rows, nextCursor, scoreVersion: LEAD_SCORE_VERSION_V1 };
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
