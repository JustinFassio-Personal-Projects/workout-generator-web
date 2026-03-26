export interface AnalyticsDataset {
  key: string;
  label: string;
  apiPaths: string[];
  dataSourceNote: string;
}

/**
 * Canonical dataset registry for Analytics + Active Growth Engine views.
 * Keep this list aligned with AnalyticsView fetch targets.
 */
export const ANALYTICS_DATASETS: AnalyticsDataset[] = [
  {
    key: 'overview',
    label: 'Overview',
    apiPaths: ['/api/admin/analytics/overview?days={days}'],
    dataSourceNote: 'Supabase analytics rollups',
  },
  {
    key: 'acquisition',
    label: 'Acquisition & traffic',
    apiPaths: ['/api/admin/analytics/acquisition?days={days}'],
    dataSourceNote: 'Supabase analytics funnel + attribution dimensions',
  },
  {
    key: 'auth-funnel',
    label: 'Auth & onboarding',
    apiPaths: ['/api/admin/analytics/auth-funnel?days={days}'],
    dataSourceNote: 'Supabase analytics_funnel_events',
  },
  {
    key: 'engagement',
    label: 'Engagement',
    apiPaths: ['/api/admin/analytics/engagement?days={days}'],
    dataSourceNote: 'Hub Firestore activity + Supabase event overlays',
  },
  {
    key: 'retention-cohorts',
    label: 'Retention & cohorts',
    apiPaths: ['/api/admin/analytics/retention-cohorts?granularity=week&cohortWeeks=12&periods=13&activeDefinition=session'],
    dataSourceNote: 'Firebase Auth signups + Hub Firestore activity logs',
  },
  {
    key: 'monetization-candidates',
    label: 'Monetization candidates',
    apiPaths: ['/api/admin/analytics/monetization-candidates?...'],
    dataSourceNote: 'Firebase-backed candidate selection',
  },
  {
    key: 'monetization-dropoff',
    label: 'Monetization drop-off',
    apiPaths: ['/api/admin/analytics/monetization-dropoff?days={days}'],
    dataSourceNote: 'Supabase analytics_funnel_events (hub purchase funnel)',
  },
  {
    key: 'monetization',
    label: 'Monetization',
    apiPaths: ['/api/admin/analytics/monetization?days={days}'],
    dataSourceNote: 'Supabase profiles + monetization rollups',
  },
  {
    key: 'quality',
    label: 'Quality & reliability',
    apiPaths: ['/api/admin/analytics/quality?days={days}'],
    dataSourceNote: 'Supabase web/app error analytics',
  },
];

export const ANALYTICS_DATASET_BY_KEY: Record<string, AnalyticsDataset> =
  Object.fromEntries(ANALYTICS_DATASETS.map((dataset) => [dataset.key, dataset]));
