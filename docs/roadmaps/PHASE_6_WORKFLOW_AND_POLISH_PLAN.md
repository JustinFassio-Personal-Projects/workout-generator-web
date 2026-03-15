# Phase 6: Workflow and Polish — Implementation Plan

**Parent roadmap:** [ADMIN_CONTENT_TO_MARKETING_ROADMAP.md](./ADMIN_CONTENT_TO_MARKETING_ROADMAP.md)  
**Objective:** Document workflows, add analytics, ensure resilience.

---

## 6.1 Document "Publish to marketing" workflow

**Goal:** Single entry-point doc for admins with step-by-step per content type.

| Step | Action | Location |
|------|--------|----------|
| 1 | Create **`docs/PUBLISH_TO_MARKETING.md`** | New file |
| 2 | Add intro: purpose (get content from admin to marketing site/homepage/explore), and table linking to existing workflow docs | Same file |
| 3 | For each content type, one subsection with: short flow (Draft → Publish → Feature), link to detailed doc, and "Feature on Homepage" note | Same file |

**Content types and existing docs:**

- **Programs** → [docs/PROGRAM_PUBLISH_WORKFLOW.md](../PROGRAM_PUBLISH_WORKFLOW.md)
- **Challenges** → [docs/CHALLENGE_PUBLISH_WORKFLOW.md](../CHALLENGE_PUBLISH_WORKFLOW.md)
- **Workouts** → [docs/WORKOUT_PUBLISH_WORKFLOW.md](../WORKOUT_PUBLISH_WORKFLOW.md)
- **Exercises (deep dive)** → [docs/EXERCISE_DEEP_DIVE_WORKFLOW.md](../EXERCISE_DEEP_DIVE_WORKFLOW.md)

**Deliverable:** Admins can open `PUBLISH_TO_MARKETING.md` and follow or jump to the right workflow.

---

## 6.2 Add `data-cta` attributes for featured content links

**Goal:** All featured content CTAs on homepage and explore have `data-cta` for analytics (e.g. PostHog).

**Current state:**

- **Have `data-cta`:** Hero, Bio, PricingCard, WorkoutsPreview (card + "View All"), ExercisesLearnPreview.
- **Missing `data-cta`:** ProgramsPreview, ChallengesPreview.

**Changes:**

| File | Change |
|------|--------|
| `astro-site/src/components/react/ProgramsPreview/ProgramsPreview.tsx` | Add `data-cta="programs-preview-card"` on each program card `<a>`, and `data-cta="programs-preview-view-all"` on "View All Programs" link. |
| `astro-site/src/components/react/ChallengesPreview/ChallengesPreview.tsx` | Add `data-cta="challenges-preview-card"` on each challenge card `<a>`, and `data-cta="challenges-preview-view-all"` on "View All Challenges" link. |

**Optional:** If explore page has any featured links that don’t use the same preview components, add consistent `data-cta` values (e.g. `explore-programs-card`, `explore-challenges-card`) so analytics can distinguish homepage vs explore.

**Deliverable:** Every featured content link on homepage (and explore if applicable) has a stable `data-cta` for tracking.

---

## 6.3 Add fallbacks when Supabase unavailable

**Goal:** Graceful degradation when Supabase is not configured or fails; no build break.

**Current state:**

- `astro-site/src/lib/featured/queries.ts`: `getFeaturedContent()` uses `isSupabaseConfigured()` and returns empty arrays when not configured; no throw.
- Homepage and explore use `getFeaturedContent()` and render empty sections when arrays are empty (preview components return `null` for `length === 0`).
- `astro-site/src/pages/api/blog.ts` already returns `[]` and uses cache headers when Supabase is missing or errors.

**Actions:**

| Step | Action | Location |
|------|--------|----------|
| 1 | **Document** current behavior in a short "Resilience" subsection under `docs/PUBLISH_TO_MARKETING.md` or in `astro-site/README.md` / `docs/...`: when Supabase is unconfigured or fails, featured content is empty and the site still builds and serves. | docs or astro-site README |
| 2 | **Optional:** In `getFeaturedContent()`, wrap Supabase calls in try/catch and on error return empty arrays (and optionally log). Only if we want extra safety beyond `isSupabaseConfigured()`. | `astro-site/src/lib/featured/queries.ts` |

**Deliverable:** Documented behavior; build and runtime remain safe when Supabase is down or missing.

---

## 6.4 Add cache headers for featured content

**Goal:** Reduce DB load for homepage and explore by allowing CDN/browser to cache the HTML response.

