import { getEngagementStats } from '@/lib/supabase/admin/analytics-engagement';
import { getMonetizationDropOffStats } from '@/lib/supabase/admin/analytics-monetization-dropoff';
import { getRetentionCohortStats } from '@/lib/firebase/retention-cohorts';
import { reconcileGrowthStates } from './growth-state';
import { buildBatchCards, RULE_PACK_V1 } from './rule-pack-v1';
import { insertDailyBrief } from './store';

function makeInsightRunId() {
  return `insight-${Date.now()}`;
}

function isGrowthStateReady(): boolean {
  return process.env.GROWTH_STATE_READY === 'true' || process.env.GROWTH_STATE_READY === '1';
}

export async function runGrowthEngineBatchJob() {
  const startedAt = Date.now();
  const insightRunId = makeInsightRunId();
  const growthStateSync = await reconcileGrowthStates(5000);

  const [monetization, engagement, retention] = await Promise.all([
    getMonetizationDropOffStats(30),
    getEngagementStats(30),
    getRetentionCohortStats({
      granularity: 'week',
      cohortWeeks: 12,
      periods: 13,
      activeDefinition: 'session',
    }),
  ]);

  const cards = buildBatchCards({
    monetizationDropOff: monetization.monetizationDropOff,
    engagement,
    retention,
    growthStateReady: isGrowthStateReady(),
  });

  const latencyMs = Date.now() - startedAt;
  const row = await insertDailyBrief({
    insightRunId,
    rulePackVersion: RULE_PACK_V1,
    cards,
    metrics: {
      batch: true,
      latency_ms: latencyMs,
      rule_version: RULE_PACK_V1,
      monetization_rows: monetization.monetizationDropOff.length,
      retention_cohort_count: retention?.cohorts?.length ?? 0,
      growth_state_ready: isGrowthStateReady(),
      growth_state_rows_updated: growthStateSync.updated,
      growth_state_rows_scanned: growthStateSync.scanned,
    },
  });

  return {
    dailyBriefId: row.id,
    generatedAt: row.generated_at,
    insightRunId,
    rulePackVersion: RULE_PACK_V1,
    latencyMs,
    cards,
  };
}
