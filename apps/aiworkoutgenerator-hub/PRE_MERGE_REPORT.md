# Pre-Merge Report — Free Tier / Upgrade Modal PR

**Branch:** `claude/add-free-tier-pricing-v7wXg`  
**Reviewer:** Senior Lead Engineer (Final PR Gatekeeper)  
**Date:** 2025-02-03

---

## Phase 1: Triage & Execution Summary

All pending GitHub Copilot comments from this PR were evaluated against the Decision Matrix and either **fixed** or **explicitly ignored** with justification. A final code scrub was performed on all modified files.

---

## Fixed (Critical & Performance)

| Item                                           | File(s)                                                                                   | Resolution                                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Check headers missing on checkout**      | `UpgradeModal.tsx`                                                                        | Added `getAppCheckHeaders()` to `/api/stripe/checkout` fetch so requests succeed when App Check is enabled.                                                           |
| **403 quota not attaching tier/remaining**     | `ai-exercise-service.ts`                                                                  | For 403 responses with `tier` or `remaining`, the service now throws an Error with those properties so UI can show the correct modal (free vs paid).                  |
| **Free users not seeing upgrade modal**        | All AI panels + generate page                                                             | Rate-limit branch now runs for free-tier 403; panels and generate page use tier-aware modal (free → UpgradeModal, basic/pro → PricingModal).                          |
| **Paid users shown Basic-only CTA**            | `AddModePanel`, `SwapModePanel`, `EditModePanel`, `generate/page.tsx`, `UpgradeModal.tsx` | When `remaining === 0` and `tier === "basic"` or `"pro"`, call `showPricingModal()` instead of `showUpgradeModal(...)`. Generate page auto-open effect gated by tier. |
| **Checkout always sending tier: "basic"**      | `UpgradeModal.tsx`                                                                        | Checkout tier derived from ID token `subscription_tier` claim: free → basic, basic → pro, pro → elite; fallback basic on decode error.                                |
| **Doc/comment mismatch (lifetime vs monthly)** | `UpgradeModal.tsx`                                                                        | Docstring updated from "exhausts their lifetime limits" to "reaches their free-plan monthly limits".                                                                  |
| **Modals in initial bundle**                   | `UpgradeModalProvider.tsx`                                                                | Both modals lazy-loaded with `next/dynamic({ ssr: false })`; each modal mounted only when first opened (`hasOpenedUpgrade` / `hasOpenedPricing`).                     |
| **Prettier / style**                           | Multiple files                                                                            | Ran `npx prettier --write .`; committed (31 files).                                                                                                                   |
| **buildLimitReachedMessage hardcoded limits**  | `ai-action-limiter.ts`                                                                    | Message text now derived from `getAIActionLimit()` so copy stays in sync with enforced limits.                                                                        |
| **usage.tier as string**                       | `ai-exercise-editor.ts`                                                                   | `AIEditResponse.usage.tier` and `CoachExplainResponse.usage.tier` typed as `SubscriptionTier` for consistency and type safety.                                        |
| **Transaction-failure fallback undercounts**   | `ai-action-limiter.ts`                                                                    | Fallback now reads the counter doc (no increment) instead of `ai_usage_logs`; removed unused `Timestamp` import.                                                      |
| **Deprecated limits can drift**                | `subscription-constants.ts`                                                               | `AI_ACTION_LIMITS` defined first; `AI_EDIT_LIMITS`, `AI_SWAP_LIMITS`, `COACH_EXPLAIN_LIMITS` exported as aliases so they cannot diverge.                              |

---

## Ignored (With Reason)

| Suggestion                                     | Reason                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Env-configurable Sentry log levels**         | Not required to resolve the comment; adds config surface. Can be added later if a kill switch is needed. |
| **Duplicate toast in rate-limit blocks**       | Already removed in current code (single toast for non-zero remaining).                                   |
| **Astro / import.meta.env / Frontmatter**      | N/A — this is a Next.js app; no Astro or frontmatter in scope.                                           |
| **New utility for JWT decode or tier mapping** | Kept inline in `UpgradeModal` to avoid new shared abstractions; logic is small and local.                |
| **Migrate/seed from legacy counter docs**      | No legacy schema in codebase; COMMENT only.                                                              | Documented in NOTES (free + paid) that we use a single unified doc and do not migrate; one-time seed could be added later if legacy doc IDs are defined. Not implemented to avoid speculative logic. |

---

## Phase 2: Implementation Rules Compliance

- **Atomic changes:** Only targeted edits; no full rewrites.
- **No new debt:** No `TODO`, `FIXME`, or commented-out code blocks in modified files.
- **Documentation:** Inline comments added where behavior is non-obvious (e.g. quota 403 vs waiver 403, tier→checkout mapping, lazy-load intent). No deviations that required a "NOTE: Kept existing pattern" comment.

---

## Phase 3: Final Scrub Results

- **TODO / FIXME / HACK:** None in any modified `src/` files (upgrade, ai-editor, generate, services, lib, types).
- **Loose types:** No new `any` or `as any` in modified files.
- **Security:** App Check and auth headers in place for checkout; fallback uses counter doc (no log-based undercount).
- **403 handling:** Waiver 403 handled first; quota 403 attaches tier/remaining; no overlap.
- **Linter:** No linter errors on modified files.
- **Single source of truth:** `AI_ACTION_LIMITS` is the only definition; deprecated constants are aliases.

---

## Files Touched (PR scope)

- `src/app/generate/page.tsx` — tier-aware auto-open; Prettier
- `src/app/layout.tsx` — (existing UpgradeModalProvider usage; no logic change)
- `src/components/upgrade/UpgradeModal.tsx` — App Check, docstring, checkout tier from token
- `src/components/upgrade/UpgradeModalProvider.tsx` — lazy-load; mount-on-first-open; Prettier
- `src/components/upgrade/index.ts` — (exports unchanged)
- `src/components/workout/ai-editor/AddModePanel.tsx` — tier-aware rate limit + showPricingModal
- `src/components/workout/ai-editor/EditModePanel.tsx` — same for AI edit + Coach Explain
- `src/components/workout/ai-editor/SwapModePanel.tsx` — same for swap
- `src/services/ai-exercise-service.ts` — 403 quota tier/remaining on thrown error
- `src/lib/ai-action-limiter.ts` — buildLimitReachedMessage from getAIActionLimit; fallback uses counter doc; migration NOTES
- `src/lib/subscription-constants.ts` — AI_ACTION_LIMITS first; deprecated limits as aliases
- `src/types/ai-exercise-editor.ts` — usage.tier as SubscriptionTier
- Plus Prettier/formatter changes across workflows, docs, reference, and API routes (no logic change).

---

## Verdict

**READY TO MERGE**

All Critical and applicable Performance items from the Copilot comments have been addressed. No new technical debt, no linter issues, and no known security or logic gaps in the modified paths. Recommend running the full test suite and a quick smoke test of upgrade/pricing flows (free limit, basic/pro limit, checkout CTA) before merging.
