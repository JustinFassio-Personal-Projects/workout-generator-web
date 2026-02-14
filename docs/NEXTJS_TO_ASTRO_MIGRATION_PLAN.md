# Phased Plan: Next.js → Astro Migration

**Goal:** Treat Astro as the canonical front end. Fix and keep all Astro files, migrate remaining Next.js functionality into Astro (or shared backend), then remove duplicate/legacy Next.js code.

**Reference:** `astro-site/README.md` (Astro as legacy/optional) will be updated once migration is complete to state Astro is canonical.

---

## 1. Audit: Remaining Next.js Surface

### 1.1 Next.js pages (`app/`)

| Route / area                                                                                                                   | Purpose                                          | Astro equivalent / gap                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                                            | Home                                             | `astro-site/src/pages/index.astro` (broken imports)                                                                  |
| `/admin`, `/admin/*`                                                                                                           | Dashboard, blog, leads, deep-research, analytics | **No Astro admin** – decide: keep Next.js admin app or build Astro admin                                             |
| `/blog`                                                                                                                        | Blog list                                        | **Missing** – Astro has only `blog/category/[slug]`, `blog/author/[name]`                                            |
| `/blog/[slug]`                                                                                                                 | Single post                                      | **Missing** in Astro                                                                                                 |
| `/blog/category/[slug]`, `/blog/author/[name]`                                                                                 | Category / author listing                        | `blog/category/[slug].astro`, `blog/author/[name].astro` (depend on deleted BlogCard)                                |
| `/deep-research`, `/deep-research/[slug]`                                                                                      | Deep research list/detail                        | Present in Astro; use `lib/deep-research/queries`                                                                    |
| `/reports`, `/reports/[slug]`                                                                                                  | Reports list/detail                              | Present in Astro; report detail uses missing `ReportV2Content`                                                       |
| `/faq`, `/about`, `/equipment`, `/exercise-challenge`, `/founder-story`, `/onboard`, `/onboarding`, `/videos`, `/story/[slug]` | Marketing/onboarding                             | Astro pages exist; some have broken React/landing imports                                                            |
| `/sites/[domain]`                                                                                                              | Multi-tenant landing                             | **Next.js only** – no Astro equivalent                                                                               |
| `/feed.xml`, `/api/*`                                                                                                          | RSS, APIs                                        | Astro has `feed.xml.ts`, `sitemap.xml.ts`, `api/leads.ts`, `api/blog.ts`; admin/auth and other APIs are Next.js only |

### 1.2 Next.js API routes (`app/api/`)

| API                                                                          | Purpose                       | Astro / shared                                                    |
| ---------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `POST /api/admin/auth/login`, logout, verify                                 | Admin session (cookies)       | Next.js only                                                      |
| `GET/POST /api/admin/blog`, `.../blog/[slug]`                                | Blog CRUD                     | Next.js only                                                      |
| `GET/POST /api/admin/leads`, `.../leads/[id]`                                | Leads CRUD                    | Next.js only                                                      |
| `GET/POST /api/admin/deep-research`, `.../deep-research/[slug]`              | Deep research CRUD            | Next.js only                                                      |
| `POST /api/admin/upload`, revalidate                                         | Upload, revalidation          | Next.js only                                                      |
| `POST /api/leads`                                                            | Lead capture                  | Astro `api/leads.ts` (uses `createServerSupabaseClient` – see §2) |
| `GET /api/blog`                                                              | Blog listing (e.g. for Astro) | Astro `api/blog.ts`                                               |
| `POST /api/analytics/collect`, exercise-submissions, vision-lead-intel, etc. | Analytics, forms, intel       | Next.js only                                                      |

### 1.3 Next.js-only features

- **Admin app:** Full dashboard (stats, blog, leads, deep-research, analytics) and auth (login API + cookie-based session). No Astro admin today.
- **Multi-tenant:** `sites/[domain]` + tenant config (e.g. `lib/multi-tenant/tenant-config`), proxy/headers (`x-tenant-domain`). Not replicated in Astro.
- **Proxy:** Root `proxy.ts` (or middleware) for tenant headers and admin session refresh; used when running Next.js.

---

## 2. Audit: Astro Broken / Missing Pieces

**Alias:** In `astro-site`, `@` resolves to `astro-site/src` (see `astro-site/astro.config.mjs`). All imports below are relative to `astro-site/src`.

### 2.1 Missing Astro components (deleted; still imported)

