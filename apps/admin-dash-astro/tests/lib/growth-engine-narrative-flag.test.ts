/**
 * Feature flag for rules-only vs rules + narrative (batch job gates LLM calls).
 */

import { afterEach, describe, expect, it } from 'vitest';

import { isGrowthEngineNarrativeEnabled } from '@/lib/admin/growth-engine/narrative-context';

describe('isGrowthEngineNarrativeEnabled', () => {
  const original = process.env.GROWTH_ENGINE_NARRATIVE_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.GROWTH_ENGINE_NARRATIVE_ENABLED;
    } else {
      process.env.GROWTH_ENGINE_NARRATIVE_ENABLED = original;
    }
  });

  it('returns false when unset (rules-only; no Gemini call in batch)', () => {
    delete process.env.GROWTH_ENGINE_NARRATIVE_ENABLED;
    expect(isGrowthEngineNarrativeEnabled()).toBe(false);
  });

  it('returns true when set to 1', () => {
    process.env.GROWTH_ENGINE_NARRATIVE_ENABLED = '1';
    expect(isGrowthEngineNarrativeEnabled()).toBe(true);
  });

  it('returns true when set to true', () => {
    process.env.GROWTH_ENGINE_NARRATIVE_ENABLED = 'true';
    expect(isGrowthEngineNarrativeEnabled()).toBe(true);
  });
});
