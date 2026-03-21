# Production Auth Errors — Audit Report

**Date:** 2026-03-21  
**Context:** Post-monorepo migration; errors at https://app.aiworkoutgenerator.com  
**Plan:** `.cursor/plans/production_auth_errors_audit_*.plan.md`

---

## Executive Summary

This audit was executed to identify root causes of four production error types. **Phase 1 and Phase 5b have been run** (project IDs match; secrets exist). Implemented fixes: pass explicit `user` to `authenticatedFetch` in ImageMappingService.client to avoid auth timing mismatches; add `SENTRY_DISABLE_TUNNEL` to mitigate /monitoring 403.

---

## Error Taxonomy (Verified)

| Error | Endpoint | Client Caller |
|-------|----------|---------------|
| 403 Forbidden | POST /monitoring | Sentry SDK (tunnel) |
| 500 Internal Server Error | POST /api/users/ensure | AuthProvider on sign-in |
| 500 Internal Server Error | GET /api/users/workout-counts?tier=free | useSubscription.refreshWorkoutCount |
| 401 Unauthorized | POST /api/workouts/map-images | ImageMappingService.client |

---

## Phase 1: Firebase Project Alignment

### Verified (Code/Config)

- **.firebaserc:** Project `ai-workout-generator-hub` (default)
- **apphosting.yaml:** `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ← secret `firebase-project-id`
- **apphosting.yaml:** `FIREBASE_SERVICE_ACCOUNT_KEY` ← secret `firebase-service-account-key`
- **firebase-admin.ts:** Admin SDK uses `process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID` for `projectId` when initializing with service account
- **map-images/route.ts:** `getProductionDb()` uses `NEXT_PUBLIC_FIREBASE_PROJECT_ID` or `serviceAccount.projectId`

### Phase 1 Results (Run 2026-03-21)

- **Client project ID:** `ai-workout-generator-hub`
- **Service account project_id:** `ai-workout-generator-hub`
- **Compare:** MATCH — project IDs align. **Project mismatch ruled out** as root cause.

**Script:** Run one of:
- From repo root: `bash apps/aiworkoutgenerator-hub/scripts/audit-production-auth.sh`
- From `apps/aiworkoutgenerator-hub`: `bash scripts/audit-production-auth.sh`

---

## Phase 2: Server-Side Logs

### Where to Look

Firebase Console → App Hosting → [Backend] → Logs

### Search Terms

| Log text | Indicates |
|----------|-----------|
| `[Image Mapping API] Token verification failed` | 401 map-images: token/project mismatch |
| `Firebase Admin not initialized` / `Invalid FIREBASE_SERVICE_ACCOUNT_KEY` | 500: Admin init failed |
| `FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required` | 500 map-images: missing secret |
| `FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON` | 500: malformed secret |
| `verifyIdToken` / `auth/argument-error` | Token audience/project mismatch |

### Status

- [ ] Manual: Inspect App Hosting logs and document findings

---

## Phase 3: App Check

### Verified

- **apphosting.yaml:** `FIREBASE_APP_CHECK_ENABLED` is **NOT** defined — App Check is not configured for production
- **.env.example:** `FIREBASE_APP_CHECK_ENABLED` is commented out
- **app-check.ts:** When unset, `requireAppCheck()` returns `{ ok: true }` (no-op)

### Conclusion

**App Check is ruled out** as a cause of 401. It would need to be set via some other mechanism (not apphosting.yaml) to affect production; current config does not enable it.

---

## Phase 4: Sentry /monitoring 403

### Verified

- **next.config.ts:** `tunnelRoute: "/monitoring"`
- **apphosting.yaml:** Sentry secrets: `sentry-dsn`, `sentry-auth-token`, `sentry-org`, `sentry-project`, `sentry-url`
- **SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_URL:** `availability: BUILD` only
- **NEXT_PUBLIC_SENTRY_DSN:** Runtime (for client)

### Possible Causes

1. Firebase App Hosting / Cloud Run may not support Next.js rewrites for `/monitoring`
2. Invalid DSN or Sentry org/project mismatch
3. Ad-blockers blocking `/monitoring` (expected for subset of users)

### Mitigation Implemented

- **next.config.ts:** `tunnelRoute` is now conditional: set `SENTRY_DISABLE_TUNNEL=1` in App Hosting to disable the tunnel and stop 403s. Events will go directly to Sentry (ad-blockers may block for some users). See [PRODUCTION_TROUBLESHOOTING.md](./PRODUCTION_TROUBLESHOOTING.md).

---

## Phase 5: Migration-Specific Checks

### Verified

- **apphosting.yaml:** All 25 env vars with secrets defined
- **grant-apphosting-secrets-access.sh:** Lists 25 secrets (matches apphosting.yaml)
- **FIREBASE_SERVICE_ACCOUNT_KEY:** No `availability` restriction → available at runtime

### Phase 5 Results (Run 2026-03-21)

- **Backends:** `workout-generator-web` (us-east4) has `rootDirectory: "apps/aiworkoutgenerator-hub"` ✓
- **Secrets:** All required secrets exist (firebase-project-id, firebase-service-account-key, etc.) ✓

---

## Ruled-Out Hypotheses

| Hypothesis | Reason |
|------------|--------|
| App Check causing 401 | `FIREBASE_APP_CHECK_ENABLED` not in apphosting.yaml; defaults to disabled |
| Project ID mismatch | Phase 1 confirmed both values are `ai-workout-generator-hub` |

---

## Implemented Fixes

1. **ImageMappingService.client:** `mapWorkoutImages` and `mapWorkoutImagesBatch` now accept optional `user` and pass it to `authenticatedFetch` to avoid auth.currentUser timing mismatches that can cause 401 on map-images.
2. **Callers updated:** `useTrainerWorkout`, `useWorkoutHistory`, `useRecentWorkouts` now pass the current user when mapping images.
3. **Sentry /monitoring 403:** Added `SENTRY_DISABLE_TUNNEL=1` env override to disable the tunnel if 403 persists. Set in App Hosting → Environment variables.

---

## Remaining Unknowns

1. **Server logs:** Inspect App Hosting logs for exact failure points if 401/500 persist after deploy.
2. **Root cause of 401/500:** With project IDs matching, if errors continue after the user-passing fix, check logs for token verification or Firestore/Admin init failures.

---

## Recommended Next Steps

1. Deploy the implemented fixes and verify 401/500 on ensure, workout-counts, and map-images resolve.
2. If Sentry /monitoring 403 continues: set `SENTRY_DISABLE_TUNNEL=1` in App Hosting env and redeploy.
3. If 401/500 persist: review App Hosting logs for the Phase 2 search terms.

---

**See also:** [PRODUCTION_TROUBLESHOOTING.md](./PRODUCTION_TROUBLESHOOTING.md) for existing hypotheses and mitigation options.
