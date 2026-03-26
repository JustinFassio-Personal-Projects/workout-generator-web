import { getSupabaseServiceRole } from '@/lib/supabase/server';

const CHECKOUT_EVENT = 'purchase_checkout_session_created';
const SUCCESS_EVENTS = ['purchase_return_success', 'purchase_subscription_activated'];

type CheckoutSessionRow = {
  session_id: string | null;
  user_id: string | null;
  timestamp: string;
};

function getWindowStart(minutes: number): string {
  const start = new Date(Date.now() - minutes * 60 * 1000);
  return start.toISOString();
}

export async function runCheckoutAbandonmentPoller(params?: {
  windowMinutes?: number;
  activationGraceMinutes?: number;
}) {
  const windowMinutes = params?.windowMinutes ?? 30;
  const activationGraceMinutes = params?.activationGraceMinutes ?? 30;
  const supabase = getSupabaseServiceRole();
  const nowIso = new Date().toISOString();
  const fromIso = getWindowStart(windowMinutes);
  const graceBeforeIso = getWindowStart(activationGraceMinutes);

  const { data: checkoutRowsRaw, error: checkoutError } = await supabase
    .from('analytics_funnel_events')
    .select('session_id, user_id, timestamp')
    .eq('event_name', CHECKOUT_EVENT)
    .eq('app_id', 'hub')
    .gte('timestamp', fromIso)
    .lte('timestamp', nowIso)
    .not('session_id', 'is', null)
    .limit(5000);

  if (checkoutError) throw checkoutError;

  const checkoutRows = (checkoutRowsRaw ?? []) as CheckoutSessionRow[];
  const candidateMap = new Map<string, CheckoutSessionRow>();
  for (const row of checkoutRows) {
    if (!row.session_id) continue;
    const existing = candidateMap.get(row.session_id);
    if (!existing || existing.timestamp > row.timestamp) {
      candidateMap.set(row.session_id, row);
    }
  }

  const sessionIds = [...candidateMap.keys()];
  if (!sessionIds.length) {
    return { created: 0, candidates: 0 };
  }

  const { data: successRows, error: successError } = await supabase
    .from('analytics_funnel_events')
    .select('session_id')
    .in('event_name', SUCCESS_EVENTS)
    .in('session_id', sessionIds)
    .gte('timestamp', graceBeforeIso)
    .lte('timestamp', nowIso)
    .limit(5000);

  if (successError) throw successError;

  const successfulSessions = new Set(
    (successRows ?? [])
      .map((row) => (row as { session_id: string | null }).session_id)
      .filter((value): value is string => Boolean(value))
  );

  const toInsert = [...candidateMap.values()]
    .filter((row) => row.session_id && !successfulSessions.has(row.session_id))
    .map((row) => ({
      alert_type: 'checkout_abandonment',
      dedupe_key: row.session_id!,
      user_id: row.user_id,
      severity: 'P1',
      payload: {
        sessionId: row.session_id,
        checkoutCreatedAt: row.timestamp,
        windowMinutes,
      },
      source: 'poller',
    }));

  if (!toInsert.length) {
    return { created: 0, candidates: sessionIds.length };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('growth_realtime_alerts')
    .upsert(toInsert, { onConflict: 'alert_type,dedupe_key', ignoreDuplicates: true })
    .select('id');
  if (insertError) {
    throw insertError;
  }

  return {
    created: inserted?.length ?? 0,
    candidates: sessionIds.length,
  };
}
