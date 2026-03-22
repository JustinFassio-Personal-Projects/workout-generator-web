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

## 3. Sentry 403 (ingest /monitoring)

Sentry may return 403 when sending events (tunnel or direct to `ingest.us.sentry.io`). This does **not** block onboarding but adds console noise.

### Quick disable (hotfix for 403)

- **Option A:** In Firebase Console → App Hosting → [Backend] → Environment variables, set `NEXT_PUBLIC_DISABLE_SENTRY=1`. Redeploy. Client Sentry will not initialize; 403s stop.
- **Option B:** Unset or blank `NEXT_PUBLIC_SENTRY_DSN` (or remove the `sentry-dsn` secret mapping). Same effect—client won't init.

### Fix Sentry (proper)

- In Sentry project settings, allow `app.aiworkoutgenerator.com` in allowed domains / CORS.
- `apphosting.yaml` sets `SENTRY_DISABLE_TUNNEL=1` so events go directly to Sentry; if direct ingest returns 403, fix DSN / project settings in Sentry.

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

## 6. Pulling App Hosting / Cloud Run logs for 500s

When `POST /api/users/ensure`, `GET /api/waiver/active`, or `POST /api/users/workout-counts` returns 500, use these commands to capture the exact error (PERMISSION_DENIED, credential, etc.):

```bash
# Replace PROJECT_ID with your Firebase/GCP project ID
export PROJECT_ID="your-firebase-project-id"

# Last 1 hour, filter by ERROR severity and ensure route
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name=~".*" AND (textPayload=~"ensure" OR jsonPayload.message=~"ensure") AND severity>=ERROR' \
  --project=$PROJECT_ID --limit=50 --format=json

# Alternative: search for errorCode in structured logs (ensure route logs errorCode, errorMessage)
gcloud logging read 'resource.type="cloud_run_revision" AND jsonPayload.route="/api/users/ensure" AND severity>=ERROR' \
  --project=$PROJECT_ID --limit=20 --format="table(timestamp,jsonPayload.errorCode,jsonPayload.errorMessage)"

# Workout-counts route
gcloud logging read 'resource.type="cloud_run_revision" AND jsonPayload.route="/api/users/workout-counts" AND severity>=ERROR' \
  --project=$PROJECT_ID --limit=20 --format="table(timestamp,jsonPayload.errorCode,jsonPayload.errorMessage)"

# Waiver route (note: getActiveWaiver now returns null on Firestore error instead of 500)
gcloud logging read 'resource.type="cloud_run_revision" AND jsonPayload.route="/api/waiver/active" AND severity>=ERROR' \
  --project=$PROJECT_ID --limit=20 --format="table(timestamp,jsonPayload.errorCode,jsonPayload.errorMessage)"
```

**Note:** `GET /api/waiver/active` returns `200 { waiver: null }` when Firestore fails—but the waiver is required, so users cannot complete the flow until the waiver system works (fix IAM).

**Firebase App Hosting:** Logs are written by the underlying Cloud Run service. In Firebase Console → App Hosting → your backend → Logs, filter by severity ERROR or search for `ensure` / `workout-counts` / `errorCode` / `PERMISSION_DENIED`.

---

## 7. Waiver not loading after monorepo migration

If the waiver (or `/api/users/ensure`, `/api/waiver/active`) fails to load after moving from a standalone repo to the monorepo, common causes:

### 7a. Environment variables not loading (local dev)

When running from the monorepo root (e.g. `turbo run dev --filter=ai-workout-generator-hub`), `process.cwd()` may be the monorepo root. If `.env.local` was only at the old app root, it may not be found.

**Fix:** Ensure `.env.local` exists at **`apps/aiworkoutgenerator-hub/.env.local`** (the app directory, not the monorepo root). The app's `next.config.ts` loads env from the config file's directory. Copy or recreate `.env.local` in the app folder and include `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXT_PUBLIC_FIREBASE_*`, etc.

### 7b. App Hosting root directory

