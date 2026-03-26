import type { EngagementStats } from '@/lib/supabase/admin/analytics-engagement';
import type { MonetizationDropOffRow } from '@/lib/supabase/admin/analytics-monetization-dropoff';
import type { RetentionCohortsResult } from '@/lib/firebase/retention-cohorts';
import type { GrowthEngineCard } from './types';

export const RULE_PACK_V1 = 'rule-pack-v1';

type RuleInput = {
  monetizationDropOff: MonetizationDropOffRow[];
  engagement: EngagementStats;
  retention: RetentionCohortsResult | null;
  growthStateReady: boolean;
};

function firstRetentionRate(retention: RetentionCohortsResult | null): number | null {
  const first = retention?.cohorts?.[0];
  if (!first || !first.rates || first.rates.length < 2) return null;
  return first.rates[1] ?? null;
}

function findCheckoutAbandonmentCount(rows: MonetizationDropOffRow[]): number {
  const checkoutStep = rows.find((row) => row.step === 'Checkout session created');
  const activatedStep = rows.find((row) => row.step === 'Subscription activated (webhook)');
  if (!checkoutStep) return 0;
  return Math.max(0, checkoutStep.completed - (activatedStep?.completed ?? 0));
}

export function buildBatchCards(input: RuleInput): GrowthEngineCard[] {
  const checkoutAbandonment = findCheckoutAbandonmentCount(input.monetizationDropOff);
  const stickinessPct = Math.round(input.engagement.stickiness * 100);
  const d1Rate = firstRetentionRate(input.retention);
  const d1Pct = d1Rate === null ? null : Math.round(d1Rate * 100);

  const marketingCard: GrowthEngineCard = input.growthStateReady
    ? {
        id: 'marketing-opportunity',
        title: 'Top conversion opportunity',
        owner: 'Marketing',
        severity: 'P2',
        signal:
          d1Pct === null
            ? 'Growth-state-aware lifecycle segmentation is active, but retention sample size is still building.'
            : `Lifecycle segments are active; latest first-period retention is ${d1Pct}%.`,
        action:
          'Target trial and recovery journeys by growth_state segment with urgency and value reinforcement copy.',
        executionMode: 'batch',
        evidence: {
          datasetKey: 'retention-cohorts',
          label: 'View retention detail',
          path: '/analytics/details/retention-cohorts',
        },
      }
    : {
        id: 'marketing-opportunity',
        title: 'Top conversion opportunity',
        owner: 'Marketing',
        severity: 'P2',
        signal: 'Marketing lifecycle rule is gated: growth_state prerequisite is not shipped yet.',
        action:
          'Ship growth_state write path before enabling reverse-trial urgency and churn-risk segmentation rules.',
        executionMode: 'batch',
        evidence: {
          datasetKey: 'retention-cohorts',
          label: 'View retention detail',
          path: '/analytics/details/retention-cohorts',
        },
        metadata: { blocked: true, gate: 'growth_state_prerequisite' },
      };

  const productCard: GrowthEngineCard = {
    id: 'product-friction',
    title: 'Top UX friction point',
    owner: 'Product',
    severity: input.engagement.stickiness < 0.35 ? 'P1' : 'P2',
    signal:
      input.engagement.stickiness < 0.35
        ? `Stickiness is ${stickinessPct}% (WAU/MAU), indicating weak repeat usage after initial sessions.`
        : `Stickiness is ${stickinessPct}% with room to improve repeat usage and workout completion loops.`,
    action:
      'Prioritize onboarding and workout completion path improvements, then track 7-day change in stickiness and retention.',
    executionMode: 'batch',
    evidence: {
      datasetKey: 'engagement',
      label: 'View engagement detail',
      path: '/analytics/details/engagement',
    },
  };

  const engineeringCard: GrowthEngineCard = {
    id: 'engineering-leak',
    title: 'Top revenue leak',
    owner: 'Engineering',
    severity: checkoutAbandonment >= 25 ? 'P1' : 'P2',
    signal: `Estimated checkout abandonment in the selected window: ${checkoutAbandonment} sessions.`,
    action:
      'Audit checkout instrumentation and activation handoff for failed or delayed completion events, then patch the highest-volume drop step.',
    executionMode: 'batch',
    evidence: {
      datasetKey: 'monetization-dropoff',
      label: 'View monetization drop-off detail',
      path: '/analytics/details/monetization-dropoff',
    },
  };

  return [marketingCard, productCard, engineeringCard];
}
