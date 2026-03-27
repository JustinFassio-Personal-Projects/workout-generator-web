import type { GrowthEngineNarrative, GrowthEngineNarrativeContext } from './types';

/**
 * Ensures every contiguous digit sequence in narrative text appears as a full number token in the
 * serialized context (same extraction rule as `String#match(/\d+/g)` on the context JSON).
 * Avoids substring false positives (e.g. narrative "42" vs context "142" only).
 */
export function assertNarrativeDigitsGrounded(
  narrative: GrowthEngineNarrative,
  context: GrowthEngineNarrativeContext
): void {
  const haystack = JSON.stringify(context);
  const allowedTokens = new Set<string>();
  for (const m of haystack.matchAll(/\d+/g)) {
    allowedTokens.add(m[0]);
  }
  const texts = [
    narrative.executiveSummary,
    ...narrative.cardNarratives.map((c) => c.narrative),
  ];
  for (const text of texts) {
    const matches = text.match(/\d+/g);
    if (!matches) continue;
    for (const seq of matches) {
      if (!allowedTokens.has(seq)) {
        throw new Error(`Narrative grounding failed: digit sequence "${seq}" not found in context`);
      }
    }
  }
}