| Import path                           | Used in                                                           | Action                                                          |
| ------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `@/components/blog/BlogCard.astro`    | `blog/category/[slug].astro`, `blog/author/[name].astro`          | Restore (from git history or Next.js-equivalent) or reimplement |
| `@/components/blog/BlogHero.astro`    | (Was used by blog list/post; pages themselves missing – see §2.3) | Restore if adding blog index/post                               |
| `@/components/blog/PostContent.astro` | (Blog post body)                                                  | Restore when adding blog post page                              |
| `@/components/blog/PostHero.astro`    | (Blog post hero)                                                  | Restore when adding blog post page                              |

### 2.2 Missing landing components (Astro)

| Import path                                         | Used in       | Action                 |
| --------------------------------------------------- | ------------- | ---------------------- |
| `@/components/landing/Features.astro`               | `index.astro` | Restore or reimplement |
| `@/components/landing/Pricing.astro`                | `index.astro` | Restore or reimplement |
| `@/components/landing/OnboardingIntroSection.astro` | `index.astro` | Restore or reimplement |

### 2.3 Missing React components in `astro-site/src/components/react/`

| Import path                                              | Used in                    | In root codebase                                                                                            | Action                                                           |
| -------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@/components/react/ScienceChart/ScienceChart`           | `index.astro`              | `components/landing/ScienceChart/`                                                                          | Copy or symlink into astro-site                                  |
| `@/components/react/FaqItem`                             | `index.astro`, `faq.astro` | `components/ui/FAQItems/FaqItem.tsx`                                                                        | Copy or symlink                                                  |
| `@/components/react/JourneySection/JourneySection`       | `index.astro`              | Only `JourneySection.module.scss` in astro-site; TSX in root?                                               | Locate/copy TSX + deps                                           |
| `@/components/react/Testimonials/Testimonials`           | `index.astro`              | Root components                                                                                             | Copy or symlink                                                  |
| `@/components/react/BlogPreview/BlogPreview`             | `index.astro`              | Root components                                                                                             | Copy or symlink                                                  |
| `@/components/react/EquipmentAdaptive/EquipmentAdaptive` | `index.astro`              | Only `.module.scss` in astro-site                                                                           | Locate TSX in root, copy                                         |
| `@/components/react/OnboardingWizard/OnboardingWizard`   | `onboard.astro`            | `components/landing/OnboardingWizard/OnboardingWizard.tsx` (full wizard)                                    | Copy full wizard into astro-site or alias to root                |
| `@/components/react/EquipmentCardGrid/EquipmentCardGrid` | `equipment.astro`          | Present in astro-site                                                                                       | OK                                                               |
| `@/components/reports/ReportV2Content`                   | `reports/[slug].astro`     | `components/features/reports/ReportV2Content.tsx` (root); astro-site has only `ReportV2Content.module.scss` | Copy ReportV2Content (+ subcomponents) or add Vite alias to root |

### 2.4 Missing Supabase server client in Astro

- `astro-site/src/lib/supabase/server.ts` **does not exist**.
- `astro-site/src/lib/blog/queries.ts` and `astro-site/src/pages/api/leads.ts` (and possibly `api/blog.ts`) import `createServerSupabaseClient` from `@/lib/supabase/server`.
- **Action:** Add `astro-site/src/lib/supabase/server.ts` that implements cookie-based Supabase client for Astro (using `Astro.cookies` or request/response in API routes). Reference: root `lib/supabase/server.ts` and `@supabase/ssr` patterns.

### 2.5 Missing blog pages in Astro

- **Blog index** (`/blog`): No `astro-site/src/pages/blog/index.astro` or `blog.astro`.
- **Blog post** (`/blog/[slug]`): No `astro-site/src/pages/blog/[slug].astro`.
- Blog category/author pages exist but depend on deleted `BlogCard.astro`.

### 2.6 Summary: what “fix Astro” means

1. Add **`astro-site/src/lib/supabase/server.ts`** (cookie-based Supabase for Astro).
2. Restore or reimplement **landing**: Features.astro, Pricing.astro, OnboardingIntroSection.astro.
3. Restore or reimplement **blog**: BlogCard.astro, and (for blog index/post) BlogHero, PostContent, PostHero.
4. Add **React components** into astro-site (or Vite alias to root): ScienceChart, FaqItem, JourneySection, Testimonials, BlogPreview, EquipmentAdaptive, OnboardingWizard, ReportV2Content (and subcomponents).
5. Add **blog index** and **blog [slug]** pages in Astro, using existing `lib/blog/queries.ts` and restored blog components.
6. Verify **deep-research**, **reports**, **api/leads**, **api/blog** after (1)–(5).

---

## 3. Phased Plan

### Phase 0: Fix Astro build and static pages (no new features)

**Objective:** Astro site builds and all existing Astro routes render without broken imports.

- **0.1** Add `astro-site/src/lib/supabase/server.ts` (cookie-based Supabase; adapt from root `lib/supabase/server.ts` for Astro request/cookies API).
- **0.2** Restore or reimplement in Astro:
  - `Features.astro`, `Pricing.astro`, `OnboardingIntroSection.astro` (landing).
  - `BlogCard.astro` (minimal: used by category/author pages).
- **0.3** Add missing React components under `astro-site/src/components/` (copy from root or add Vite alias to root and fix paths):
  - ScienceChart, FaqItem, JourneySection, Testimonials, BlogPreview, EquipmentAdaptive, OnboardingWizard, ReportV2Content (and report subcomponents used by ReportV2Content).
- **0.4** Fix report page: ensure `ReportV2Content` (and styles) resolve; either copy `components/features/reports/*` into astro-site or alias.
- **0.5** Run `astro build` (or `npm run build` from astro-site) and fix any remaining import/type errors.

**Exit criteria:** `astro build` succeeds; homepage, about, faq, equipment, exercise-challenge, founder-story, onboard, onboarding, reports, reports/[slug], deep-research, deep-research/[slug], blog/category/[slug], blog/author/[name] all build and render.

---

### Phase 1: Complete Astro blog (index + post)

**Objective:** Blog list and single post live in Astro; parity with Next.js blog UX.

- **1.1** Add `astro-site/src/pages/blog/index.astro` (or `blog.astro`) – list posts using `lib/blog/queries.ts` and BlogCard.
- **1.2** Add `astro-site/src/pages/blog/[slug].astro` – single post using existing queries, PostHero, PostContent (restore PostHero/PostContent in Phase 0 or here).
- **1.3** Restore BlogHero if used on blog index; ensure meta, canonical, structured data.
- **1.4** Optionally add redirects in proxy/vercel so `/blog` and `/blog/[slug]` served by Astro when proxy points to Astro.

**Exit criteria:** `/blog` and `/blog/[slug]` work in Astro with correct data and layout.

---

### Phase 2: Admin and APIs – decide ownership

**Objective:** Decide where admin and key APIs live long-term; document and implement.

**Options:**

- **A) Keep admin in Next.js**
  - Admin remains a separate Next.js app (or subdomain). Proxy continues to route `/admin` to Next.js; Astro serves marketing/blog/deep-research/reports.
  - Minimal change: keep current Next.js admin + login API; remove from Astro scope.

- **B) Migrate admin to Astro**
  - Build Astro admin pages (dashboard, blog, leads, deep-research, analytics) and Astro API routes (or serverless) for login, CRUD, upload, revalidate.
  - Requires: cookie-based auth in Astro, protected routes, and moving all admin API logic.

**Recommended for plan:** Start with **Option A** (keep admin in Next.js) so Phase 0–1 can ship Astro as canonical for public site; migrate admin later if desired (Phase 4).

- **2.1** Document decision: “Admin stays Next.js” or “Admin will move to Astro by Phase 4.”
- **2.2** If Option A: ensure proxy/deploy routes `/admin` and `/api/admin/*` to Next.js; Astro owns `/`, `/blog`, `/deep-research`, `/reports`, `/faq`, etc., and public APIs used by Astro (e.g. `/api/leads`, `/api/blog` can stay in Astro).
- **2.3** If Option B: add Phase 4 backlog: Astro admin pages + Astro admin API routes + auth.

---

### Phase 3: Multi-tenant and remaining Next.js-only routes

**Objective:** Handle `/sites/[domain]` and any other Next.js-only routes.

- **3.1** If multi-tenant is still required: implement `astro-site/src/pages/sites/[domain].astro` (or equivalent) using tenant config (move or share `lib/multi-tenant/tenant-config`); ensure proxy sets `x-tenant-domain` when serving Astro.
- **3.2** Migrate or retire any other Next.js-only pages (e.g. special landing pages, redirects).
- **3.3** Ensure feed.xml, sitemap, robots in Astro are canonical and linked from layout.

**Exit criteria:** No remaining “must-have” pages only in Next.js for the public site.

---

### Phase 4: Remove duplicate Next.js code (public site)

**Objective:** Single codebase for the public site: Astro. Next.js only if retained for admin (Option A).

- **4.1** Remove or archive Next.js **public** pages that are now in Astro: home, blog, blog/[slug], blog/category, blog/author, deep-research, reports, faq, about, equipment, exercise-challenge, onboard, onboarding, founder-story, story, videos, etc. Keep only:
  - Admin app and admin API routes (if Option A), and
  - Proxy (or minimal Next.js entry) that routes to Astro for public and to Next.js for `/admin` (if applicable).
- **4.2** Update root `tsconfig.json` and build/deploy so that the **default build** is Astro for the public site (e.g. build output = Astro `dist/` or Vercel project points to astro-site).
- **4.3** Remove duplicate Tailwind/content config for Next.js public pages; keep shared tokens/types where used by both Astro and admin.
- **4.4** Update `astro-site/README.md`: Astro is the canonical front end; Next.js (if any) is admin-only.

**Exit criteria:** Deploy serves public site from Astro; no duplicate public routes in Next.js.

---

### Phase 5 (optional): Migrate admin to Astro

**Only if Option B was chosen in Phase 2.**

- **5.1** Implement admin auth (login/logout/verify) as Astro API routes or serverless, with cookie-based Supabase session.
- **5.2** Implement admin dashboard and CRUD pages in Astro (blog, leads, deep-research, analytics).
- **5.3** Move upload, revalidation, and other admin APIs to Astro or shared backend.
- **5.4** Remove Next.js admin app and related proxy routes; Astro serves entire site.

---

## 4. Dependency order and risks

- **Phase 0 is blocking** for everything else: Astro must build and all current Astro pages must resolve imports and run.
- **Phase 1** depends on Phase 0 (BlogCard, queries, and optionally PostHero/PostContent).
- **Phases 2–3** can be done in parallel after Phase 1 (admin decision + multi-tenant).
- **Phase 4** depends on Phases 0–3 and on deploy/config so Astro is the default build.
- **Risks:** (1) ReportV2Content and OnboardingWizard have many subcomponents/SCSS – copying may require dependency cleanup. (2) Supabase server client in Astro must match cookie behavior of current Next.js login so existing sessions still work if proxy is shared.

---

## 5. Quick reference: files to restore or add (Astro)

| Item                   | Location (astro-site/src)                                  | Source / action                                                     |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Supabase server        | `lib/supabase/server.ts`                                   | New file; adapt from root `lib/supabase/server.ts` for Astro        |
| Features               | `components/landing/Features.astro`                        | Restore from git or reimplement                                     |
| Pricing                | `components/landing/Pricing.astro`                         | Restore from git or reimplement                                     |
| OnboardingIntroSection | `components/landing/OnboardingIntroSection.astro`          | Restore from git or reimplement                                     |
| BlogCard               | `components/blog/BlogCard.astro`                           | Restore from git (deleted in diff)                                  |
| BlogHero               | `components/blog/BlogHero.astro`                           | Restore when adding blog index/post                                 |
| PostContent            | `components/blog/PostContent.astro`                        | Restore when adding blog post page                                  |
| PostHero               | `components/blog/PostHero.astro`                           | Restore when adding blog post page                                  |
| ScienceChart           | `components/react/ScienceChart/`                           | Copy from root `components/landing/ScienceChart/`                   |
| FaqItem                | `components/react/FaqItem/`                                | Copy from root `components/ui/FAQItems/FaqItem.tsx` (+ deps)        |
| JourneySection         | `components/react/JourneySection/JourneySection.tsx`       | Locate in root; copy TSX + SCSS                                     |
| Testimonials           | `components/react/Testimonials/`                           | Copy from root                                                      |
| BlogPreview            | `components/react/BlogPreview/`                            | Copy from root                                                      |
| EquipmentAdaptive      | `components/react/EquipmentAdaptive/EquipmentAdaptive.tsx` | Locate in root; copy TSX + SCSS                                     |
| OnboardingWizard       | `components/react/OnboardingWizard/`                       | Copy from root `components/landing/OnboardingWizard/` (full wizard) |
| ReportV2Content        | `components/reports/ReportV2Content.tsx` (+ subcomponents) | Copy from root `components/features/reports/` or alias              |
| Blog index page        | `pages/blog/index.astro` or `pages/blog.astro`             | New; use blog queries + BlogCard                                    |
| Blog post page         | `pages/blog/[slug].astro`                                  | New; use blog queries + PostHero + PostContent                      |

This plan keeps all Astro files, fixes broken imports and missing modules, completes the blog in Astro, then cleans up duplicate legacy Next.js code with a clear decision on admin and multi-tenant.
