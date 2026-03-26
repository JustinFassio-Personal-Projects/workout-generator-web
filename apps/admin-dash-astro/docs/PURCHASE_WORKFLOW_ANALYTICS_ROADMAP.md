# Purchase workflow analytics — implementation roadmap

**Product name (admin UI):** **Monetization drop-off** — same table pattern as **Onboarding drop-off** (Step / Completed / Dropped), placed between **Monetization candidates** and **Monetization** in `AnalyticsView.tsx`.

This document plans a **production-ready** purchase funnel for the **AI Workout Generator Hub** (Next.js + Firebase + Stripe) and its visualization in **admin-dash-astro**.

**Server ingest:** Hub Stripe webhook posts `purchase_subscription_activated` to `astro-site` [`/api/analytics/track-event-internal`](../../../astro-site/src/pages/api/analytics/track-event-internal.ts) with header `Authorization: Bearer <ANALYTICS_FUNNEL_SERVER_SECRET>` (set the same secret in hub and marketing `.env`).

It is written after codebase review (March 2025). Adjust dates, owners, and event names to match your release process.

---

## 1. Goals

- Measure **how often** users open paywall surfaces (upgrade modal, full pricing modal) and **where they drop off** before, during, and after Stripe Checkout.
- Present a **drop-off table** (and optional chart) **analogous to Onboarding drop-off** in the Auth & onboarding section: per step, **completed** (distinct flows) and **dropped** (difference from previous step).
- Keep **one analytics store** the admin already queries today: **`analytics_funnel_events`** (Supabase), unless you explicitly choose a parallel PostHog-only funnel.

Non-goals for v1:

- Replacing **Monetization** KPIs (those rows currently come from Supabase `profiles` / program-style fields; the **hub** bills via Stripe + Firebase — see §7).
- Real-time per-user replay in the admin UI (use PostHog or exports if needed later).

---

## 2. Current architecture (investigation summary)

### 2.1 Admin dashboard

- **`AnalyticsView.tsx`**: loads many sections via `/api/admin/analytics/*`. **Onboarding drop-off** is rendered when `authFunnel.onboardingDropOff` is present (table: Step / Completed / Dropped).
- **Onboarding logic** lives in `src/lib/supabase/admin/analytics-auth-funnel.ts`: fixed ordered `event_name` list, **distinct `session_id`** per step in `analytics_funnel_events`, then sequential `dropped = max(0, prev - completed)`.
- **Monetization candidates**: Firebase-backed (`/api/admin/analytics/monetization-candidates`), high-intent UIDs — **no** purchase funnel today.
- **Monetization (Phase 5)**: `getMonetizationStats` from `analytics-monetization.ts` — **Supabase `profiles`**, not hub Stripe.

### 2.2 Funnel event ingestion

- Table: **`analytics_funnel_events`** (`event_name`, `user_id` nullable UUID → `auth.users`, `session_id`, `timestamp`, `properties` jsonb, `app_id`). Migration: `supabase/migrations/20260317000000_analytics_funnel_events.sql`.
- **Marketing site** (`astro-site`): `POST /api/analytics/track-event` with a **whitelist** of `event_name` values; supports **CORS** from hub origins (`PUBLIC_ANALYTICS_CORS_ORIGIN` / defaults include `http://localhost:3000` and production app URL). **RLS**: anon insert requires `user_id IS NULL`.
- **Hub** already uses this pattern for signup attribution: `websiteAnalyticsSession.ts` → `account_signup_complete` with `session_id` + `user_id: null` (Firebase UID is **not** Supabase `auth.users`).

### 2.3 Hub purchase UX (instrumentation targets)

- **Upgrade flow**: `UpgradeModalProvider`, `UpgradeModal` (`showUpgradeModal(trigger)`), `PricingModal` (`showPricingModal()`), Stripe **`POST /api/stripe/checkout`**, redirect to Stripe, **`success_url`**: `.../dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`, **`cancel_url`**: `.../pricing?canceled=true`.
- **Stripe webhook** (`/api/webhooks/stripe`): updates Firestore + custom claims; **does not** currently write to `analytics_funnel_events`.

### 2.4 Other telemetry

- Hub has **PostHog** (`captureEvent`, `posthog-server`). Useful for product drill-down; **admin** charts today are **Supabase-first** for funnel tables.

---

## 3. Recommended correlation model (mirror onboarding)

Onboarding uses **anonymous `session_id`** to tie steps together. Hub users are **Firebase-authenticated**, but **Supabase `user_id` on the row cannot be Firebase UID** (column is UUID FK to Supabase Auth).

**Recommendation for v1:**

