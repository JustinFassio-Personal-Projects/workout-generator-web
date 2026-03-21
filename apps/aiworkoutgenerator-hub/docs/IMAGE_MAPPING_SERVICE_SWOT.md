# Image Mapping Service — SWOT Analysis

**Scope:** Image mapping from `master_exercise_images` to workout exercises  
**Date:** 2026-03-21  
**Context:** Post-migration to new backend; review of `ImageMappingService.ts`, `ImageMappingService.client.ts`, `image-mapping-admin.ts` and dependencies

---

## Strengths

| Area | Finding |
|------|---------|
| **Consistent normalization** | All paths use `trimExerciseName()` from `image-generation-config.ts` as single source of truth. Avoids drift between client, API, and admin paths. |
| **Multiple access patterns** | Supports (1) client Firestore direct, (2) API-based enrichment, (3) server-side admin. Flexibility for different contexts (workout player vs history list vs batch sync). |
| **Graceful degradation** | `ImageMappingService.client.ts` falls back to original workout on API failure. `mapWorkoutImagesBatch` uses `Promise.allSettled`; partial failures don't block other workouts. |
| **Request deduplication** | Both client and admin: in-flight request tracking prevents duplicate queries for the same exercise/workout during concurrent calls. |
| **Admin caching** | 5-minute TTL in-memory cache in `image-mapping-admin.ts` reduces Firestore reads for repeated exercise lookups (batch operations). |
| **Retry logic** | Admin path has exponential backoff for transient errors (network, timeout, ECONNRESET). |
| **User preference layer** | `ImageMappingService.getImageForExercise()` and `useExerciseImage` check `user_exercise_image_preferences` before falling back to master images. |
| **Production DB isolation** | `/api/workouts/map-images` uses dedicated `getProductionDb()` with named app; explicitly targets production even when emulators are configured. |
| **Auth and security** | API routes require Bearer token + App Check. Firestore rules restrict `master_exercise_images` read to authenticated users; write to admins only. |
| **In-memory sorting** | Avoids composite Firestore index by sorting by `position` in memory after query; consistent across all three implementations. |

---

## Weaknesses

| Area | Finding | Impact |
|------|---------|--------|
| **Dual database configuration** | `/api/workouts/map-images` uses `getProductionDb()` (separate Admin app); `/api/users/workouts` and `/api/users/workouts/[workoutId]` use `adminDb` (default Admin app). Different initialization paths may point to different projects or configs. | Risk of inconsistent behavior or wrong-project queries after migration. |
| **Client Firestore dependency on same project** | `ExerciseCardPlayer` calls `getExerciseImagesByPosition()` from `ImageMappingService.ts`, which uses `getDbInstance()` (client Firestore). `master_exercise_images` must live in the **same** project as `NEXT_PUBLIC_FIREBASE_*`. | If `master_exercise_images` is in a different project post-migration, client path will fail (no images in workout player). |
| **mapImagesToWorkoutObject omits userId** | `mapImagesToWorkoutObject` / `mapImagesToWorkoutObjectWithDb` do not accept `userId`; they never check user preferences. API-enriched workouts (e.g., `/api/users/workouts`) always get default master image, never user-selected overrides. | User preferences are only honored when client fetches via `useExerciseImage`; API-returned workouts ignore them. |
| **ImageMappingService.ts not used for primary flow** | `mapImagesToWorkout` and `getImageForExercise` in `ImageMappingService.ts` are exported but `mapWorkoutImages` (client API) is the primary flow for workout enrichment. `mapImagesToWorkout` is only used by `updateWorkoutWithImages` (batch sync). `getExerciseImagesByPosition` is used by `ExerciseCardPlayer` only. | Two parallel code paths with different DB sources; complexity and potential drift. |
| **Mutation in place** | `mapImagesToWorkoutObject` and `mapImagesToWorkoutObjectWithDb` mutate the workout object. Callers must clone before calling; documentation warns but no runtime guard. | Easy to introduce bugs if caller forgets to clone. |
| **adminDb API shape** | `adminDb` is a wrapper object (`{ collection, doc, batch, runTransaction }`), not raw Firestore. `image-mapping-admin.ts` uses `db.collection().where().get()`; compatible but diverges from native Admin SDK usage elsewhere. | Minor; works but adds indirection. |
| **No explicit index for master_exercise_images query** | Query uses `exercise_name` + `status`; `firestore.indexes.json` has a composite index for `master_exercise_images` but it may be for a different query pattern. | Could cause index warnings or slower queries at scale. |

---

## Opportunities

| Area | Suggestion |
|------|------------|
| **Unify DB selection** | Introduce a single `getMasterImagesDb()` used by all API routes that need `master_exercise_images`. Reduces divergence between `getProductionDb()` and `adminDb`. |
| **Pass userId into API mapping** | Extend `mapImagesToWorkoutObjectWithDb` to accept optional `userId`; when present, query `user_exercise_image_preferences` (via Admin SDK) before master lookup. Aligns API-enriched workouts with client behavior. |
| **Create API for getExerciseImagesByPosition** | Add `/api/exercises/images-by-position` (or similar) so `ExerciseCardPlayer` can use API path instead of direct Firestore. Enables `master_exercise_images` to live in a separate project without client Firestore access. |
| **Add integration tests** | Exercise mapping is used across client, API, and admin. Add tests that cover: (a) API returns mapped images, (b) user preference overrides master when passed, (c) graceful fallback on API failure. |
| **Document DB topology** | Add a short doc (or section in FIREBASE_CONFIG_SWOT) describing which collections live in which project(s), and which code paths use which DB. Critical for post-migration debugging. |
| **Consider CDN or edge cache** | For frequently requested exercises, cached image URLs at edge could reduce Firestore reads. Evaluate if latency or cost justifies. |
| **Structured logging** | Add correlation IDs or request context to mapping logs (e.g., workout ID, user ID, success/error counts) for easier production debugging. |

