import { getEngagementStats } from '@/lib/supabase/admin/analytics-engagement';
import { getMonetizationDropOffStats } from '@/lib/supabase/admin/analytics-monetization-dropoff';
import { getRetentionCohortStats } from '@/lib/firebase/retention-cohorts';
import { reconcileGrowthStates } from './growth-state';
import { getGrowthPipelineUserSource } from './pipeline-users-firestore';
import { buildGrowthEngineNarrativeContext, isGrowthEngineNarrativeEnabled } from './narrative-context';
import {
  generateGrowthEngineNarrative,
  GROWTH_ENGINE_NARRATIVE_MODEL,
  GROWTH_ENGINE_NARRATIVE_PROMPT_VERSION,
} from './narrative-llm';
import { buildBatchCards, RULE_PACK_V1 } from './rule-pack-v1';
import { insertDailyBrief } from './store';
import type { GrowthEngineNarrative } from './types';

function makeInsightRunId() {
  return `insight-${Date.now()}`;
}

function isGrowthStateReady(): boolean {
  return process.env.GROWTH_STATE_READY === 'true' || process.env.GROWTH_STATE_READY === '1';
}

export async function runGrowthEngineBatchJob() {
  const startedAt = Date.now();
  const insightRunId = makeInsightRunId();
  const pipelineUserSource = getGrowthPipelineUserSource();
  const growthStateSync =
    pipelineUserSource === 'firebase'
      ? { updated: 0, scanned: 0 }
      : await reconcileGrowthStates(5000);

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

  const preMetrics: Record<string, unknown> = {
    batch: true,
    rule_version: RULE_PACK_V1,
    monetization_rows: monetization.monetizationDropOff.length,
    retention_cohort_count: retention?.cohorts?.length ?? 0,
    growth_state_ready: isGrowthStateReady(),
    growth_state_rows_updated: growthStateSync.updated,
    growth_state_rows_scanned: growthStateSync.scanned,
    growth_state_source: pipelineUserSource,
  };

  let narrative: GrowthEngineNarrative | undefined;
  const llmNarrativeMetrics: Record<string, unknown> = {};

  if (isGrowthEngineNarrativeEnabled()) {
    const geminiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!geminiKey) {
      llmNarrativeMetrics.llm_narrative_status = 'skipped';
      llmNarrativeMetrics.llm_narrative_skip_reason = 'missing_api_key';
    } else {
      try {
        const narrativeContext = await buildGrowthEngineNarrativeContext({
          insightRunId,
          rulePackVersion: RULE_PACK_V1,
          cards,
          batchMetrics: preMetrics,
        });
        const t0 = Date.now();
        narrative = await generateGrowthEngineNarrative(narrativeContext);
        llmNarrativeMetrics.llm_narrative_status = 'ok';
        llmNarrativeMetrics.llm_narrative_model = GROWTH_ENGINE_NARRATIVE_MODEL;
        llmNarrativeMetrics.llm_narrative_latency_ms = Date.now() - t0;
        llmNarrativeMetrics.llm_narrative_version = GROWTH_ENGINE_NARRATIVE_PROMPT_VERSION;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        llmNarrativeMetrics.llm_narrative_status = 'error';
        llmNarrativeMetrics.llm_narrative_error = msg.slice(0, 300);
        if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
          console.error('[growth-engine-batch] narrative error:', err);
        }
      }
    }
  }

  const latencyMs = Date.now() - startedAt;
  const row = await insertDailyBrief({
    insightRunId,
    rulePackVersion: RULE_PACK_V1,
    cards,
    narrative,
    metrics: {
      ...preMetrics,
      latency_ms: latencyMs,
      ...llmNarrativeMetrics,
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
