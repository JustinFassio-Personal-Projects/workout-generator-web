import { LEAD_SCORE_SPEC_V1, LEAD_SCORE_VERSION_V1 } from './lead-score-spec-v1';
import type { GrowthPipelineDriver, GrowthState } from './types';

type LeadScoreInput = {
  growthState: GrowthState | null;
  checkoutStarted7d: boolean;
  checkoutAbandoned48h: boolean;
  returnSuccessNoActivation: boolean;
  workoutSignals30d: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function growthStateDelta(state: GrowthState | null): number {
  if (state === 'trial_expiring_24h') return 25;
  if (state === 'trial_active') return 15;
  if (state === 'downgraded_free') return 10;
  if (state === 'subscriber_active') return -20;
  if (state === 'churned') return 5;
  return 0;
}

export function computeLeadScoreV1(input: LeadScoreInput): {
  score: number;
  scoreVersion: string;
  drivers: GrowthPipelineDriver[];
} {
  const drivers: GrowthPipelineDriver[] = [];
  let score = 20;

  if (input.checkoutStarted7d) {
    score += 20;
    drivers.push({
      key: 'checkout_started_recently',
      label: 'Checkout started in last 7 days',
      delta: 20,
    });
  }

  if (input.checkoutAbandoned48h) {
    score += 25;
    drivers.push({
      key: 'checkout_abandonment_recent',
      label: 'Checkout abandoned in last 48 hours',
      delta: 25,
    });
  }

  if (input.returnSuccessNoActivation) {
    score += 15;
    drivers.push({
      key: 'return_success_without_activation',
      label: 'Returned from checkout without activation',
      delta: 15,
    });
  }

  const engagementDelta = Math.min(15, input.workoutSignals30d >= 6 ? 15 : input.workoutSignals30d * 2);
  if (engagementDelta > 0) {
    score += engagementDelta;
    drivers.push({
      key: 'engagement_signal',
      label: 'Workout engagement in last 30 days',
      delta: engagementDelta,
    });
  }

  const lifecycleDelta = growthStateDelta(input.growthState);
  if (lifecycleDelta !== 0) {
    score += lifecycleDelta;
    drivers.push({
      key: 'growth_state_urgency',
      label: 'Growth-state urgency',
      delta: lifecycleDelta,
    });
  }

  score = clamp(score, LEAD_SCORE_SPEC_V1.minScore, LEAD_SCORE_SPEC_V1.maxScore);
  drivers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    score,
    scoreVersion: LEAD_SCORE_VERSION_V1,
    drivers: drivers.slice(0, 5),
  };
}