---

## Threats

| Area | Risk | Mitigation |
|------|------|------------|
| **Project split post-migration** | User data (trainer_workouts, user_exercise_image_preferences) moved to new project; `master_exercise_images` stayed in old project. Client Firestore points to new project → `getExerciseImagesByPosition` finds nothing. | Ensure `master_exercise_images` lives in the same project as client config, or migrate `ExerciseCardPlayer` to use an API instead of direct Firestore. |
| **FIREBASE_SERVICE_ACCOUNT_KEY missing** | Doc notes this secret was historically missing in production, causing 500s on `/api/workouts/map-images`. | Verify secret `firebase-service-account-key` exists and maps to `FIREBASE_SERVICE_ACCOUNT_KEY` in App Hosting; confirm service account has Firestore read. |
| **Service account project mismatch** | `FIREBASE_SERVICE_ACCOUNT_KEY` may point to new project while `master_exercise_images` remains in old project (or vice versa). | Validate that the service account's project matches where `master_exercise_images` actually lives. |
| **Cache stampede** | Admin cache is in-memory per instance. Under load, many instances may miss cache and hit Firestore simultaneously. | Consider Redis or similar shared cache for multi-instance deployments; or accept current design for moderate load. |
| **Rate limiting** | Batch operations (e.g., workout history with many exercises) trigger many Firestore reads. Could hit quotas or trigger rate limits. | Existing batching in `/api/users/workouts` (BATCH_SIZE=5) helps; monitor read usage and consider further batching or caching. |
| **Exercise name drift** | `trimExerciseName` is minimal (trim only). If AI-generated exercise names diverge from `master_exercise_images` (e.g., extra words, synonyms), matches fail. | Consider fuzzy matching or alias table for common variations; document naming conventions for admin-curated images. |

---

## Code Path Summary

| Caller | Function | DB Source | Notes |
|--------|----------|-----------|-------|
| `useTrainerWorkout` | `mapWorkoutImages` | API → `getProductionDb()` | Workout player enrichment |
| `useWorkoutHistory` | `mapWorkoutImagesBatch` | API → `getProductionDb()` | History list enrichment |
| `ExerciseCardPlayer` | `getExerciseImagesByPosition` | Client Firestore (`getDbInstance`) | Position-based carousel; **same project required** |
| `useExerciseImage` | `getUserImagePreference` | Client Firestore | User preference override |
| `GET /api/users/workouts` | `mapImagesToWorkoutObject` | `adminDb` | Server-side enrichment; no user prefs |
| `GET /api/users/workouts/[id]` | `mapImagesToWorkoutObject` | `adminDb` | Same as above |
| `POST /api/workouts/map-images` | `mapImagesToWorkoutObjectWithDb` | `getProductionDb()` | Dedicated production DB |
| `ImageMappingService.updateWorkoutWithImages` | `mapImagesToWorkout` | Client Firestore | **Client-only**; exports exist but production batch sync uses `/api/admin/sync-exercise-images` (Admin SDK) instead |

---

## Checklist: Post-Migration Verification

| Item | Status | Notes |
|------|--------|-------|
| `master_exercise_images` lives in project matching `NEXT_PUBLIC_FIREBASE_*` | ⬜ | Required for `ExerciseCardPlayer` and `getExerciseImagesByPosition` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` (secret: `firebase-service-account-key`) set in App Hosting | ⬜ | Required for `/api/workouts/map-images` |
| Service account project matches `master_exercise_images` location | ⬜ | Required for correct queries |
| `adminDb` and `getProductionDb()` resolve to same project when both used | ⬜ | Ensures consistent behavior across API routes |
| User preferences honored in API-enriched workouts (if desired) | ⬜ | Current design: only client path honors them |

---

---

## Changelog

### 2026-03-21 — Production Readiness Improvements

| Change | File | Description |
|--------|------|-------------|
| **Authenticated fetch utility** | `src/lib/authenticated-fetch.ts` | New shared utility: Bearer token + App Check headers, automatic retry on 401 with token refresh. |
| **Client upgrade** | `ImageMappingService.client.ts` | Uses `authenticatedFetch`; graceful handling of auth errors (warn vs error); returns workout silently when unauthenticated. |
| **API diagnostics** | `map-images/route.ts` | Logs token verification failures with hint when project/audience mismatch detected. |
| **Token refresh** | Client | Expired tokens now trigger one retry with `getIdToken(true)` before failing. |

### Troubleshooting 401 "Invalid or expired token"

1. **Project mismatch**: Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` (service account `project_id`) matches `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Tokens from client Auth are verified by Admin SDK; they must be for the same Firebase project.
2. **Expired token**: The client now retries once with a fresh token. If 401 persists, check auth state (user may have signed out elsewhere).
3. **App Check**: When `FIREBASE_APP_CHECK_ENABLED=true`, ensure client attaches `X-Firebase-AppCheck` header via `getAppCheckHeaders()`. The image mapping client now includes this.

---

*Generated from review of ImageMappingService.ts, ImageMappingService.client.ts, image-mapping-admin.ts, API routes, and Firestore configuration.*
