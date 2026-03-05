# Pre-Merge Report — Pricing / Reverse Trial (Premium Entry Tier)

**Branch:** ui/align-main-content-with-programs  
**Reviewer:** Senior Lead Engineer (Final PR Gatekeeper)  
**Date:** 2025-03-03

---

## Fixed (Critical / Performance / Docs)

| Item | File | Resolution |
|------|------|------------|
| **Redundant comment (slop)** | `apps/nextjs-backend/data/pricing.ts` | Removed `// Optional link for CTA button` from `ctaLink?: string` (obvious from type). |
| **Doc accuracy** | `docs/PHASE2_APP_STRIPE_NOTE.md` | Updated fallback sentence: when env unset, default Premium link is used **only in production**; dev/staging use login URL to avoid accidental live checkout. |

---

## Slop Scrubbed

- **Redundant comments:** One removed (nextjs `ctaLink` inline comment). Astro/programs “Outside production, avoid routing…” comments retained—they explain non-obvious production gating.
- **Hallucinated APIs:** None. `getAppBaseUrl` from `@/lib/buildSignupUrl` verified. `import.meta.env.PROD` / `import.meta.env.PUBLIC_*` are standard Vite/Astro; `process.env.NODE_ENV` / `NEXT_PUBLIC_*` standard in Next.js.
- **Dead logic / placeholders:** None. No unused variables or redundant try/catch in pricing data or PricingCard/PricingSection.
- **Commented-out code:** None in changed files.

---

## Ignored (With Reason)

| Suggestion / Check | Reason |
|--------------------|--------|
| Trivial class-order / Prettier-only diffs (e.g. `focus:ring-2 focus:ring-orange-light/20` → reordered) | Style-only; matches existing codebase formatter. No functional change; no action. |
| Extra abstraction for “get env with type” in programs | Current `(import.meta as unknown as { env?: … }).env` pattern is explicit and matches Vite typings; no new helper added. |

---

## Security & Architecture Verification

- **Astro / Programs (data layer):** `import.meta.env` used only in **data modules** (`astro-site/src/data/pricing.ts`, `apps/programs/src/data/pricing.ts`), which run at build time. `PUBLIC_STRIPE_PAYMENT_LINK_*` and `PUBLIC_APP_URL` are intended for client; `PROD` is Vite built-in. No server secrets in client bundle.
- **Next.js:** `apps/nextjs-backend/data/pricing.ts` uses `process.env.NODE_ENV` and `NEXT_PUBLIC_*`; this file is server/build-only. No Node APIs (`fs`, `path`) in client components.
- **PricingCard / PricingSection:** No env or Node APIs; receive `plan` from parent. Safe.

---

## Status

**READY TO MERGE**

- Critical/slop item and doc inaccuracy addressed.
- No new debt, TODOs, or hallucinated APIs.
- Env usage and build-time vs client boundaries verified for nextjs-backend, astro-site, and programs.