1. Introduce a client-generated **`purchase_flow_id`** (or reuse a single name: `paywall_flow_id`):

   - Create on **first paywall surface open** in a logical attempt (e.g. when `showUpgradeModal` / `showPricingModal` runs), store in **`sessionStorage`**, reuse until **success** (subscription active / success landing) or **TTL** (e.g. 24h) to avoid infinite reuse.

2. Send **`session_id: purchase_flow_id`** on every funnel row (same as builder session pattern). Keep **`user_id: null`** on insert to satisfy RLS, unless you later add a **service-role** writer (see §6).

3. Put **`firebase_uid`** (and optional **`trigger`**, **`modal`**, **`tier_target`**) in **`properties`** for debugging and future user-level joins — **admin UI should aggregate counts only**, not expose raw UIDs in the default table.

4. **Drop-off query** in admin: same pattern as onboarding — **distinct `session_id`** per `event_name` in the ordered list, date range filter on `timestamp`, optional **`app_id: 'hub'`** filter.

This keeps **one implementation pattern** (session-scoped funnel) and avoids FK issues.

---

## 4. Event taxonomy (draft)

Whitelist new names on **`astro-site`** `track-event` (and anywhere else that validates event names). Suggested **ordered** steps for the drop-off table:

| Order | `event_name` | When to fire (hub) |
|------:|----------------|--------------------|
| 1 | `purchase_paywall_opened` | First open of upgrade **or** pricing modal for a given `purchase_flow_id` (include `properties.modal`: `upgrade` \| `pricing`, `properties.trigger` if upgrade). |
| 2 | `purchase_cta_checkout_started` | User clicks primary checkout CTA (**Start free trial** / tier checkout) — before or after `fetch('/api/stripe/checkout')` succeeds (see §5). |
| 3 | `purchase_checkout_session_created` | After hub receives **200** from `/api/stripe/checkout` with a session URL (strong signal they can reach Stripe). |
| 4 | `purchase_stripe_redirect` | Immediately before `window.location.href = checkout url` (optional if redundant with step 3). |
| 5 | `purchase_return_success` | Client on **`/dashboard`** when `success=true` and `session_id` query present (and optionally verified). |
| 6 | `purchase_subscription_activated` | **Server**: Stripe webhook `checkout.session.completed` (or `customer.subscription.created`) — best “true conversion” step. |

**Cancel path:** optional `purchase_checkout_canceled` from `/pricing?canceled=true` or modal close events — usually analyzed separately (not in the main linear funnel) to avoid double-counting.

**Properties (examples):** `firebase_uid`, `modal`, `trigger`, `checkout_tier`, `stripe_checkout_session_id` (when known), `app_id: 'hub'`.

---

## 5. Hub implementation checklist

1. **`purchase_flow_id` helper** (new small module, e.g. `lib/purchase-funnel-analytics.ts`):

   - `getOrCreatePurchaseFlowId()`, `clearPurchaseFlowId()` on success or explicit abandon.

2. **Fire events from UI (prefer user actions, not `useEffect`)** — aligns with PostHog skill guidance:

   - `UpgradeModalProvider.showUpgradeModal` / `showPricingModal`: ensure flow id exists; POST `purchase_paywall_opened` once per flow per modal type (dedupe flags in sessionStorage if needed).
   - `UpgradeModal.handleUpgrade` / `PricingModal` checkout handlers: `purchase_cta_checkout_started` → on success response → `purchase_checkout_session_created` → `purchase_stripe_redirect`.
   - **Generate page** / other call sites that open modals on limit: they already call `showUpgradeModal`; no duplicate if provider handles it.

3. **Dashboard success page / layout**:

   - On load with `success=true`, fire `purchase_return_success` with `session_id` from query into `properties` or `session_id` column.

4. **Marketing site API**

   - Extend **`FUNNEL_EVENT_WHITELIST`** in `astro-site/src/pages/api/analytics/track-event.ts` with the new `event_name` values.
   - Confirm **CORS** includes all hub dev/prod origins.

5. **Shared client POST helper**

   - Mirror `trackAccountSignupComplete`: `POST` to `{NEXT_PUBLIC_MARKETING_SITE_URL}/api/analytics/track-event` with `session_id: purchase_flow_id`, `user_id: null`, `properties`, `app_id: 'hub'`. Fire-and-forget; swallow errors in production (optional dev warn).

