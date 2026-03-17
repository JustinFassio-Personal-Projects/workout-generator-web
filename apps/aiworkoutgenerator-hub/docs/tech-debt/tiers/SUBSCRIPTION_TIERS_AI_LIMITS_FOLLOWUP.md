# Subscription Tiers & AI Limits – Follow-up Tasks (This PR)

This document tracks follow-up work related to subscription tiers and AI usage limits introduced or adjusted in this PR. It is intended for a **future dedicated tiers/usage PR**, not this feature branch.

## Context

Recent changes:

- Increased AI quotas:
  - **Free**: 10 lifetime AI actions (shared pool across AI Edit, AI Swap, Coach Explain, Interval Timer).
  - **Basic**: 100 AI actions/month.
  - **Pro**: 500 AI actions/month.
  - **Elite**: 1000 AI actions/month.
- Free-tier semantics:
  - Shared lifetime counter for AI Edit, AI Swap, and Interval Timer via `ai_edit_any_lifetime`.
  - Coach Explain:
    - 10 lifetime total per user.
    - Up to **5 per workout** (per-workout counter).

Key files touched:

- `src/lib/subscription-constants.ts`
- `src/app/api/workouts/ai-exercise-edit/route.ts`
- `src/app/api/workouts/ai-exercise-swap/route.ts`
- `src/app/api/workouts/coach-explain/route.ts`
- `src/app/api/workouts/ai-interval-timer/route.ts`
- `src/services/ai-exercise-service.ts` (client messaging and error handling)

## Tech Debt / Follow-Up Items

### 1. Centralize Tier Copy & Messaging

**Current state**

- Each API route (`ai-exercise-edit`, `ai-exercise-swap`, `coach-explain`, `ai-interval-timer`) constructs its own user-facing error messages for:
  - Lifetime limits (free tier).
  - Monthly limits (basic/pro/elite).
- These messages rely on `getAIEditLimit`, `getAISwapLimit`, or `getCoachExplainLimit`, but string templates are duplicated and slightly divergent.

**Follow-up**

- Create a **single shared helper** (server-side only) to generate tier messages:
  - Input: `{ feature: "ai_edit" | "ai_swap" | "coach_explain" | "interval_timer", tier, remaining, limit, reason? }`
  - Output: `{ statusCode, error, message }` object used by all AI-related routes.
- Goals:
  - Keep business rules/documentation for limits in one place.
  - Avoid future drift when tier numbers or semantics change.

> NOTE: This helper should live in a shared server-only module (e.g. `lib/ai-usage-messages.ts`) and not be introduced in timer/player components to keep boundaries clean.

### 2. Align Client-Side UX With New Limits

**Current state**

- Client components (e.g. AI editor panels, Coach Explain triggers, Interval Timer UI) rely on:
  - Toast messages from `AIExerciseService.handleError`.
  - Generic “Access denied” or “Rate limit reached” messages.
- They do not consistently surface:
  - Remaining quota for the user.
  - That free-tier limits are **lifetime**, not monthly.

**Follow-up**

- Enhance `AIExerciseService.handleError` to:
  - Recognize structured error responses from all AI routes (`tier`, `remaining`, `message`).
  - Provide more contextual toasts, e.g.:
    - “You’ve used 8 of 10 free AI actions. Upgrade to Basic for 100/month.”
  - Ensure messages mention **lifetime** limits explicitly for free tier.
- For Interval Timer:
  - Consider a small, non-blocking UI indicator when fallback presets are being used due to hitting the AI limit (currently we toast but don’t persist that state in the player).

### 3. Document Tier Semantics for Support & Marketing

**Current state**

- Code now encodes the updated limits, but there is no single human-facing document that:
  - Explains how AI limits are pooled across features.
  - Distinguishes lifetime vs monthly quotas.
  - Clarifies that Coach Explain uses its own lifetime/per-workout counters for free tier.

**Follow-up**

- Add or update a doc (e.g. `docs/product/SUBSCRIPTION_TIERS_AI_FEATURES.md`) that:
  - Lists per-tier AI quotas.
  - Shows which features draw from which pools.
  - Provides examples (e.g., “On free, 3 Coach Explains + 7 Edits = 10 total; further AI features require upgrade.”).
- This should be used as the source of truth for:
  - In-app copy.
  - Marketing pages.
  - Support runbooks.

### 4. Telemetry & Monitoring

**Current state**

- We log AI usage in `ai_usage_logs` (edits, swaps, Coach Explain, Interval Timer) with:
  - `user_id`, `edit_type`, and basic token/cost info.
- There is no consolidated view for:
  - How quickly users hit tier limits.
  - Distribution of usage across features by tier.

**Follow-up**

- Define minimal dashboards or queries (BigQuery / Looker / Firebase console):
  - AI usage per tier per month.
  - Free-tier users hitting the 10-action cap.
  - Coach Explain usage vs other AI actions.
- Use this data to:
  - Validate that the new limits are reasonable in practice.
  - Inform future adjustments to `AI_EDIT_LIMITS`, `AI_SWAP_LIMITS`, `COACH_EXPLAIN_LIMITS`.

### 5. Tests for Tier Enforcement

**Current state**

- Enforcement logic is implemented with Firestore transactions and counters, but:
  - There are no explicit unit/integration tests covering:
    - Lifetime counters for free tier across multiple routes.
    - Per-workout Coach Explain limit (5 per workout).
    - Monthly counters for basic/pro/elite.

**Follow-up**

- Add tests (preferably emulator-backed) that:
  - Simulate multiple AI calls across routes for a single user.
  - Assert that:
    - Free tier is blocked after 10 combined actions.
    - Coach Explain blocks after 5 invocations for the same workout.
    - Monthly counters reset correctly (or at least behave as expected within a mocked month).

---

> This document is intentionally scoped to **tier and AI limit semantics** introduced in this PR. Timer-specific refactors are tracked separately in `docs/tech-debt/timers/TIMERS_STATE_MACHINE_CLEANUP_PR_PLAN.md`.\*\*\*
