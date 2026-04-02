export interface AnalyticsGlossaryTerm {
  id: string;
  title: string;
  definition: string;
}

export interface AnalyticsGlossary {
  terms: AnalyticsGlossaryTerm[];
}

const GLOSSARY_BY_DATASET_KEY: Record<string, AnalyticsGlossary> = {
  'monetization-dropoff': {
    terms: [
      {
        id: 'purchase-flow-session',
        title: 'Purchase flow session',
        definition:
          'One unique checkout journey identified by session_id (purchase_flow_id) across paywall, checkout, redirect, and activation events.',
      },
      {
        id: 'completed',
        title: 'Completed',
        definition: 'Number of distinct purchase flow sessions that reached a funnel step in the selected range.',
      },
      {
        id: 'dropped',
        title: 'Dropped',
        definition:
          'Difference between the previous step completed count and the current step completed count.',
      },
    ],
  },
  engagement: {
    terms: [
      {
        id: 'dau',
        title: 'DAU',
        definition: 'Distinct users active on the latest day in range.',
      },
      {
        id: 'wau-mau',
        title: 'WAU / MAU',
        definition: 'Distinct users active at least once in the last 7 days (WAU) and 30 days (MAU).',
      },
      {
        id: 'stickiness',
        title: 'Stickiness',
        definition: 'WAU divided by MAU. Higher values indicate stronger repeat usage.',
      },
      {
        id: 'feature-adoption',
        title: 'Feature adoption',
        definition:
          'Event-level usage counts in trailing windows (7d / 30d), split by Hub activity and marketing/timer funnel events.',
      },
      {
        id: 'workout-attempt-id',
        title: 'workout_attempt_id',
        definition:
          'Optional UUID on hub activity logs tying one player visit together. Expected sequence: workout:open → workout:start → workout:complete for the same id when the user finishes.',
      },
      {
        id: 'workout-surface',
        title: 'Workout surface',
        definition:
          'details.surface on workout events: workout_player (guided player), simple_player (written desktop), mobile_player (written mobile). Legacy values may appear as surface_legacy for dashboards comparing older data.',
      },
      {
        id: 'workout-journey-explorer',
        title: 'Workout journey explorer',
        definition:
          'Engagement drill-down that lists recent workout:start rows from Firestore and loads an ordered timeline for a chosen workout_attempt_id.',
      },
    ],
  },
  'retention-cohorts': {
    terms: [
      {
        id: 'cohort',
        title: 'Cohort',
        definition:
          'A group of users who signed up in the same day or week (based on selected granularity).',
      },
      {
        id: 'retention-rate',
        title: 'Retention rate',
        definition: 'Retained users divided by cohort size for each period (D0/D1... or W0/W1...).',
      },
      {
        id: 'active-definition',
        title: 'Active definition',
        definition:
          'Session uses app open/session_start events; Workout uses workout engagement events such as start/complete/save/share.',
      },
    ],
  },
  acquisition: {
    terms: [
      {
        id: 'landing-path',
        title: 'Top landing page',
        definition: 'Path with highest tracked page-entry events in the selected date range.',
      },
      {
        id: 'utm-breakdown',
        title: 'UTM breakdown',
        definition:
          'Grouped counts by utm_source / utm_medium / utm_campaign from tracked web events used for campaign intent segmentation.',
      },
      {
        id: 'suggestion-segment',
        title: 'Suggestion segment hint',
        definition:
          'Campaign or landing segment surfaced for Messaging & experiments proposals. Used as a targeting hint, not an execution trigger.',
      },
    ],
  },
  'feature-roi': {
    terms: [
      {
        id: 'adoption-distinct-users',
        title: 'Adoption (30d distinct users)',
        definition:
          'Count of distinct users who triggered a mapped feature event in the trailing 30 days.',
      },
      {
        id: 'phase-1-correlation',
        title: 'Phase-1 correlation heuristic',
        definition:
          'Share of users who upgraded within 7 days of first feature interaction, compared to baseline rate for the same source.',
      },
      {
        id: 'correlation-tier',
        title: 'Correlation tier',
        definition:
          'Strong requires uplift >= 5 points versus baseline with at least 20 treated users; otherwise weak or unknown.',
      },
    ],
  },
};

export function getAnalyticsGlossary(datasetKey: string): AnalyticsGlossary | null {
  return GLOSSARY_BY_DATASET_KEY[datasetKey] ?? null;
}
