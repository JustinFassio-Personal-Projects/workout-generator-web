# Production Troubleshooting — 401, 500, and /monitoring 403

**Date:** 2026-03-21  
**Context:** Post-migration; images work locally but not in production.

---

## Error Summary

| Error | Endpoint | Likely Cause | Fix |
|-------|----------|--------------|-----|
| **401 Unauthorized** | `POST /api/workouts/map-images` | Token verification fails (project mismatch or expired) | Verify project alignment (see below) |
| **500 Internal Server Error** | `POST /api/users/workout-counts` (or legacy `GET`) | Same as above, or Firestore/Admin init failure | Verify project alignment; check App Hosting logs |
| **500 Internal Server Error** | `POST /api/users/ensure` | Same as above | Same as above |
| **403 Forbidden** | `POST /monitoring` (Sentry tunnel) | Tunnel rewrite not supported or Sentry ingest rejecting | See Sentry section below |

---

## 1. Project Alignment (401 / 500 root cause)

The most common cause of **401 on map-images** and **500 on workout-counts / users/ensure** is a **Firebase project mismatch** after migration.

### Verification steps

1. **Client config** (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`):
   - Set from secret `firebase-project-id` in App Hosting.
   - This is the project used for Firebase Auth and client Firestore.

2. **Service account** (`FIREBASE_SERVICE_ACCOUNT_KEY`):
   - Set from secret `firebase-service-account-key`.
   - The JSON `project_id` inside the key **must match** `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

3. **Check project IDs:**
   ```bash
   # Client project (from apphosting / env)
   # NEXT_PUBLIC_FIREBASE_PROJECT_ID = ?

   # Service account project (from the JSON key)
   # FIREBASE_SERVICE_ACCOUNT_KEY -> parse JSON -> project_id = ?
   ```
   These two values must be identical. If the client uses a new project but the service account is for an old project, `verifyIdToken()` will fail with "Invalid or expired token" (or similar).

4. **App Hosting logs:** In Firebase Console → App Hosting → Logs, look for:
   - `[Image Mapping API] Token verification failed` with hint about project/audience mismatch.
   - `Firebase Admin not initialized` → missing or invalid `FIREBASE_SERVICE_ACCOUNT_KEY`.

### Fix

- Regenerate the service account key from the **same** Firebase project as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
- Update the `firebase-service-account-key` secret and redeploy.

---

## 2. Images not displaying (map-images 401)

When `POST /api/workouts/map-images` returns 401, the client falls back to the workout without images (graceful degradation). The root cause is almost always token verification failure.

**Checks:**

1. Project alignment (see above).
2. `firebase-service-account-key` secret exists and is valid JSON.
3. `requireAppCheck` — if `FIREBASE_APP_CHECK_ENABLED` is set, the client must send `X-Firebase-AppCheck`. The image mapping client uses `authenticatedFetch` which includes App Check when configured.

---

## 3. Sentry /monitoring 403

Sentry uses `tunnelRoute: "/monitoring"` to proxy events through your domain and avoid ad-blockers. A 403 on `POST /monitoring` can mean:

1. **Hosting platform:** Firebase App Hosting / Cloud Run may not support the Next.js rewrite that Sentry adds for the tunnel.
2. **Sentry ingest:** Invalid DSN or auth can cause Sentry to reject the forwarded request (403).
3. **Ad-blockers:** Some extensions block `/monitoring`; this is expected for a subset of users.

### Mitigations

- **Option A (recommended if 403 persists):** `apphosting.yaml` sets `SENTRY_DISABLE_TUNNEL=1` so builds disable the tunnel; events go directly to Sentry. Ad-blockers may block them for some users, but 403s on `/monitoring` stop. You can also set this manually in Firebase Console → App Hosting → [Backend] → Environment variables.
- **Option B:** Keep the tunnel and verify Sentry config (DSN, `SENTRY_AUTH_TOKEN` for builds, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL` for US org).
- **Option C:** Add Sentry to `ignoreErrors` for `/monitoring` 403 if it’s too noisy (Sentry still works for users without ad-blockers).

---

## 4. Authorization header stripped by proxy (401 on API routes)

**Symptom:** All auth-protected API routes return 401 in production; Firestore works; local dev works.

**Cause:** Firebase App Hosting (and some proxies) may strip the `Authorization` header when forwarding to Cloud Run. The backend receives the request without a token.

**Fix (implemented):**

1. **Headers:** `Authorization`, `X-ID-Token`, and `X-Firebase-ID-Token` (`extractBearerToken()` checks all).
2. **JSON body (last resort):** `authenticatedFetch` adds `_firebaseIdToken` to JSON bodies on non-GET requests. Routes use `resolveIdToken(request, parsedBody)` so the token still works if **all** auth headers are stripped.
3. **Workout counts:** Client uses **`POST /api/users/workout-counts`** with `{ tier }` so the token can ride in the body (GET has no body).

| Caller | Endpoint |
|--------|----------|
| `ImageMappingService.client` | `POST /api/workouts/map-images` |
| `user-service.ensureUserDocument` | `POST /api/users/ensure` |
| `useSubscription.refreshWorkoutCount` | `POST /api/users/workout-counts` (`GET` still supported) |

---

## 5. /onboarding/continue crash

**Symptom:** The `/onboarding/continue` page crashes (ErrorBoundary or white screen) in production.

**Common causes:** The same auth/proxy issues that affect other API routes. When `ensure` and `workout-counts` return 500, and the Sentry tunnel returns 403, the app can hit cascading failures. The ErrorBoundary now catches Sentry capture failures so they don't cause a secondary crash.

**Fix:** Deploy the troubleshooting branch (or main with the auth fixes):

1. **SENTRY_DISABLE_TUNNEL=1** in `apphosting.yaml` (already present) so `/monitoring` 403s stop.
2. **Body token fallback** (`_firebaseIdToken` in JSON bodies) so `ensure`, `workout-counts`, and `map-images` work when headers are stripped.
3. **ErrorBoundary** wraps `Sentry.captureException` in try/catch so Sentry transport failures don't crash the app.

After deploying, trigger a fresh build so the new code and env vars take effect.

---

## 6. Quick verification checklist

- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and service account `project_id` match
- [ ] `firebase-service-account-key` secret exists and is valid
- [ ] App Hosting logs show no "Token verification failed" or "Admin not initialized"
- [ ] Images load in production after project alignment
- [ ] Sentry /monitoring 403: consider removing tunnel or adjusting Sentry config