6. **Stripe webhook (strongly recommended for step 6)**

   - In hub webhook handler, after successful subscription update, call Supabase **service role** insert into `analytics_funnel_events` **or** call an internal **signed** endpoint on astro-site that inserts — so conversion is recorded even if the user closes the tab before `/dashboard` loads.
   - Include `stripe_checkout_session_id` / `firebase_uid` in `properties`; correlate with the same `purchase_flow_id` only if you pass `flow_id` through **Stripe metadata** at checkout creation time (recommended: add `metadata.purchase_flow_id` in `checkout.sessions.create`).

---

## 6. Admin-dash-astro implementation checklist

1. **Query module** (new file, e.g. `src/lib/supabase/admin/analytics-purchase-funnel.ts`):

   - Input: `fromIso`, `toIso` (reuse patterns from `analytics-auth-funnel.ts`).
   - For each event in the ordered list, count **distinct `session_id`** where `event_name` matches, `timestamp` in range, and optionally `app_id = 'hub'` (or `properties->>'source' = 'hub'` if you prefer).
   - Build `purchaseWorkflowDropOff: { step: string; completed: number; dropped: number }[]` with human-readable `step` labels.

2. **API route** (e.g. `src/pages/api/admin/analytics/purchase-funnel.ts`):

   - `verifyAdminRequest`, `days` query param, return JSON.

3. **`AnalyticsView.tsx`**

   - Add state + `useEffect` fetch (same style as monetization / auth funnel).
   - Insert a new **card section** **between** “Monetization candidates” and “Monetization”:
     - Title: **Purchase workflow (Hub)** or **Paywall & checkout funnel**.
     - Short caption: data source = `analytics_funnel_events`, `session`-scoped flows, date range.
     - Table UI **reuse the same structure** as Onboarding drop-off (Step / Completed / Dropped).
   - Optional: horizontal bar or funnel chart (Recharts already imported in the file).

4. **Documentation**

   - Link from `MONETIZATION_CANDIDATES.md` or analytics README to this doc once live.

---

## 7. Data model caveat (Monetization section)

The existing **Monetization** block reflects **Supabase `profiles`** trial/paid fields. **Hub revenue** is **Stripe + Firebase**. Until those are unified in one warehouse:

- Treat **Purchase workflow** as **hub-centric funnel** metrics.
- Treat **Monetization** as **legacy / programs** metrics unless you migrate or dual-write.

Call this out in the UI subtitle to avoid misinterpretation.

---

## 8. Testing & validation

- **Staging**: run through modal → checkout (test mode) → success; verify rows in Supabase with correct `session_id` chain.
- **Webhook**: simulate `checkout.session.completed` with metadata; verify step 6 appears without relying on `/dashboard` load.
- **Admin**: compare counts to Stripe Dashboard conversion for a given week (sanity check, not exact match).
- **Load**: funnel queries are indexed on `(event_name, timestamp)`; add partial index on `(app_id, event_name, timestamp)` if `app_id` filter is always used and volume grows.

---

## 9. Phased delivery

| Phase | Scope |
|-------|--------|
| **P0** | `purchase_flow_id` + `track-event` whitelist + `purchase_paywall_opened` + `purchase_checkout_session_created` + admin table (steps 1–3 or 1–4). |
| **P1** | Stripe metadata `purchase_flow_id` + webhook `purchase_subscription_activated` + success/cancel landing events. |
| **P2** | Breakdown by `trigger` / tier; CSV export; optional PostHog mirror for session replay. |

---

## 10. Open decisions

- **Single POST path**: Only astro-site `track-event` vs new hub **server-side** insert with Supabase service role (fewer CORS concerns, more control).
- **Modal close / dismiss** tracking: product question (noise vs insight).
- **GDPR / retention**: retention policy for `analytics_funnel_events` rows with `firebase_uid` in `properties`.

---

## 11. File reference index

| Area | Files |
|------|--------|
| Onboarding funnel query | `admin-dash-astro/src/lib/supabase/admin/analytics-auth-funnel.ts` |
| Onboarding UI | `admin-dash-astro/src/components/react/admin/views/AnalyticsView.tsx` (Onboarding drop-off table) |
| Insert whitelist / CORS | `astro-site/src/pages/api/analytics/track-event.ts` |
| Hub signup cross-post | `aiworkoutgenerator-hub/src/lib/websiteAnalyticsSession.ts` |
| Upgrade / pricing UI | `aiworkoutgenerator-hub/src/components/upgrade/*`, `components/generate/PricingModal.tsx` |
| Checkout | `aiworkoutgenerator-hub/src/app/api/stripe/checkout/route.ts` |
| Webhook | `aiworkoutgenerator-hub/src/app/api/webhooks/stripe/route.ts` |
| Funnel table schema | `supabase/migrations/20260317000000_analytics_funnel_events.sql` |
