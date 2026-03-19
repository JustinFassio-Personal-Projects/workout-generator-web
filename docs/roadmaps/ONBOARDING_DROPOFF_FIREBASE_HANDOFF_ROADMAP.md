# Roadmap: Firebase Handoff in Onboarding Drop-off

**Goal:** Add a "Handoff" element to the admin Analytics Onboarding drop-off that accesses Firebase Auth data once accounts are created—so the dashboard reflects the true count of hub signups regardless of attribution (Option A).

**Date:** 2025-03-18  
**Status:** Phases 1–3 done; Phase 4 local done, Vercel manual

---

## Executive Summary

| Current State | Target State |
|---------------|--------------|
| Onboarding drop-off "Account created" = `account_signup_complete` from Supabase `analytics_funnel_events` (Option A: hub POSTs event) | Add "Handoff" row = accounts created in **Firebase Auth** (hub's source of truth) |
| Conversion funnel signUp/emailConfirmed = Supabase Auth `listUsers` (returns 0—hub uses Firebase) | Supplement with Firebase Auth `listUsers` when configured |

The hub uses **Firebase Auth**; admin-dash-astro currently reads **Supabase Auth**. Adding Firebase Admin SDK to admin-dash-astro enables the monorepo to integrate both data sources in one dashboard.

---

## Current Architecture

```
┌─────────────────────────┐     Option A (track-event)     ┌─────────────────────────┐
│  aiworkoutgenerator-hub │ ─────────────────────────────► │  astro-site             │
│  (Firebase Auth)        │  account_signup_complete       │  /api/analytics/        │
│                         │  (only when wg_session_id)     │  track-event            │
│  - SignUpForm           │                                │                         │
│  - GoogleSignInButton   │                                └───────────┬─────────────┘
└─────────────────────────┘                                             │
         │                                                              │ insert
         │ User created in Firebase                                     ▼
         │ (source of truth)                                  ┌─────────────────────┐
         │                                                    │  Supabase           │
         │                                                    │  analytics_funnel_  │
         │                                                    │  events             │
         │                                                    └───────────┬─────────┘
         │                                                                │
         │                                                    admin-dash-astro reads
         │                                                    (auth-funnel, drop-off)
         ▼
  Firebase Auth
  (no admin read today)
```

**Gap:** Admin cannot see Firebase signups. Option A events only fire when users come from the builder with `wg_session_id`. Direct signups, pricing CTA, hero CTA, etc. never send `account_signup_complete`.

---

## Target Architecture

```
┌─────────────────────────┐                    ┌─────────────────────────┐
│  aiworkoutgenerator-hub │                    │  admin-dash-astro       │
│  (Firebase Auth)        │                    │                         │
│                         │  firebase-admin    │  - Supabase (events,    │
│  User created           │  listUsers()       │    web_events)          │
└───────────┬─────────────┘  ◄─────────────────┤  - Firebase Auth        │
            │                                   │    (optional, when env  │
            │                                   │    configured)          │
            │                                   └─────────────────────────┘
            │
            ▼
    Firebase Auth
    (source of truth for hub signups)
```

---

## Data Model

### Firebase Auth UserRecord (relevant fields)

| Field | Use |
|-------|-----|
| `uid` | Distinct user ID |
| `metadata.creationTime` | Sign-up date; for signUpsByDay, funnel range filter |
| `providerData[].providerId` | OAuth vs email (`google.com` vs `password`) |
| `emailVerified` | Email confirmed (for funnel.emailConfirmed) |

### Onboarding Drop-off: Two Sources

| Step | Source | Notes |
|------|--------|-------|
| Started, Step 1, Step 2, Preview, Create account | Supabase `analytics_funnel_events` | Session-based; unchanged |
| **Account created (attributed)** | Supabase `account_signup_complete` | Option A; builder → hub with wg_session_id |
| **Handoff: Accounts created (Firebase)** | Firebase Auth `listUsers` | All hub signups; source of truth |

---

## Phases

### Phase 1: Add Firebase Admin to admin-dash-astro

**Objective:** Enable admin-dash-astro to query Firebase Auth when configured.

#### 1.1 Dependencies

| Task | Details |
|------|---------|
| Add `firebase-admin` | `apps/admin-dash-astro/package.json`; use same major as hub (`^12.0.0`) |
| Optional dependency | Firebase is optional; admin works without it (graceful degradation) |

#### 1.2 Firebase Admin Library

| File | Purpose |
|------|---------|
| `apps/admin-dash-astro/src/lib/firebase/admin.ts` | Lazy-init Firebase Admin; export `getFirebaseAuth()`, `listUsersForDateRange(days)` |

**Implementation notes:**

- Use `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) or `GOOGLE_APPLICATION_CREDENTIALS`; same pattern as hub.
- Project ID from `FIREBASE_PROJECT_ID` or `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (if hub project).
- `listUsersForDateRange(days)`: paginate with `listUsers(maxResults, pageToken)`, filter by `metadata.creationTime` in range, return `{ users: UserRecord[], totalCount: number }` or aggregated `{ signUpsByDay, oauthCount, emailCount, emailVerifiedCount }`.
- Return `null` when Firebase is not configured (no env); callers handle gracefully.

#### 1.3 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes (for Firebase) | JSON string of hub project service account |
| `FIREBASE_PROJECT_ID` | Optional | Hub project ID; can be parsed from service account JSON |

**Docs:** Add to `apps/admin-dash-astro/.env.example` with comment: "Optional: For Handoff / signup counts from hub (Firebase Auth). Use hub project service account."

---

### Phase 2: Extend Auth Funnel with Firebase Data

**Objective:** Use Firebase signups to populate funnel and sign-ups-by-day when available.

#### 2.1 Auth Funnel Stats

| Task | Details |
|------|---------|
| Extend `getAuthFunnelStats` | When Firebase is configured, call `listUsersForDateRange` |
| Sign-ups by day | Use Firebase `metadata.creationTime`; override or merge with Supabase (currently 0 for hub) |
| funnel.signUp | Use Firebase total count in date range |
| funnel.emailConfirmed | Use Firebase users with `emailVerified === true` |
| oauthVsEmail | Use Firebase `providerData` to classify |

**Merge strategy:** Prefer Firebase when configured and non-empty; otherwise fall back to Supabase. If both exist (e.g. future multi-auth), document merge rules (e.g. sum, or Firebase-only for hub).

#### 2.2 API Route

- `apps/admin-dash-astro/src/pages/api/admin/analytics/auth-funnel.ts` — no change to route; it already calls `getAuthFunnelStats`. The lib change is sufficient.

---

### Phase 3: Add Handoff Row to Onboarding Drop-off

**Objective:** Surface Firebase signup count as a distinct "Handoff" element in the UI.

#### 3.1 Data Shape

Extend `AuthFunnelStats`:

```ts
interface AuthFunnelStats {
  // ... existing
  onboardingDropOff?: { step: string; completed: number; dropped: number }[];
  handoff?: {
    firebaseSignups: number;        // Total hub signups in range
    attributedSignups: number;      // account_signup_complete (Option A)
    signUpsByDay?: { date: string; count: number }[];
  } | null;
}
```

#### 3.2 Analytics Auth Funnel Lib

- When Firebase is configured: compute `handoff.firebaseSignups`, `handoff.attributedSignups`, `handoff.signUpsByDay`.
- `attributedSignups` = count of distinct `session_id` for `account_signup_complete` in `analytics_funnel_events`.

#### 3.3 AnalyticsView UI

Add a "Handoff: Website → Hub" section (or integrate into existing Onboarding drop-off):

```
Handoff: Website → Hub
├── Accounts created (Firebase): 6     ← from Firebase Auth
├── Attributed to builder: 0           ← from account_signup_complete
└── [Optional] Sign-ups by day chart   ← from Firebase
```

Place after "Onboarding drop-off" table. Use same styling (cards, table) as existing sections.

---

### Phase 4: Deployment and Configuration

**Objective:** Ensure admin-dash-astro can connect to hub's Firebase project in production.

#### 4.1 Secrets

| Environment | Variable | Source |
|-------------|----------|--------|
| Vercel (admin-dash-astro) | `FIREBASE_SERVICE_ACCOUNT_KEY` | Hub project service account JSON (from Firebase Console → Project Settings → Service Accounts) |
| Local | `.env.local` | Same; do not commit |

**Phase 4 completion:** Local dev uses `.env.local` (already configured). For production: add `FIREBASE_SERVICE_ACCOUNT_KEY` in the admin-dash-astro Vercel project → Settings → Environment Variables, then redeploy to enable the Handoff section.

**Production Handoff checklist:**

- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` set in admin-dash-astro Vercel project
- [ ] Redeploy after adding the variable
- [ ] Open Analytics → Auth & Onboarding and confirm "Handoff: Website → Hub" appears

#### 4.2 Shared Credentials

- Hub and admin-dash-astro use the **same** Firebase project (ai-workout-generator-hub).
- Service account must have "Firebase Authentication Admin" or equivalent to call `auth().listUsers()`.
- Default Firebase Console service accounts typically have this.

---

## Out of Scope

| Item | Reason |
|------|--------|
| Correlating Firebase UIDs to builder sessions | Would require hub to store `session_id → uid` mapping (e.g. in Firestore) on signup; adds complexity; future enhancement. See [FIREBASE_UID_BUILDER_SESSION_CORRELATION.md](./FIREBASE_UID_BUILDER_SESSION_CORRELATION.md) for planning. |
| Sync Firebase → Supabase | Alternative approach; would need Cloud Function + schema; more moving parts than direct admin read |
| Hub API for admin | Adds auth, rate limits, and another moving part; firebase-admin in admin is simpler |

---

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `apps/admin-dash-astro/src/lib/firebase/admin.ts` |
| Modify | `apps/admin-dash-astro/package.json` — add `firebase-admin` |
| Modify | `apps/admin-dash-astro/src/lib/supabase/admin/analytics-auth-funnel.ts` — integrate Firebase, add `handoff` |
| Modify | `apps/admin-dash-astro/src/components/react/admin/views/AnalyticsView.tsx` — render Handoff section |
| Modify | `apps/admin-dash-astro/.env.example` — document Firebase env vars |

---

## Dependencies

- Hub project: **ai-workout-generator-hub** (or equivalent Firebase project ID).
- Service account key: from Firebase Console, same project as hub.
- No changes to hub, astro-site, or Supabase schema.

---

## References

- Hub Firebase Admin: `apps/aiworkoutgenerator-hub/src/lib/firebase-admin.ts`
- Firebase Auth listUsers: [Admin SDK Auth listUsers](https://firebase.google.com/docs/auth/admin/manage-users#list_all_users)
- Auth funnel lib: `apps/admin-dash-astro/src/lib/supabase/admin/analytics-auth-funnel.ts`
- Analytics production analysis: `docs/analytics/ANALYTICS_PRODUCTION_ANALYSIS.md`
