# Planning: Correlate Firebase UIDs with Builder Sessions

**Status:** Future enhancement  
**Depends on:** [ONBOARDING_DROPOFF_FIREBASE_HANDOFF_ROADMAP.md](./ONBOARDING_DROPOFF_FIREBASE_HANDOFF_ROADMAP.md) (Phase 1–3)

**Goal:** Persist a `session_id → uid` mapping so the admin can attribute Firebase signups to specific builder funnel sessions—enabling "of X who clicked Create account, Y completed signup" with accurate drop-off at each step.

---

## Current Limitation

| Data Source | What We Have | What We Lack |
|-------------|--------------|--------------|
| **Supabase** `analytics_funnel_events` | session_id for builder steps; session_id for `account_signup_complete` (Option A) | user_id is null; no link to Firebase UID |
| **Firebase Auth** | uid, creationTime, providerData | No session_id; no link to builder funnel |

**Gap:** We cannot join "this Firebase user" with "that builder session." Option A sends `account_signup_complete` with `session_id` only; we never store the Firebase `uid` in analytics.

---

## Target Outcome

- For each signup: know which builder `session_id` (if any) it came from.
- In admin: show drop-off as "Started N → … → Create account M → Account created K" where K = users who both (a) had a session that clicked Create account and (b) completed signup with that session.
- Optional: per-session "this session converted" vs "this session dropped."

---

## Design Options

### Option A: Hub Writes Mapping to Supabase

**Flow:**
1. User completes signup in hub (Firebase Auth creates user).
2. Hub has `wg_session_id` in localStorage (from URL).
3. Hub calls new endpoint (or extends track-event): send `{ session_id, user_id: firebase_uid }`.
4. astro-site or admin writes to a new table, e.g. `analytics_signup_attributions (session_id, user_id, created_at)`.

**Pros:** Single source of truth; admin reads from Supabase.  
**Cons:** Requires `user_id` in track-event (currently RLS allows anon only when `user_id IS NULL`); need RLS migration.

---

### Option B: Hub Writes Mapping to Firestore

**Flow:**
1. On signup, hub writes to Firestore: `signup_attributions/{session_id}` or `users/{uid}/signup_attribution` with `{ session_id, created_at }`.
2. admin-dash-astro uses Firebase Admin to query Firestore for attributions in date range.
3. Admin joins: Firebase users + Firestore attributions → session_ids that converted.

**Pros:** No Supabase schema changes; hub already has Firestore.  
**Cons:** Admin must query both Firebase Auth and Firestore; two data sources to maintain.

---

### Option C: Extend analytics_funnel_events

**Flow:**
1. Relax RLS: allow anon insert with `user_id` when `event_name = 'account_signup_complete'` and `session_id` is present (hub is trusted).
2. Hub sends `account_signup_complete` with both `session_id` and `user_id: firebase_uid`.
3. Admin queries `analytics_funnel_events` for `account_signup_complete` with non-null `user_id` to get attributed signups; existing session-based funnel logic can join.

**Pros:** Reuses existing table; minimal new infra.  
**Cons:** Mixes Firebase UIDs into Supabase; need RLS policy update; `user_id` column may be UUID-typed (Firebase UIDs are different format—need to verify schema).

---

### Option D: Sync Job (Firebase → Supabase)

**Flow:**
1. Cloud Function or cron: on `onUserCreated` (or periodic), fetch user; check Firestore/doc for `session_id` if hub stored it.
2. Write to Supabase `analytics_signup_attributions` or update `analytics_funnel_events`.
3. Admin reads from Supabase only.

**Pros:** Admin stays Supabase-only.  
**Cons:** Hub must persist session_id→uid somewhere for the job to read; extra async component.

---

## Recommended Path: Option C + Hub Change

**Rationale:** Reuse `analytics_funnel_events`; hub already POSTs to track-event. We only need to:
1. Allow `user_id` for `account_signup_complete` (RLS + validation).
2. Have hub send `user_id: firebase_uid` when calling `trackAccountSignupComplete`.
3. Ensure `analytics_funnel_events.user_id` accepts Firebase UID format (or add a separate `firebase_uid` column if needed).

---

## Prerequisites

| Item | Owner | Notes |
|------|-------|-------|
| `trackAccountSignupComplete` has access to Firebase UID | Hub | After signup, `user.uid` is available in SignUpForm and GoogleSignInButton |
| track-event API accepts `user_id` for account_signup_complete | astro-site | Extend whitelist/validation; update RLS |
| `analytics_funnel_events.user_id` type | Supabase | Firebase UIDs are ~28 chars; UUID is 36. May need `text` or new column |

---

## Tasks (High Level)

1. **Schema:** Confirm `user_id` column type; add migration if Firebase UIDs don't fit.
2. **RLS:** Policy to allow insert with `user_id` when `event_name = 'account_signup_complete'` and request is from trusted origin (or use a shared secret).
3. **track-event API:** Accept and validate `user_id` for `account_signup_complete` (length, charset).
4. **Hub:** Pass `user.uid` to `trackAccountSignupComplete`; extend function signature.
5. **Admin:** Update analytics-auth-funnel to use `user_id` for attributed count; optionally join with Firebase listUsers for validation.

---

## Out of Scope (This Document)

- Storing `session_id` in Firestore users doc (could support Option B/D).
- Attributing signups that arrived without `wg_session_id` (e.g. direct, pricing).

---

## References

- Hub: `src/lib/websiteAnalyticsSession.ts`, `SignUpForm.tsx`, `GoogleSignInButton.tsx`
- astro-site: `src/pages/api/analytics/track-event.ts`
- RLS: `supabase/migrations/20260317000000_analytics_funnel_events.sql`
- Roadmap: [ONBOARDING_DROPOFF_FIREBASE_HANDOFF_ROADMAP.md](./ONBOARDING_DROPOFF_FIREBASE_HANDOFF_ROADMAP.md)
