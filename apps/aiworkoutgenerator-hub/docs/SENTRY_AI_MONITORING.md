# Sentry AI/LLM Monitoring

Genkit/Gemini AI calls are wrapped in Sentry spans so performance, token usage, and failures show up in [Sentry AI Insights](https://docs.sentry.io/product/insights/ai/agents/) (AI Agents dashboard).

## Instrumented flows

| Flow                 | File                                           | Span flow name         |
| -------------------- | ---------------------------------------------- | ---------------------- |
| Workout generation   | `src/lib/genkit/flows/generate-workout.ts`     | `generate-workout`     |
| Edit exercise        | `src/lib/genkit/flows/edit-exercise.ts`        | `edit-exercise`        |
| Swap exercise        | `src/lib/genkit/flows/swap-exercise.ts`        | `swap-exercise`        |
| Add exercise         | `src/lib/genkit/flows/add-exercise.ts`         | `add-exercise`         |
| Check exercise order | `src/lib/genkit/flows/check-exercise-order.ts` | `check-exercise-order` |
| Coach explain        | `src/lib/genkit/flows/coach-explain.ts`        | `coach-explain`        |
| Interval timer       | `src/lib/genkit/flows/interval-timer.ts`       | `interval-timer`       |

Each flow wraps its `ai.generate()` call with `withGenAISpan()` from `src/lib/sentry.ts`. Spans use:

- **op:** `gen_ai.request`
- **Attributes:** `gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.system` (gcp.gemini), optional `gen_ai.request.temperature`, `gen_ai.request.max_tokens`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.usage.total_tokens`, and `gen_ai.agent.name` (flow name).

## Token usage: estimated, not from provider

Token counts on spans are **estimated** (character length ÷ 4), not from the Gemini/Genkit API. Use them for relative cost and volume trends, not for exact billing. If Genkit or the provider later exposes usage in the response, the helper can be updated to set real values.

## Where to view

1. **Sentry** → your project → **Insights** → **AI** (or **AI Agents**).
2. Filter or group by `gen_ai.agent.name` (flow name) or `gen_ai.request.model`.
3. Use **Performance** → trace view: AI spans appear as `gen_ai.request` under the request that triggered the flow.

## Graceful degradation

If `NEXT_PUBLIC_SENTRY_DSN` is unset, `withGenAISpan` runs the callback without creating a span; behavior is unchanged and no Sentry calls are made.
