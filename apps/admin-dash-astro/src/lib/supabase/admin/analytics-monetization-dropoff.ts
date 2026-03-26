/**
 * Hub Stripe checkout funnel: distinct purchase_flow_id (session_id) per step from analytics_funnel_events.
 */

import { getSupabaseServer } from '../server';

export interface MonetizationDropOffRow {
  step: string;
  completed: number;
  dropped: number;
}

const MONETIZATION_FUNNEL_EVENTS = [
  'purchase_paywall_opened',
  'purchase_cta_checkout_started',
  'purchase_checkout_session_created',
  'purchase_stripe_redirect',
  'purchase_return_success',
  'purchase_subscription_activated',
] as const;

const STEP_LABELS: Record<(typeof MONETIZATION_FUNNEL_EVENTS)[number], string> = {
  purchase_paywall_opened: 'Paywall opened',
  purchase_cta_checkout_started: 'Checkout CTA clicked',
  purchase_checkout_session_created: 'Checkout session created',
  purchase_stripe_redirect: 'Redirected to Stripe',
  purchase_return_success: 'Returned to app (success URL)',
  purchase_subscription_activated: 'Subscription activated (webhook)',
};

export async function getMonetizationDropOffStats(days: number): Promise<{
  monetizationDropOff: MonetizationDropOffRow[];
}> {
  const supabase = getSupabaseServer();
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const stepCounts: number[] = [];

  for (const eventName of MONETIZATION_FUNNEL_EVENTS) {
    const { data: rows } = await supabase
      .from('analytics_funnel_events')
      .select('session_id')
      .eq('event_name', eventName)
      .eq('app_id', 'hub')
      .gte('timestamp', fromIso)
      .lte('timestamp', toIso)
      .not('session_id', 'is', null);

    const sessionIds = new Set(
      (rows ?? [])
        .map((r) => (r as { session_id: string | null }).session_id)
        .filter((id): id is string => Boolean(id))
    );
    stepCounts.push(sessionIds.size);
  }

  const monetizationDropOff: MonetizationDropOffRow[] = [];
  let prev = 0;
  MONETIZATION_FUNNEL_EVENTS.forEach((name, i) => {
    const completed = stepCounts[i] ?? 0;
    const dropped = Math.max(0, prev - completed);
    monetizationDropOff.push({ step: STEP_LABELS[name], completed, dropped });
    prev = completed;
  });

  return { monetizationDropOff };
}
