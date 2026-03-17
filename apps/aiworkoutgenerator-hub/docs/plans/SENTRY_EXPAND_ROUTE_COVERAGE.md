# Expand Sentry Route Coverage

## Goal

Instrument the remaining API routes with `captureApiError` so all route-level errors are captured in Sentry with a consistent `endpoint` tag. Priority: the 6+ additional AI endpoints to close the largest gap. Implementation is copy-paste from existing instrumented routes.

## Current state

**Already instrumented (7 routes):**  
`stripe/checkout`, `stripe/portal`, `webhooks/stripe`, `workouts/generate`, `workouts/ai-exercise-swap`, `workouts/ai-exercise-edit`, `image/generate`.

**Pattern in those routes:**

1. `import { captureApiError } from "@/lib/sentry";` (or `, incrementMetric` if AI).
2. In the **main** (outer) `catch (error)` of the route handler: call `captureApiError(error, { endpoint: "snake_case_name", operation: "optional_op", userId?: uid, requestId?: id });` before or after the existing `logger.error(...)`.
3. For AI routes that count failures: also `incrementMetric("ai.failure", 1, { endpoint: "..." });` in the same catch.

## Routes to instrument (30 total)

Use a single `endpoint` value per route (snake_case). Target the **outer / main** catch that handles the full request; inner catches (e.g. rate-limit helpers) can be skipped unless they are the only catch.

### AI endpoints (9) — add captureApiError + incrementMetric("ai.failure", 1, { endpoint })

| Route                                                    | Endpoint tag               |
| -------------------------------------------------------- | -------------------------- |
| `src/app/api/workouts/coach-explain/route.ts`            | `coach_explain`            |
| `src/app/api/workouts/ai-exercise-add/route.ts`          | `ai_exercise_add`          |
| `src/app/api/workouts/ai-exercise-apply/route.ts`        | `ai_exercise_apply`        |
| `src/app/api/workouts/ai-exercise-apply-rating/route.ts` | `ai_exercise_apply_rating` |
| `src/app/api/workouts/ai-exercise-apply-add/route.ts`    | `ai_exercise_apply_add`    |
| `src/app/api/workouts/ai-exercise-order-check/route.ts`  | `ai_exercise_order_check`  |
| `src/app/api/workouts/ai-interval-timer/route.ts`        | `ai_interval_timer`        |
| `src/app/api/workouts/generate-images/route.ts`          | `generate_images`          |
| `src/app/api/exercises/biomechanical-analysis/route.ts`  | `biomechanical_analysis`   |

### Other API routes (21) — add captureApiError only

| Route                                              | Endpoint tag                 |
| -------------------------------------------------- | ---------------------------- |
| `src/app/api/admin/sentry/issues/route.ts`         | `admin_sentry_issues`        |
| `src/app/api/admin/waivers/route.ts`               | `admin_waivers`              |
| `src/app/api/admin/waivers/[version]/route.ts`     | `admin_waivers_version`      |
| `src/app/api/admin/waivers/agreements/route.ts`    | `admin_waivers_agreements`   |
| `src/app/api/admin/images/route.ts`                | `admin_images`               |
| `src/app/api/admin/sync-exercise-images/route.ts`  | `admin_sync_exercise_images` |
| `src/app/api/board/event/route.ts`                 | `board_event`                |
| `src/app/api/board/state/route.ts`                 | `board_state`                |
| `src/app/api/images/search/route.ts`               | `images_search`              |
| `src/app/api/images/preferences/route.ts`          | `images_preferences`         |
| `src/app/api/support/create/route.ts`              | `support_create`             |
| `src/app/api/users/ensure/route.ts`                | `users_ensure`               |
| `src/app/api/users/workout-counts/route.ts`        | `workout_counts`             |
| `src/app/api/users/workouts/route.ts`              | `users_workouts`             |
| `src/app/api/users/workouts/[workoutId]/route.ts`  | `users_workouts_detail`      |
| `src/app/api/waiver/active/route.ts`               | `waiver_active`              |
| `src/app/api/waiver/agree/route.ts`                | `waiver_agree`               |
| `src/app/api/workouts/map-images/route.ts`         | `workouts_map_images`        |
| `src/app/api/workouts/reorder-exercises/route.ts`  | `reorder_exercises`          |
| `src/app/api/workouts/save-section-timer/route.ts` | `save_section_timer`         |

**Optional:** `sentry-example-api` — add only if it has a catch and you want it instrumented.

## Implementation steps (per route)

1. **Import:** Add `captureApiError` (and for AI routes, `incrementMetric`) to the `@/lib/sentry` import.
2. **Main catch:** In the route’s main `catch (error)` block (the one that returns a 4xx/5xx to the client), add at the start of the catch:
   - `captureApiError(error, { endpoint: "<tag>" });`  
     Add `operation`, `userId`, `requestId` only where the route already has them in scope.
   - For the 9 AI routes: also `incrementMetric("ai.failure", 1, { endpoint: "<tag>" });`
3. **Placement:** Before existing `logger.error` and before any error-type branching (Zod, auth, 429, etc.).

Routes with **multiple** top-level catches (e.g. admin/sentry/issues, admin/waivers): add `captureApiError` in each catch that represents a request-level failure (same `endpoint`, optional `operation`).

## Documentation

- **docs/SENTRY_IMPLEMENTATION_SWOT.md:** Update the Error capture bullet from “used in 7 API routes” to “used in all API routes” (or “used in 37 API routes”) and note that coverage was expanded to include the remaining routes and all AI endpoints.

## Verification

- Grep `captureApiError` in `src/app/api` and confirm it appears in every route that has a main catch.
- Trigger an error on one new route (e.g. coach-explain); confirm the event in Sentry has the correct `endpoint` tag.
