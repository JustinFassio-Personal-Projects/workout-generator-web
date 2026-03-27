import type { GrowthEngineCard, GrowthEngineNarrativeContext } from './types';
import { getRealtimeAlertSummaryForNarrative, getRecentInterventionsForNarrative } from './store';

export function isGrowthEngineNarrativeEnabled(): boolean {
  const v = process.env.GROWTH_ENGINE_NARRATIVE_ENABLED;
  return v === 'true' || v === '1';
}

export async function buildGrowthEngineNarrativeContext(input: {
  insightRunId: string;
  rulePackVersion: string;
  cards: GrowthEngineCard[];
  batchMetrics: Record<string, unknown>;
}): Promise<GrowthEngineNarrativeContext> {
  const [recentInterventions, realtimeAlerts] = await Promise.all([
    getRecentInterventionsForNarrative({ limit: 20, days: 7 }),
    getRealtimeAlertSummaryForNarrative(),
  ]);

  return {
    schemaVersion: 'growth-engine-narrative-context-v1',
    insightRunId: input.insightRunId,
    rulePackVersion: input.rulePackVersion,
    cards: input.cards,
    batchMetrics: input.batchMetrics,
    recentInterventions,
    realtimeAlerts,
  };
}
