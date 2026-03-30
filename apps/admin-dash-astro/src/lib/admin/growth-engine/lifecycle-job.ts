import { getSupabaseServiceRole } from '@/lib/supabase/server';

import type { GrowthState } from './types';

export type LifecycleCampaignDef = {
  id: string;
  growthStates: GrowthState[];
  channel: 'email' | 'push';
};

/** v1 campaigns — extend when adding provider sends or push. */
export const LIFECYCLE_CAMPAIGNS_V1: LifecycleCampaignDef[] = [
  {
    id: 'lifecycle_reverse_trial_expiring_v1',
    growthStates: ['reverse_trial_expiring'],
    channel: 'email',
  },
  {
    id: 'lifecycle_reverse_trial_expired_v1',
    growthStates: ['reverse_trial_expired'],
    channel: 'email',
  },
  {
    id: 'lifecycle_churned_winback_v1',
    growthStates: ['churned'],
    channel: 'email',
  },
];

function envTruthy(name: string): boolean {
  const v = (process.env[name] ?? '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

/** When true, `runGrowthEngineBatchJob` runs lifecycle automation after the narrative step (see REVERSE_TRIAL_ROADMAP Phase 5). */
export function isLifecycleJobOnBatchEnabled(): boolean {
  return envTruthy('LIFECYCLE_JOB_ON_BATCH');
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703' || code === 'PGRST204';
}

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205';
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '23505';
}

export function buildLifecycleIdempotencyKey(
  campaignId: string,
  profileId: string,
  utcDateKey: string
): string {
  return `${campaignId}:${profileId}:${utcDateKey}`;
}

export function utcDateKeyForLifecycle(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

type ProfileLifecycleRow = {
  id: string;
  purchased_index: number | null;
  growth_state: GrowthState | null;
  lifecycle_email_opt_out?: boolean | null;
};

export type LifecycleJobCampaignResult = {
  campaignId: string;
  evaluated: number;
  logged: number;
  skipped: { optOut: number; cap: number; premium: number; duplicate: number };
};

export type LifecycleJobResult = {
  ok: boolean;
  skippedReason?: string;
  dryRun: boolean;
  sendsEnabled: boolean;
  providerConfigured: boolean;
  dateKey: string;
  campaigns: LifecycleJobCampaignResult[];
};

function isPremiumRow(row: ProfileLifecycleRow): boolean {
  return typeof row.purchased_index === 'number' && row.purchased_index >= 0;
}

async function countRecentLifecycleTouches(
  supabase: ReturnType<typeof getSupabaseServiceRole>,
  profileId: string,
  sinceIso: string
): Promise<number | null> {
  const { count, error } = await supabase
    .from('lifecycle_send_log')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .gte('created_at', sinceIso)
    .in('status', ['dry_run', 'sent']);
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return count ?? 0;
}

async function hasIdempotencyKey(
  supabase: ReturnType<typeof getSupabaseServiceRole>,
  key: string
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('lifecycle_send_log')
    .select('id')
    .eq('idempotency_key', key)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return Boolean(data);
}

/**
 * Phase 5 batch lifecycle step: evaluates CRM-oriented segments on `profiles`, enforces caps + idempotency,
 * writes `lifecycle_send_log` (dry-run or `skipped_no_provider` until an email API is wired).
 */
export async function runLifecycleAutomationJob(): Promise<LifecycleJobResult> {
  const enabled = envTruthy('LIFECYCLE_AUTOMATION_ENABLED');
  if (!enabled) {
    return {
      ok: true,
      skippedReason: 'LIFECYCLE_AUTOMATION_ENABLED not set',
      dryRun: true,
      sendsEnabled: false,
      providerConfigured: false,
      dateKey: utcDateKeyForLifecycle(),
      campaigns: [],
    };
  }

  const sendsEnabled = envTruthy('LIFECYCLE_SENDS_ENABLED');
  const forceDryRun = envTruthy('LIFECYCLE_AUTOMATION_DRY_RUN');
  const dryRun = forceDryRun || !sendsEnabled;
  const providerConfigured = Boolean((process.env.RESEND_API_KEY ?? '').trim());
  const maxPerWeek = parsePositiveInt(process.env.LIFECYCLE_MAX_TOUCHES_PER_USER_PER_WEEK, 3);
  const profileLimit = Math.min(5000, Math.max(50, parsePositiveInt(process.env.LIFECYCLE_PROFILE_BATCH_LIMIT, 2000)));
  const dateKey = utcDateKeyForLifecycle();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const supabase = getSupabaseServiceRole();
  const campaignsOut: LifecycleJobCampaignResult[] = [];

  for (const campaign of LIFECYCLE_CAMPAIGNS_V1) {
    const agg: LifecycleJobCampaignResult = {
      campaignId: campaign.id,
      evaluated: 0,
      logged: 0,
      skipped: { optOut: 0, cap: 0, premium: 0, duplicate: 0 },
    };

    let selectCols = 'id, purchased_index, growth_state, lifecycle_email_opt_out';
    let rows: ProfileLifecycleRow[] | null = null;
    let listError: unknown = null;

    {
      const res = await supabase
        .from('profiles')
        .select(selectCols)
        .in('growth_state', campaign.growthStates)
        .limit(profileLimit);
      rows = (res.data as ProfileLifecycleRow[] | null) ?? null;
      listError = res.error;
    }

    if (listError && isMissingColumnError(listError)) {
      const res = await supabase
        .from('profiles')
        .select('id, purchased_index, growth_state')
        .in('growth_state', campaign.growthStates)
        .limit(profileLimit);
      if (res.error) throw res.error;
      rows = ((res.data ?? []) as ProfileLifecycleRow[]).map((r) => ({
        ...r,
        lifecycle_email_opt_out: false,
      }));
    } else if (listError) {
      throw listError;
    }

    const candidates = rows ?? [];
    agg.evaluated = candidates.length;

    for (const row of candidates) {
      if (isPremiumRow(row)) {
        agg.skipped.premium += 1;
        continue;
      }
      if (row.lifecycle_email_opt_out === true) {
        agg.skipped.optOut += 1;
        continue;
      }

      const idem = buildLifecycleIdempotencyKey(campaign.id, row.id, dateKey);
      const exists = await hasIdempotencyKey(supabase, idem);
      if (exists === null) {
        return {
          ok: false,
          skippedReason: 'lifecycle_send_log table missing',
          dryRun,
          sendsEnabled,
          providerConfigured,
          dateKey,
          campaigns: campaignsOut,
        };
      }
      if (exists) {
        agg.skipped.duplicate += 1;
        continue;
      }

      const touchCount = await countRecentLifecycleTouches(supabase, row.id, weekAgo);
      if (touchCount === null) {
        return {
          ok: false,
          skippedReason: 'lifecycle_send_log table missing',
          dryRun,
          sendsEnabled,
          providerConfigured,
          dateKey,
          campaigns: campaignsOut,
        };
      }
      if (touchCount >= maxPerWeek) {
        agg.skipped.cap += 1;
        continue;
      }

      // Until a transactional sender is wired, non-dry-run still records `skipped_no_provider` for audit.
      const status = dryRun ? 'dry_run' : 'skipped_no_provider';

      const insertPayload = {
        profile_id: row.id,
        campaign_id: campaign.id,
        channel: campaign.channel,
        status,
        idempotency_key: idem,
        variant_key: null as string | null,
        metadata: {
          growth_state: row.growth_state,
          utc_date: dateKey,
        },
      };

      const ins = await supabase.from('lifecycle_send_log').insert(insertPayload).select('id').single();
      if (ins.error) {
        if (isUniqueViolation(ins.error)) {
          agg.skipped.duplicate += 1;
          continue;
        }
        if (isMissingTableError(ins.error)) {
          return {
            ok: false,
            skippedReason: 'lifecycle_send_log table missing',
            dryRun,
            sendsEnabled,
            providerConfigured,
            dateKey,
            campaigns: campaignsOut,
          };
        }
        throw ins.error;
      }
      agg.logged += 1;
    }

    campaignsOut.push(agg);
  }

  const actorId = (process.env.LIFECYCLE_INTERVENTION_ACTOR_ID ?? '').trim();
  if (actorId && campaignsOut.some((c) => c.logged > 0)) {
    const { error: intErr } = await supabase.from('intervention_logs').insert({
      actor_id: actorId,
      target_type: 'cohort',
      channel: 'email',
      notes: `Lifecycle automation job (${dateKey}): logged rows across campaigns`,
      metadata: { lifecycle: { dryRun, sendsEnabled, campaigns: campaignsOut } },
    });
    if (intErr && import.meta.env.DEV) {
      console.warn('[lifecycle-job] intervention_logs insert skipped:', intErr.message);
    }
  }

  return {
    ok: true,
    dryRun,
    sendsEnabled,
    providerConfigured,
    dateKey,
    campaigns: campaignsOut,
  };
}
