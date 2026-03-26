export interface FeatureAdoptionRow {
  eventName: string;
  count7d: number;
  count30d: number;
  displayLabel?: string;
}

export interface EngagementStats {
  dauByDay: { date: string; count: number }[];
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  sessionCount: number;
  avgSessionDurationMinutes: number;
  avgPagesPerSession: number;
  featureAdoptionMarketing?: FeatureAdoptionRow[];
  featureAdoptionHub?: FeatureAdoptionRow[];
  powerUserDistribution: { bucket: string; count: number }[];
  activeUsersSource?: 'hub_firestore' | 'supabase';
  engagementHubWarnings?: string[];
}

export interface RetentionCohortRow {
  label: string;
  size: number;
  retained: number[];
  rates: number[];
}

export interface RetentionCohortsStats {
  enabled?: boolean;
  source?: string;
  granularity: 'week' | 'day';
  activeDefinition?: 'session' | 'workout';
  cohorts: RetentionCohortRow[];
  kpis?: { label: string; rate: number }[];
  warnings?: string[];
}

export interface MonetizationDropOffRow {
  step: string;
  completed: number;
  dropped: number;
}

export interface AcquisitionStats {
  uniqueVisitorsByDay: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  utmBreakdown: { source: string; medium: string; campaign: string; count: number }[];
  topLandingPages: { path: string; count: number }[];
  deviceBrowser: { device: string; browser: string; count: number }[];
  geo: { country: string; count: number }[];
}
