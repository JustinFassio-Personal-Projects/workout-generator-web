# Migration Review — Phase 0: Pre-Review Setup

Use this document to complete Phase 0 of the Next.js → Astro migration review. Record pass/fail and any fixes before proceeding to Phases 1–9.

---

## 1. Baseline: Production URLs and Key Flows

Reference list for comparing Astro behavior to current production (or pre-migration Next.js) during later phases.

### Primary URLs

| Page / area        | Example URL(s)                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| Homepage           | `/`                                                                       |
| About              | `/about`                                                                  |
| FAQ                | `/faq`                                                                    |
| Equipment          | `/equipment`                                                              |
| Founder story      | `/founder-story`                                                          |
| Story milestone    | `/story/why-ai-workout-generator`, `/story/santa-cruz-surfing`            |
| Onboard            | `/onboard`                                                                |
| Onboarding         | `/onboarding`                                                             |
| Exercise challenge | `/exercise-challenge`                                                     |
| Reports listing    | `/reports`                                                                |
| Report article     | `/reports/system-vs-randomness`, `/reports/ai-hallucinations-health-data` |
| Deep research list | `/deep-research`                                                          |
| Deep research slug | `/deep-research/<slug>` (from DB)                                         |
| Blog listing       | `/blog`                                                                   |
| Blog post          | `/blog/<slug>` (from DB)                                                  |
| Blog author        | `/blog/author/<name>`                                                     |
| Blog category      | `/blog/category/<slug>`                                                   |
| Videos             | `/videos/1`, `/videos/2` (ids 1–5 from `data/videos.ts`)                  |

### Key Flows

- **Blog post** (`/blog/<slug>`): Shows title, author, date, body, featured image, related posts; 404 for invalid slug redirects to `/404`.
- **Lead form** (footer / landing): Submits to `/api/leads`; success/error message shown; Turnstile and server validation applied.
- **Pricing CTAs**: Link to Stripe payment URLs (from `PUBLIC_STRIPE_PAYMENT_LINK_*`) or fallback to login URL.
- **Onboarding wizard**: Steps collect options; submit/redirect to signup (e.g. `buildSignupUrl` / login).
- **Reports**: Listing links to `/reports/<slug>`; report page may include live demo (Turnstile + Gemini) or static content.
- **Story**: Founder story and milestone pages; prev/next or listing navigation between milestones.
- **Special**: `/robots.txt`, `/feed.xml`, `/sitemap.xml`, `/sitemap-index.xml` return expected content; unknown paths show custom `/404` with status 404.

### Optional: Lighthouse baseline

- Run Lighthouse on 2–3 key production pages (e.g. homepage, `/blog`, one blog post). Save reports as e.g. `pre-migration-home.json`, `pre-migration-blog.json` for before/after comparison.

---

## 2. Scope: Astro vs Next.js

### 2.1 Astro-owned routes (migration scope)

Served by the Astro app (`astro-site/`). Audit these in Phases 1–8.

**Static / marketing**

- `/` (index)
- `/about`, `/faq`, `/equipment`, `/founder-story`
- `/onboard`, `/onboarding`, `/exercise-challenge`
- `/reports` (listing), `/deep-research` (listing)

**Dynamic**

- `/blog`, `/blog/[slug]`, `/blog/author/[name]`, `/blog/category/[slug]`
- `/story/[slug]`, `/videos/[id]`, `/reports/[slug]`, `/deep-research/[slug]`

**Special**

- `/404`, `/robots.txt`, `/feed.xml`, `/sitemap.xml`, `/sitemap-index.xml`

**API routes**

- `/api/leads`, `/api/blog`, `/api/reports/gemini-workout`

### 2.2 Next.js (unchanged; verify rewrites)

- **Routes:** `/admin/*`, `/api/admin/*` (admin dashboard and admin API).
- **Config:** `astro-site/vercel.json` rewrites:
  - `source: "/admin/:path*"` → `destination: "https://aiworkoutgenerator-admin.vercel.app/admin/:path*"`
  - `source: "/api/admin/:path*"` → `destination: "https://aiworkoutgenerator-admin.vercel.app/api/admin/:path*"`
- **Verification (after deploy):** On the deployed Astro domain, open `https://<your-astro-domain>/admin` and confirm Next.js admin (login or dashboard) loads. Locally, rewrites do not apply unless simulated (e.g. proxy or separate dev servers).

---

## 3. Phase 0 Sign-Off Checklist

Complete in order. Do not proceed to Phase 1 until all are checked.

- [x] **Build:** `cd astro-site && npm run build` succeeds (exit code 0; no errors).
- [x] **Dev server:** `cd astro-site && npm run dev` starts; no runtime errors in terminal; `http://localhost:4321` loads homepage.
- [x] **Env:** `astro-site/.env` exists with at least `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` (see `astro-site/.env.example`). Add optional vars as needed for production-like testing.
- [x] **Baseline:** Production URLs and key flows documented above (or in your own doc); optional Lighthouse reports saved.
- [x] **Scope:** Astro route list and Next.js/rewrite behavior confirmed above.

**Phase 0 complete (2025-02-02):** Astro build succeeds; exit-criteria routes (homepage, about, faq, equipment, exercise-challenge, founder-story, onboard, onboarding, reports, reports/[slug], deep-research, deep-research/[slug], blog/category/[slug], blog/author/[name], blog index and post) build and render. Optional: tenant context on `/onboard` — `onboard.astro` reads `x-tenant-domain` header, calls `getTenantByDomain`, passes `tenantId` to `OnboardingWizard`; page is server-rendered (`prerender = false`) so headers are available at runtime.

**Next step:** Proceed to Phase 1 (Core static and landing pages). Record pass/fail and fixes for each phase.