If App Hosting was connected to the standalone repo and is now pointed at the monorepo, **Root directory** must be set to **`apps/aiworkoutgenerator-hub`**. Otherwise the build uses the wrong `package.json` and secrets/env may not apply.

**Check:** Firebase Console → App Hosting → backend → Codebase/Settings → Root directory = `apps/aiworkoutgenerator-hub`.

### 7c. Secrets in Cloud Secret Manager

App Hosting injects secrets from `apphosting.yaml`. Verify the secret `firebase-service-account-key` exists and maps to `FIREBASE_SERVICE_ACCOUNT_KEY`:

```bash
gcloud secrets list --project=ai-workout-generator-hub | grep firebase-service-account
```

The waiver and user-ensure flows need Firestore access; the service account in that key must have `roles/datastore.user` (see §8 below).

---

## 8. Firestore IAM fix (500 with PERMISSION_DENIED)

When Cloud Run logs show `errorCode: "7"` or `PERMISSION_DENIED` for ensure/workout-counts, the service account lacks Firestore access.

### App Hosting / Next.js (ensure, workout-counts, map-images, waiver/active)

The Next.js app uses `FIREBASE_SERVICE_ACCOUNT_KEY` (firebase-admin). The **client_email** in that JSON is the identity that runs Firestore operations—it is typically `firebase-adminsdk-xxxxx@PROJECT_ID.iam.gserviceaccount.com`, not a user email like `justin@aiworkoutgen.app`. Grant the **client_email** Firestore access:

**Verify which identity is used:**
```bash
gcloud secrets versions access latest --secret=firebase-service-account-key --project=ai-workout-generator-hub | jq -r '.client_email'
```

Or run `bash apps/aiworkoutgenerator-hub/scripts/audit-production-auth.sh` to see project_id and client_email.

```bash
# 1. Get the service account email from your key (or Firebase Console → Project Settings → Service Accounts)
# It looks like: firebase-adminsdk-xxxxx@PROJECT_ID.iam.gserviceaccount.com

# 2. Grant Cloud Datastore User role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/datastore.user"

# Example:
# gcloud projects add-iam-policy-binding my-firebase-project \
#   --member="serviceAccount:firebase-adminsdk-abc12@my-firebase-project.iam.gserviceaccount.com" \
#   --role="roles/datastore.user"
```

### Cloud Functions (onUserCreated)

The Functions runtime uses the default App Engine service account (`PROJECT_ID@appspot.gserviceaccount.com`). If `onUserCreated` fails with PERMISSION_DENIED:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"
```

After applying, no redeploy is needed for IAM changes—they take effect within minutes.

---

## 9. Deploy verification (body token + resolveIdToken)

Confirm production includes the auth-transfer fixes:

1. **Code presence** (already in repo):
   - `authenticated-fetch.ts`: merges `_firebaseIdToken` into JSON bodies on non-GET
   - `ensure/route.ts`, `workout-counts/route.ts`: use `resolveIdToken(request, body)` and parse body before resolve
   - `user-service.ts`: `POST /api/users/ensure` with `body: JSON.stringify({})`
   - `useSubscription.ts`: `POST /api/users/workout-counts` with `body: JSON.stringify({ tier })`

2. **Network tab check** (production):
   - After sign-in, inspect `POST https://app.aiworkoutgenerator.com/api/users/ensure` → Request payload should include `_firebaseIdToken` (or auth headers if proxy forwards them)
   - On pages that call workout-counts: `POST /api/users/workout-counts` with JSON body `{ tier, _firebaseIdToken? }`
   - **500** with that shape = server-side (IAM, credential, Firestore), not missing client deploy

3. **Trigger a full rebuild** after any code or env change so Next.js output includes the latest routes.

---

## 10. Quick verification checklist

- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and service account `project_id` match
- [ ] `firebase-service-account-key` secret exists and is valid
- [ ] App Hosting logs show no "Token verification failed" or "Admin not initialized"
- [ ] Images load in production after project alignment
- [ ] Sentry /monitoring 403: consider removing tunnel or adjusting Sentry config