**Context:** Featured content is fetched in `getFeaturedContent()` during SSR of `index.astro` and `explore.astro` (both `prerender = false`). Caching the page response is the lever (no separate featured-content API).

**Options:**

1. **Vercel (recommended):** Set `Cache-Control` for `/` and `/explore` in `astro-site/vercel.json` using a `headers` array (e.g. `s-maxage=60, stale-while-revalidate=300` so featured updates appear within a few minutes).
2. **Astro middleware:** In `astro-site/src/middleware.ts` (create if missing), set `response.headers.set('Cache-Control', '...')` for `pathname === '/'` and `pathname === '/explore'`.

**Suggested values:** `public, s-maxage=60, stale-while-revalidate=300` (1 min CDN, 5 min revalidate). Adjust if you need faster visibility of "Feature on Homepage" changes (e.g. 30s).

| Step | Action | Location |
|------|--------|----------|
| 1 | Add `headers` in `vercel.json` for `"/"` and `"/explore"` with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`, **or** implement same via Astro middleware. | `astro-site/vercel.json` or `astro-site/src/middleware.ts` |
| 2 | Confirm in README or Phase 6 doc that homepage/explore are cached and that featuring changes may take up to ~1–5 minutes to appear. | docs |

**Deliverable:** Cache headers on homepage and explore; lower Supabase load; documented cache behavior.

---

## 6.5 Verify meta tags and Open Graph for content pages (programs app)

**Goal:** Programs app content pages (programs, challenges, exercises, learn) have correct meta description and Open Graph so shares and SEO are correct.

**Current state:**

- `apps/programs/src/layouts/BaseLayout.astro` accepts `title`, `description`, `canonicalUrl`, `ogImage` and outputs `<meta name="description">`, `og:title`, `og:description`, `og:url`, `og:type`, `og:image`, and Twitter card tags.
- Some pages already pass these (e.g. `programs/[id].astro`, `challenges/[id].astro` reference title/description).

**Verification checklist:**

| Page / route | Verify |
|--------------|--------|
| Programs index (`/programs`) | Uses BaseLayout with unique `title` and `description`. |
| Program detail (`/programs/[id]`) | Passes `title`, `description`, `canonicalUrl`, `ogImage` (if available). |
| Challenges index (`/challenges`) | Uses BaseLayout with unique `title` and `description`. |
| Challenge detail (`/challenges/[id]`) | Passes `title`, `description`, `canonicalUrl`, `ogImage` (if available). |
| Exercises index (`/exercises`) | Uses BaseLayout with unique `title` and `description`. |
| Exercise detail (if exists) | Passes `title`, `description`, `canonicalUrl`, `ogImage` where applicable. |
| Learn index (`/learn`) | Uses BaseLayout with unique `title` and `description`. |
| Learn detail (e.g. `/learn/[slug]`) | Passes `title`, `description`, `canonicalUrl`, `ogImage` where applicable. |

**Actions:**

| Step | Action | Location |
|------|--------|----------|
| 1 | For each of the above, open the page source or use a meta-checker and confirm `<meta name="description">`, `og:title`, `og:description`, and `og:url` (and `og:image` where intended). | Manual / script |
| 2 | Fix any page that omits `description` or OG props by passing them from the page into `BaseLayout`. | `apps/programs/src/pages/**/*.astro` |
| 3 | Optionally add a one-line note in Phase 6 or programs README: "Content pages use BaseLayout with title, description, canonicalUrl, ogImage for SEO and OG." | docs |

**Deliverable:** All programs app content pages verified and corrected for meta and Open Graph.

---

## Phase 6 deliverables summary

| # | Deliverable |
|---|-------------|
| 1 | **`docs/PUBLISH_TO_MARKETING.md`** — Single workflow entry point with steps per content type and links to existing workflow docs. |
| 2 | **Analytics** — `data-cta` on all featured content links (ProgramsPreview, ChallengesPreview; optionally explore-specific). |
| 3 | **Resilience** — Fallback behavior documented; optional try/catch in `getFeaturedContent()`. |
| 4 | **Cache** — Cache headers on `/` and `/explore` (vercel.json or middleware); short doc note. |
| 5 | **Meta/OG** — Programs app content pages (programs, challenges, exercises, learn) verified and fixed for meta and Open Graph. |

---

## Suggested implementation order

1. **6.1** — Publish-to-marketing doc (unblocks admins).
2. **6.2** — `data-cta` (small, clear edits).
3. **6.5** — Meta/OG verification (no dependency on others).
4. **6.4** — Cache headers (then document in 6.1 or README).
5. **6.3** — Document fallbacks (and optional try/catch).

This keeps docs and analytics first, then performance and resilience.
