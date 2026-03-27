import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { assertNarrativeDigitsGrounded } from './narrative-grounding';
import type { GrowthEngineNarrative, GrowthEngineNarrativeContext } from './types';

/** Server-only secret (batch job / Node). Do not use `import.meta.env` — avoids any client-bundle exposure. */
function geminiApiKeyFromEnv(): string {
  return (process.env.GEMINI_API_KEY ?? '').trim();
}

/** Model id for Growth Engine narrative (batch-only; keep in sync with observability metrics). */
export const GROWTH_ENGINE_NARRATIVE_MODEL = 'gemini-2.0-flash';

/** Prompt + schema iteration label stored on daily_brief.metrics */
export const GROWTH_ENGINE_NARRATIVE_PROMPT_VERSION = 'narrative-prompt-v1';

const NARRATIVE_JSON_SCHEMA = z.object({
  executiveSummary: z.string().min(1).max(4000),
  cardNarratives: z
    .array(
      z.object({
        id: z.string().min(1),
        narrative: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(8),
});

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (lower.includes('503') || lower.includes('unavailable')) return true;
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('resource exhausted'))
    return true;
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, logPrefix: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < MAX_RETRIES && isRetryableError(error);
      if (!canRetry) throw error;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`${logPrefix} retry ${attempt + 1}/${MAX_RETRIES + 1} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

const SYSTEM_PROMPT = `You are a growth analytics assistant for an admin dashboard.

You MUST output a single JSON object only (no markdown fences, no commentary). Shape:
{"executiveSummary":"string","cardNarratives":[{"id":"string","narrative":"string"}]}

Rules:
- The user message contains EXACTLY one JSON object: the "grounding context". You may ONLY restate, summarize, and prioritize what appears there. Verbatim metric values may appear only if they already appear in that JSON (as substrings).
- Do NOT invent counts, percentages, dates, or dollar amounts that are not already present in the grounding context JSON.
- executiveSummary: 2–4 sentences prioritizing which card matters most today and why.
- cardNarratives: one entry per command-center card id in the context (same ids: marketing-opportunity, product-friction, engineering-leak). Each narrative: 1–3 sentences clarifying the signal for operators.
- If you are unsure about a number, use qualitative language and card titles only.`;

function extractJsonObject(raw: string): string {
  const blockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const cleaned = blockMatch ? blockMatch[1].trim() : raw.replace(/^```json\n?|\n?```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) return cleaned.slice(first, last + 1);
  return cleaned;
}

function alignCardNarratives(
  parsed: z.infer<typeof NARRATIVE_JSON_SCHEMA>,
  expectedCardIds: string[]
): GrowthEngineNarrative {
  const byId = new Map(parsed.cardNarratives.map((c) => [c.id, c.narrative]));
  const cardNarratives = expectedCardIds.map((id) => ({
    id,
    narrative: byId.get(id) ?? `See the primary signal and recommended action for ${id}.`,
  }));
  return {
    executiveSummary: parsed.executiveSummary.trim(),
    cardNarratives,
  };
}

/**
 * Generates grounded narrative JSON from the batch context. Throws on API/parse/grounding failure.
 */
export async function generateGrowthEngineNarrative(
  context: GrowthEngineNarrativeContext
): Promise<GrowthEngineNarrative> {
  const apiKey = geminiApiKeyFromEnv();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const client = new GoogleGenAI({ apiKey });
  const expectedCardIds = context.cards.map((c) => c.id);
  const userPrompt = `Grounding context (JSON). Narrate only this data:\n${JSON.stringify(context)}`;

  const response = await withRetry(
    () =>
      client.models.generateContent({
        model: GROWTH_ENGINE_NARRATIVE_MODEL,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      }),
    '[growth-engine-narrative]'
  );

  const candidate = response.candidates?.[0];
  const textPart = candidate?.content?.parts?.find((p: { text?: string }) => p.text);
  const text = textPart?.text || '';
  if (!text.trim()) {
    throw new Error('Empty narrative response from model');
  }

  const jsonStr = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse narrative JSON from model');
  }

  const validated = NARRATIVE_JSON_SCHEMA.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Narrative JSON shape invalid: ${validated.error.message}`);
  }

  const narrative = alignCardNarratives(validated.data, expectedCardIds);
  assertNarrativeDigitsGrounded(narrative, context);
  return narrative;
}
