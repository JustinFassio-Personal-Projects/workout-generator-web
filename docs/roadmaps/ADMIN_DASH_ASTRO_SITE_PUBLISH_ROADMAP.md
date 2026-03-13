# Roadmap: Connecting admin-dash-astro to astro-site for Content Publishing

**Goal:** Enable content managed in admin-dash-astro to appear on the astro-site (marketing site) so admins publish in one place and users see it at aiworkoutgenerator.com.

**Context:** admin-dash-astro manages programs, challenges, workouts, exercises, and equipment in Supabase. The **programs** app already consumes this content (via `/exercises`, `/learn`, proxied from astro-site). This roadmap focuses on connecting admin-dash-astro–managed content to **astro-site itself**—the marketing pages at aiworkoutgenerator.com.

---

## Current State

| Content Type      | Managed By           | Consumed By  | Data Source   |
|-------------------|----------------------|--------------|---------------|
| Programs          | admin-dash-astro     | programs app | Supabase      |
| Challenges        | admin-dash-astro     | programs app | Supabase      |
| Workouts          | admin-dash-astro     | programs app | Supabase      |
| Exercises         | admin-dash-astro     | programs app | Supabase      |
| Blog posts        | admin-dash (Next.js) | astro-site   | Supabase      |
| Deep research     | (unknown)            | astro-site   | Supabase      |
| Testimonials, FAQ, pricing, etc. | —               | astro-site   | Static `src/data/*.ts` |

**Gaps:**
- Blog management is in legacy admin-dash (Next.js); astro-site already reads Supabase `posts`.
- admin-dash-astro content (programs/challenges) is not shown on astro-site marketing pages.
- Marketing copy (testimonials, FAQ, hero) is static and not admin-editable.

---

## Phase 1: Verify Rewrites & Deployment (Foundation)

**Objective:** Ensure astro-site correctly proxies to admin-dash-astro and programs so URLs and API calls work.

### Tasks

| Task | Notes |
|------|-------|
| Confirm astro-site `vercel.json` rewrites | `/admin/*`, `/api/admin/*` → admin-dash-astro |
| Confirm `/exercises`, `/learn` rewrites | → programs.aiworkoutgenerator.com |
| Test admin login at `aiworkoutgenerator.com/admin` | Must reach admin-dash-astro |
| Verify `api/admin/*` calls from admin-dash-astro resolve | May need `PUBLIC_SITE_URL` / relative URLs so requests go through astro-site proxy |

### Deliverables

- Rewrites validated in production
- Document base URLs for API calls (e.g. `/api/admin/...` vs absolute URLs)

**See:** [Phase 1 Base URLs & Verification](../../phase1-base-urls.md)

---

## Phase 2: Migrate Blog Management to admin-dash-astro

**Objective:** Manage blog posts from admin-dash-astro instead of admin-dash. astro-site already reads `posts` from Supabase—no changes needed there.

### 2.1 Schema & API

| Task | Notes |
|------|-------|
| Confirm Supabase `posts`, `categories`, `authors` schema | Same as admin-dash |
| Add `Manage Blog` section to admin-dash-astro nav | Same layout as Manage Programs, Manage Challenges |
| Implement `api/admin/blog` routes | GET list, POST create, PUT/PATCH update, DELETE; mirror admin-dash API shape |
| Implement blog list + editor UI | Table, filters (status, category), create/edit form (title, slug, excerpt, content, featured_image, status, published_at) |

### 2.2 Parity with admin-dash

| Task | Notes |
|------|-------|
| Revalidate / cache bust on publish | admin-dash uses `notifyMainSiteRevalidate`; astro-site may need ISR or similar if applicable |
| Image upload for featured_image | Reuse existing storage pattern (e.g. Supabase Storage) |
| Categories & authors CRUD | If not present, add minimal admin UI or seed data |

### Deliverables

- Blog managed at `aiworkoutgenerator.com/admin` (admin-dash-astro)
- New/updated posts visible on astro-site `/blog`, `/blog/[slug]`, BlogPreview component
- Optional: Deprecate blog management in admin-dash (Next.js)

---

## Phase 3: Featured Content on astro-site Landing

**Objective:** Show admin-managed programs and/or challenges on the astro-site homepage so content flows from admin-dash-astro to marketing.

### 3.1 Data Model

| Task | Notes |
|------|-------|
| Add `featured` or `featured_on_landing` flag | On `programs` and/or `challenges` (or a join table) |
| Or use `status = 'published'` + `created_at` | Show “Latest Programs” without a featured flag |

### 3.2 astro-site Integration

| Task | Notes |
|------|-------|
| Add server-side fetch in `index.astro` | Query Supabase for featured/latest programs or challenges |
| Create `ProgramsPreview` / `ChallengesPreview` component | Similar to BlogPreview; link to `/exercises` or programs app |
| Respect RLS / public read access | Use anon or server client with appropriate policy |

### 3.3 admin-dash-astro

| Task | Notes |
|------|-------|
| Add “Feature on homepage” toggle | In Program/Challenge editor |
| Or “Publish” → automatically eligible for landing | Depends on product decision |

### Deliverables

- astro-site homepage shows programs/challenges from Supabase
- Admins control visibility via admin-dash-astro
- Links route to programs app (`/exercises`, `/programs`, etc.)

---

## Phase 4: Deep Research (Optional)

**Objective:** Manage deep research articles in admin-dash-astro; astro-site already consumes `deep_research` from Supabase.

### Tasks

| Task | Notes |
|------|-------|
| Confirm `deep_research` schema | columns, RLS |
| Add `Manage Deep Research` in admin-dash-astro | CRUD for `deep_research` |
| Add API routes if needed | Or direct Supabase from admin UI with service role |
| Ensure astro-site `/deep-research` uses same data | No change if already querying Supabase |

---

## Phase 5: Editable Marketing Content (Optional / Future)

**Objective:** Allow admins to edit testimonials, FAQ, hero copy, pricing tiers instead of changing `src/data/*.ts` and redeploying.

### Approach

- New Supabase tables: `marketing_content`, `testimonials`, `faq_items`, `pricing_tiers`, etc.
- Admin UI in admin-dash-astro for each content type
- astro-site: replace static imports with Supabase fetches (with fallback to static data for resilience)
- Cache headers / ISR for performance

This is a larger change; treat as a follow-on roadmap after Phases 1–4.

---

## Dependencies

- Same Supabase project for admin-dash-astro and astro-site
- Shared env vars: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (admin only)
- Vercel rewrites configured for `/admin` and `/api/admin` from astro-site to admin-dash-astro

---

## Recommended Order

1. **Phase 1** – Validate rewrites and deployment (quick)
2. **Phase 2** – Blog migration (high impact, consolidates content admin)
3. **Phase 3** – Featured content on landing (direct admin → marketing flow)
4. **Phase 4** – Deep research (if needed)
5. **Phase 5** – Editable marketing content (future)

---

## File References

| Area | Path |
|------|------|
| astro-site rewrites | `astro-site/vercel.json` |
| astro-site blog queries | `astro-site/src/lib/blog/queries.ts` |
| astro-site blog API | `astro-site/src/pages/api/blog.ts` |
| admin-dash blog API (reference) | `apps/admin-dash/app/api/admin/blog/` |
| admin-dash-astro structure | `apps/admin-dash-astro/src/pages/admin/` |
| Supabase schema | `supabase/migrations/`, `apps/admin-dash-astro/docs/RUN_*.sql` |
