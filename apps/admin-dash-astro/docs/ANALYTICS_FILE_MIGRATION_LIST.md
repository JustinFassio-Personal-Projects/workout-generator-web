# Admin Analytics Tab — File List for Migration

Use this list to copy and migrate the **Admin Analytics** tab into another Astro project that is otherwise identical (same Supabase, admin auth, and routing structure). Paths are relative to this repo.

**Supabase:** Analytics use the same Supabase client as the rest of the app (env only: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). There are no hardcoded DB URLs. For **this** app (admin-dash-astro), the DB is `https://qbklyimfazrkutwqictw.supabase.co` — set that in `.env` / `.env.local`; do not carry over URLs from another project.

**If you see "not found in schema cache" (PGRST202/PGRST205) for `get_acquisition_stats`, `analytics_funnel_events`, or `errors_frontend`:** the app is talking to the project at `PUBLIC_SUPABASE_URL`, but those objects may not exist there (or the API schema cache is stale). Run the SQL in **`docs/RUN_ANALYTICS_SCHEMA_IN_APP_PROJECT.sql`** in that project’s Supabase Dashboard → SQL Editor, then go to **Project Settings → API** and click **Reload schema cache**.

---

## 1. UI and routing

| File | Purpose |
|------|--------|
| `apps/app/src/components/react/admin/views/AnalyticsView.tsx` | Analytics dashboard: overview, acquisition, auth funnel, engagement, monetization, quality sections and charts |
| `apps/app/src/components/react/admin/AdminDashboard.tsx` | Add route `path="analytics" element={<AnalyticsView />}` and ensure `AnalyticsView` import |
| `apps/app/src/lib/admin/navigation.ts` | Add nav item `{ path: '/analytics', label: 'Analytics', icon: BarChart2 }` (or ensure it exists) |

---

## 2. API routes (GET, admin-protected)

| File | Purpose |
|------|--------|
| `apps/app/src/pages/api/admin/analytics/overview.ts` | Overview: total events, distinct users |
| `apps/app/src/pages/api/admin/analytics/acquisition.ts` | Acquisition: visitors, referrers, UTM, landing pages, device/browser, geo |
| `apps/app/src/pages/api/admin/analytics/auth-funnel.ts` | Auth funnel: sign-ins/sign-ups by day, funnel, OAuth vs email, TTFKA |
| `apps/app/src/pages/api/admin/analytics/engagement.ts` | Engagement: DAU/WAU/MAU, stickiness, sessions, feature adoption, power-user distribution |
| `apps/app/src/pages/api/admin/analytics/retention-cohorts.ts` | Retention cohorts: weekly/daily matrix from Firebase Auth + Firestore user_activity_logs; supports `activeDefinition` (session \| workout). See [RETENTION_COHORTS_ROLLUPS.md](./RETENTION_COHORTS_ROLLUPS.md) for optional rollup design. |
| `apps/app/src/pages/api/admin/analytics/monetization-candidates.ts` | Monetization candidates: high-intent Firebase UIDs for outreach lookup. See [MONETIZATION_CANDIDATES.md](./MONETIZATION_CANDIDATES.md). |
| `apps/app/src/pages/api/admin/analytics/monetization.ts` | Monetization: paid by plan, trial conversion, TTFC, MRR/ARPU/LTV |
| `apps/app/src/pages/api/admin/analytics/quality.ts` | Quality: frontend errors by page, top errors, time series |

---

## 3. Server-side lib (Supabase admin analytics)

| File | Purpose |
|------|--------|
| `apps/app/src/lib/supabase/admin/analytics-overview.ts` | Overview from `analytics_funnel_events` |
| `apps/app/src/lib/supabase/admin/analytics-acquisition.ts` | Acquisition from `web_events` + RPC `get_acquisition_stats`; uses `ua-parser-js` |
| `apps/app/src/lib/supabase/admin/analytics-auth-funnel.ts` | Auth funnel: Auth admin API + `analytics_funnel_events` + `web_events` |
| `apps/app/src/lib/supabase/admin/analytics-engagement.ts` | Engagement from `analytics_funnel_events` and `web_events` |
| `apps/app/src/lib/supabase/admin/analytics-monetization.ts` | Monetization from `profiles` (purchased_index, trial_ends_at) and `user_programs` |
| `apps/app/src/lib/supabase/admin/analytics-quality.ts` | Quality from `errors_frontend` |

