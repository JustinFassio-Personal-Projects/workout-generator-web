export type GrowthEngineOwner = 'Marketing' | 'Product' | 'Engineering';

export type GrowthEngineSeverity = 'P1' | 'P2' | 'P3';

export type GrowthEngineExecutionMode = 'batch' | 'realtime';

export type GrowthEngineEvidenceLink = {
  datasetKey: string;
  label: string;
  path: string;
};

export type GrowthEngineCard = {
  id: string;
  title: string;
  owner: GrowthEngineOwner;
  severity: GrowthEngineSeverity;
  signal: string;
  action: string;
  executionMode: GrowthEngineExecutionMode;
  evidence: GrowthEngineEvidenceLink;
  metadata?: Record<string, unknown>;
};

export type GrowthEngineBriefSummary = {
  cards: GrowthEngineCard[];
  generatedAt: string;
  insightRunId: string;
  rulePackVersion: string;
};

export type GrowthState =
  | 'trial_active'
  | 'trial_expiring_24h'
  | 'downgraded_free'
  | 'subscriber_active'
  | 'churned';

export type GrowthPipelineDriver = {
  key: string;
  label: string;
  delta: number;
};

export type GrowthPipelineRow = {
  uid: string;
  displayLabel: string;
  growthState: GrowthState | null;
  trialEndsAt: string | null;
  purchasedIndex: number | null;
  leadScore: number;
  scoreVersion: string;
  drivers: GrowthPipelineDriver[];
  insight: string;
  recommendedTrigger: string;
};

export type GrowthFeatureRoiSource = 'hub_firestore' | 'supabase_funnel';

export type GrowthFeatureRoiAdoptionBucket = 'high' | 'low';

export type GrowthFeatureRoiCorrelationTier = 'strong' | 'weak' | 'unknown';

export type GrowthFeatureRoiRow = {
  featureKey: string;
  label: string;
  source: GrowthFeatureRoiSource;
  adoptionBucket: GrowthFeatureRoiAdoptionBucket;
  correlationTier: GrowthFeatureRoiCorrelationTier;
  distinctUsers30d: number;
  treatedUsers: number;
  upgradedWithin7d: number;
  upgradeRate: number;
  baselineRate: number;
  directive: string;
  evidence: {
    path: string;
    label: string;
  };
};
