export const LEAD_SCORE_VERSION_V1 = 'lead-score-v1';

export type LeadScoreWeight = {
  key: string;
  label: string;
  weight: number;
  description: string;
};

export type LeadScoreSpec = {
  version: string;
  minScore: number;
  maxScore: number;
  weights: LeadScoreWeight[];
};

export const LEAD_SCORE_SPEC_V1: LeadScoreSpec = {
  version: LEAD_SCORE_VERSION_V1,
  minScore: 1,
  maxScore: 100,
  weights: [
    {
      key: 'checkout_started_recently',
      label: 'Checkout started in last 7 days',
      weight: 20,
      description: 'Users who recently started checkout are high-intent conversion candidates.',
    },
    {
      key: 'checkout_abandonment_recent',
      label: 'Checkout abandoned in last 48 hours',
      weight: 25,
      description: 'Very recent abandonment tends to respond best to immediate follow-up.',
    },
    {
      key: 'return_success_without_activation',
      label: 'Returned from checkout without activation',
      weight: 15,
      description: 'Returned successfully but did not activate subscription, suggesting a fixable drop-off.',
    },
    {
      key: 'engagement_signal',
      label: 'Workout engagement in last 30 days',
      weight: 15,
      description: 'Recent workout engagement indicates realized value and readiness to convert.',
    },
    {
      key: 'growth_state_urgency',
      label: 'Growth-state urgency',
      weight: 25,
      description: 'Lifecycle state increases urgency for conversion or retention action.',
    },
  ],
};
