# Analytics: Why Production Traffic May Show as Zero

## Summary

If you see **0 unique visitors** but **11 events**, and only **localhost** in referrers/paths, production traffic is almost certainly **not** being written to the same Supabase project that the admin dashboard reads from. The 11 events and localhost rows are from local development or testing.

## How It Works

1. **Landing / page views**
   - **astro-site** loads; `PageViewTracker` (in `BaseLayout.astro`) runs on the client and POSTs to **same-origin** `/api/analytics/page-view` with `path`, `referrer`, `session_id`, UTM, etc.
   - That API (`astro-site/src/pages/api/analytics/page-view.ts`) uses `getSupabaseForAnalytics()` and inserts into **`web_events`** in the Supabase project defined by **astro-site’s** env vars.

2. **Funnel events**
   - WorkoutPlanBuilder (and other clients) POST to same-origin `/api/analytics/track-event`, which inserts into **`analytics_funnel_events`** using the same Supabase client.

3. **Admin dashboard**
   - **admin-dash-astro** reads from Supabase using **its own** env (`PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or `PUBLIC_SUPABASE_ANON_KEY`). It shows:
     - **Overview**: total events and distinct users from **`analytics_funnel_events`**
     - **Acquisition**: **`web_events`** via RPC `get_acquisition_stats` (unique visitors = distinct `coalesce(user_id::text, session_id)` per day; referrers, landing pages, etc.)
     - **Auth & onboarding**: sign-ups from Auth API + **`analytics_funnel_events`** (`account_signup_complete` / `account_login_complete`) + **`web_events`** for “Visit”

So for production traffic to appear:

- **Production astro-site** must have **the same** Supabase project configured as **admin-dash-astro** (same `PUBLIC_SUPABASE_URL` and, for writes, `PUBLIC_SUPABASE_ANON_KEY`).
- The page-view and track-event APIs must **succeed** (no 5xx or CORS blocking).

## Why You See Localhost Only

- The only rows in **`web_events`** and **`analytics_funnel_events`** that admin sees are from requests that **succeeded** against the Supabase project that admin uses.
- If **production astro-site** is missing `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, or they point to a **different** project:
  - Production page-view and track-event calls either **fail** (e.g. 500) or write to another DB.
  - So the only successful inserts are from **local** runs (e.g. `localhost:4321`) where astro-site’s env points to the same project as admin.

Result: **0 unique visitors** (no production page views in that project), **11 events** (funnel events from local testing), and **referrers/paths** all **localhost**.

## Auth Funnel: “Visit 1, Sign up 0”

- **Visit** = distinct `session_id` or `user_id` in **`web_events`** in the date range → that “1” is the local test session.
- **Sign up** / **Email confirmed** = from Supabase Auth `listUsers` and/or **`analytics_funnel_events`** (`account_signup_complete`). **With Option A implemented**, the hub now sends `account_signup_complete` when users complete signup after clicking Create account from the builder, so those signups appear in the onboarding drop-off. The main "Conversion funnel" (Visit → Sign up → Email confirmed) still uses Supabase Auth `listUsers`; if your app uses Firebase Auth, those counts remain separate. The “3 signups” in Firebase will show in the **Onboarding drop-off** "Account created" step once users complete the builder → signup flow.

## Checklist: Fix Production Tracking

1. **Same Supabase project**
   - In the host where **production astro-site** runs (e.g. Vercel):
     - Set **`PUBLIC_SUPABASE_URL`** and **`PUBLIC_SUPABASE_ANON_KEY`** to the **exact same** project that **admin-dash-astro** uses (the one that has `web_events` and `analytics_funnel_events`).
   - Redeploy astro-site so production requests use this env.

2. **Verify writes**
   - Open production site in a browser, navigate a few pages, complete a step in the builder.
   - In Supabase Dashboard → Table Editor for that project, check **`web_events`** and **`analytics_funnel_events`** for new rows with:
     - `path` / `referrer` containing your **production** domain (not localhost).
   - If no new rows appear, check:
     - Browser Network tab: do POSTs to `/api/analytics/page-view` and `/api/analytics/track-event` return **204**?
     - Server logs: any 500 or “PUBLIC_SUPABASE_URL required” from astro-site?

3. **Unique visitors**
   - `get_acquisition_stats` uses `visitor_key = coalesce(user_id::text, session_id)`. If **`session_id`** is null (e.g. client didn’t send it), that row does **not** count toward distinct visitors. The astro-site client sends `session_id` from `getOrCreateSessionId()` (localStorage); ensure production pages load that script and localStorage is available (no strict private mode that blocks it, if you rely on it).

4. **Sign-ups in funnel**
   - To see “Sign up” and “Email confirmed” in the Auth & onboarding funnel for **website → hub** flow, the hub must send **`account_signup_complete`** (and optionally `account_login_complete`) to the same pipeline, e.g. via the same Supabase project or the astro-site track-event API (see Option A implementation).

## Option A: Link signup to website session

Implemented so “Account created” appears in the onboarding drop-off:

1. **astro-site** appends `wg_session_id` (from `getOrCreateSessionId()`) to the signup URL when the user clicks “Create account” in the builder.
2. **Hub** signup page reads `wg_session_id` from the URL and stores it (e.g. in localStorage) with Phase A data.
3. **Hub** after successful email signup calls `trackAccountSignupComplete({ method: 'email' })`, which POSTs `account_signup_complete` to the marketing site’s `/api/analytics/track-event` with that `session_id`, then clears it.
4. **astro-site** track-event API allows `account_signup_complete` (and `account_login_complete`) and CORS from the hub origin so the hub can send the event.

Env:

- **astro-site**: `PUBLIC_ANALYTICS_CORS_ORIGIN` (optional, comma-separated) for allowed origins; default includes `https://app.aiworkoutgenerator.com` and `http://localhost:3000`.
- **Hub**: `NEXT_PUBLIC_MARKETING_SITE_URL` (optional) for the marketing site base URL used for the track-event POST; default `https://aiworkoutgenerator.com`. In local dev the hub uses `http://localhost:4321` when running on localhost.

## References

- astro-site: `src/lib/supabase/server.ts` (`getSupabaseForAnalytics`), `src/pages/api/analytics/page-view.ts`, `src/pages/api/analytics/track-event.ts`, `src/components/analytics/PageViewTracker.tsx`
- admin-dash-astro: `src/lib/supabase/admin/analytics-acquisition.ts`, `analytics-auth-funnel.ts`, `analytics-overview.ts`
- hub: `src/lib/websiteAnalyticsSession.ts`, `src/app/(auth)/signup/page.tsx`, `src/components/auth/SignUpForm.tsx`
- RPC: `get_acquisition_stats` in `supabase/migrations/20250317000001_acquisition_stats_rpc.sql` and `apps/admin-dash-astro/docs/RUN_ANALYTICS_SCHEMA_IN_APP_PROJECT.sql`