**Dependencies of these lib files (must exist in target project):**

- `apps/app/src/lib/supabase/server.ts` — `getSupabaseServer()`
- `apps/app/src/lib/supabase/admin/auth.ts` — `verifyAdminRequest()` (used by all 8 API routes)

**Firebase (Retention & cohorts, Monetization candidates):**

| File | Purpose |
|------|---------|
| `apps/app/src/lib/firebase/admin.ts` | Firebase Admin init; `getFirebaseAuth()`, `getFirebaseFirestore()` |
| `apps/app/src/lib/firebase/retention-cohorts.ts` | Retention cohort matrix from Auth + Firestore `user_activity_logs` |
| `apps/app/src/lib/firebase/monetization-candidates.ts` | Monetization candidates: high-intent UIDs from activity + Auth |
| `apps/app/src/lib/firebase/engagement-hub.ts` | Engagement DAU/WAU/MAU/stickiness and feature adoption from `user_activity_logs` when Firebase configured; merged in `engagement` API. See [ENGAGEMENT_FEATURE_ADOPTION.md](./ENGAGEMENT_FEATURE_ADOPTION.md). |
| `apps/app/src/lib/firebase/ttfka-hub.ts` | TTFKA (time to first key action) from Auth creation + Firestore `user_activity_logs` when Firebase configured; merged in `auth-funnel` API. See [TTFKA_DATA_STREAMS.md](./TTFKA_DATA_STREAMS.md). |
| `apps/app/docs/FIRESTORE_INDEXES_RETENTION.md` | Firestore index docs; Console link for deployers |

---

## 4. Supabase migrations (root and app)

Run these in the **target** project’s Supabase (e.g. the project at `PUBLIC_SUPABASE_URL`) in **order**. All use `public` schema; no project-specific URLs in the SQL.

| File | Purpose |
|------|--------|
| `supabase/migrations/20260317000000_analytics_funnel_events.sql` | Table `public.analytics_funnel_events` (event_name, user_id, timestamp, etc.) + RLS; use this when `analytics_events` already exists from 20260118 custom schema. |
| `supabase/migrations/20250317000000_web_events.sql` | Table `public.web_events` (page_view, path, referrer, UTM, user_agent, etc.) |
| `supabase/migrations/20250317000001_acquisition_stats_rpc.sql` | RPC `public.get_acquisition_stats(p_days)` for acquisition aggregation |
| `supabase/migrations/20250318000000_errors_frontend.sql` | Table `public.errors_frontend` (for quality tab) |
| `supabase/migrations/20250318000001_web_events_errors_frontend_rls_tighten.sql` | RLS: same user_id rules for `web_events` and `errors_frontend` |

**Note:** If the target DB has no existing `analytics_events` table, you can instead run `20250314000000_analytics_events.sql` and `20250314000002_analytics_events_rls_tighten.sql`, then use table name `analytics_events` in code. This repo uses **Option B**: table `analytics_funnel_events` so it coexists with the existing `analytics_events` (20260118 custom schema). **Do not run** `supabase/migrations/20260118091500_create_custom_analytics_schema.sql` for this Analytics tab — that migration defines a different schema (analytics_visitors, analytics_sessions, and a different `analytics_events` shape) used by another part of the repo.

**Schema the target project must already have (or add):**

- **profiles**: columns used by monetization: `purchased_index`, `trial_ends_at` (and any existing profile columns).
- **user_programs**: table used by monetization (e.g. `user_id`, `purchased_at`, `source`).

If the target project uses app-level migrations under `apps/app/supabase/migrations/`, you may have equivalent profiles/user_programs migrations there; ensure those columns/tables exist.

