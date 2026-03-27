/**
 * Grounding validator for Growth Engine LLM narratives (digit sequences must appear in context JSON).
 */

import { describe, expect, it } from 'vitest';

import { assertNarrativeDigitsGrounded } from '@/lib/admin/growth-engine/narrative-grounding';
import type { GrowthEngineNarrative, GrowthEngineNarrativeContext } from '@/lib/admin/growth-engine/types';

function minimalContext(overrides?: Partial<GrowthEngineNarrativeContext>): GrowthEngineNarrativeContext {
  return {
    schemaVersion: 'growth-engine-narrative-context-v1',
    insightRunId: 'insight-test',
    rulePackVersion: 'rule-pack-v1',
    cards: [],
    batchMetrics: { monetization_rows: 42 },
    recentInterventions: [],
    realtimeAlerts: { activeCount: 0, bySeverity: {}, byAlertType: {} },
    ...overrides,
  };
}

describe('assertNarrativeDigitsGrounded', () => {
  it('accepts when all digit sequences appear in context JSON', () => {
    const ctx = minimalContext();
    const narrative: GrowthEngineNarrative = {
      executiveSummary: 'Monetization snapshot includes 42 funnel rows.',
      cardNarratives: [{ id: 'x', narrative: 'No extra numbers here.' }],
    };
    expect(() => assertNarrativeDigitsGrounded(narrative, ctx)).not.toThrow();
  });

  it('throws when a digit sequence is not present in context', () => {
    const ctx = minimalContext();
    const narrative: GrowthEngineNarrative = {
      executiveSummary: 'There were 99999 conversions.',
      cardNarratives: [{ id: 'x', narrative: 'Secondary text.' }],
    };
    expect(() => assertNarrativeDigitsGrounded(narrative, ctx)).toThrow(/99999/);
  });

  it('rejects substring-only matches (e.g. 42 vs 142 in context)', () => {
    const ctx = minimalContext({ batchMetrics: { monetization_rows: 142 } });
    const narrative: GrowthEngineNarrative = {
      executiveSummary: 'We saw 42 monetization rows.',
      cardNarratives: [{ id: 'x', narrative: 'Ok.' }],
    };
    expect(() => assertNarrativeDigitsGrounded(narrative, ctx)).toThrow(/42/);
  });

  it('allows narratives with no digits', () => {
    const ctx = minimalContext();
    const narrative: GrowthEngineNarrative = {
      executiveSummary: 'Focus on the engineering card first.',
      cardNarratives: [{ id: 'x', narrative: 'Qualitative summary only.' }],
    };
    expect(() => assertNarrativeDigitsGrounded(narrative, ctx)).not.toThrow();
  });
});
