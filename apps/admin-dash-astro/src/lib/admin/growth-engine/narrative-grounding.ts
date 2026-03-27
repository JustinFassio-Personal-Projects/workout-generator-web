import type { GrowthEngineNarrative, GrowthEngineNarrativeContext } from './types';

/**
 * Ensures every contiguous digit sequence in narrative text appears in the serialized context.
 * Reduces risk of fabricated statistics while allowing numbers copied from the source JSON.
 */
export function assertNarrativeDigitsGrounded(
  narrative: GrowthEngineNarrative,
  context: GrowthEngineNarrativeContext
): void {
  const haystack = JSON.stringify(context);
  const texts = [
    narrative.executiveSummary,
    ...narrative.cardNarratives.map((c) => c.narrative),
  ];
  for (const text of texts) {
    const matches = text.match(/\d+/g);
    if (!matches) continue;
    for (const seq of matches) {
      if (!haystack.includes(seq)) {
        throw new Error(`Narrative grounding failed: digit sequence "${seq}" not found in context`);
      }
    }
  }
}