---

## 5. Acquisition data pipeline (optional but recommended)

To populate **Acquisition** and parts of **Engagement**, the target app needs page-view ingestion and (optionally) the shared analytics package.

| File | Purpose |
|------|--------|
| `apps/app/src/pages/api/analytics/page-view.ts` | Public POST endpoint that inserts into `web_events` |
| `packages/analytics/src/track.ts` | `trackPageView()` client helper (and `trackEvent` for funnel) |
| `packages/analytics/src/session.ts` | `getOrCreateSessionId()` used by track |
| `packages/analytics/src/index.ts` | Package exports |
| `packages/analytics/package.json` | Analytics package manifest |

If the target repo already has an `@workout-generator/analytics` (or equivalent) package and a page-view API that writes to `web_events`, you can skip these and just ensure the schema matches.

---

## 6. Quality data pipeline (optional)

To populate the **Quality** section, frontend errors must be sent to `errors_frontend`.

| File | Purpose |
|------|--------|
| `apps/app/src/pages/api/log-frontend-error.ts` | Public POST that inserts into `errors_frontend` |
| `apps/app/src/lib/log-frontend-error.ts` | Client fire-and-forget logger |
| `apps/app/src/components/react/FrontendErrorMonitor.tsx` | Global error / unhandledrejection handlers |

If you don’t need the Quality tab, you can omit these; the Quality API and AnalyticsView already handle missing `errors_frontend` gracefully.

---

## 7. Dependencies and config

**npm (apps/app):**

- `recharts` — charts in AnalyticsView
- `ua-parser-js` — device/browser parsing in `analytics-acquisition.ts`
- `@workout-generator/analytics` (or local workspace package) — if using page-view and event tracking

**TypeScript:**

- `apps/app/src/env.d.ts` — ensure it includes the `ua-parser-js` module declaration (so `UAParser` type is available).

**Admin layout:**

- Admin must be mounted the same way (e.g. `apps/app/src/pages/admin/[...slug].astro` with `AdminDashboard` and `verifyAdminRequest`). The Analytics route is inside `AdminDashboard` under `path="analytics"`.

---

## 8. Optional: tests

| File | Purpose |
|------|--------|
| `apps/app/tests/lib/analytics-engagement-windowing.test.ts` | Unit tests for WAU/MAU date windowing logic |

---

## 9. Checklist summary

- [ ] Copy **AnalyticsView** and add **analytics** route + nav item in AdminDashboard and navigation.
- [ ] Copy all **8 API routes** under `pages/api/admin/analytics/` (includes retention-cohorts and monetization-candidates).
- [ ] Copy all **6 analytics lib files** under `lib/supabase/admin/analytics-*.ts`.
- [ ] Ensure **server.ts** and **admin/auth.ts** exist and are used by the analytics APIs.
- [ ] Apply or verify **Supabase migrations** (in order): 20260317 (analytics_funnel_events), 20250317 (web_events + get_acquisition_stats RPC), 20250318 (errors_frontend + RLS tighten); ensure profiles + user_programs exist for monetization.
- [ ] Add **recharts** and **ua-parser-js** to app dependencies; add **ua-parser-js** type declaration if needed.
- [ ] (Optional) Copy **page-view** API and **analytics** package for acquisition/engagement data.
- [ ] (Optional) Copy **log-frontend-error** API + **FrontendErrorMonitor** + **log-frontend-error.ts** for quality data.
- [ ] (Optional) Copy **analytics-engagement-windowing** test.

After migration, the Analytics tab will show Overview from `analytics_funnel_events`; Acquisition from `web_events` (and RPC); Auth funnel from Auth + `analytics_funnel_events` + `web_events`; Engagement from `analytics_funnel_events` + `web_events`; Monetization from `profiles` + `user_programs`; Quality from `errors_frontend` (or empty if not set up). The `@workout-generator/analytics` package writes funnel events to `analytics_funnel_events`.
