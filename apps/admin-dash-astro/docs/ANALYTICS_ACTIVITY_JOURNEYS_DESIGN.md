# Technical design: Feature adoption → activity journeys (admin Analytics)

## Purpose

Extend the **Analytics → Engagement → Feature adoption (Hub / Firestore)** experience so admins can move from aggregate counts to **inspectable user journeys**. **Phase 0** delivered the **Workout started** baseline (attempt-scoped journeys); next is **Workout generated** and a **general scaffold** for other `user_activity_logs` actions.

This document is implementation guidance for `admin-dash-astro` and, where noted, companion changes in `aiworkoutgenerator-hub` for correlation fields.

---

## Current state

| Piece | Location | Behavior |
| ----- | -------- | -------- |
| Adoption table | [`EngagementDetailPanel.tsx`](../src/components/react/admin/analytics-detail/EngagementDetailPanel.tsx) | Lists `HUB_FEATURE_ADOPTION_ACTIONS` with 7d/30d counts from [`engagement-hub.ts`](../src/lib/firebase/engagement-hub.ts). |
| Workout started drill-down | Same panel + [`WorkoutJourneyExplorer.tsx`](../src/components/react/admin/analytics-detail/WorkoutJourneyExplorer.tsx) | **Browse journeys** anchor on the `workout:start` row; explorer lists recent starts via `GET /api/admin/analytics/workout-journey?list_starts=true&…`; **View journey** loads `?workout_attempt_id=` timeline. |
| Journey API + queries | [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts), [`workout-journey.ts` API route](../src/pages/api/admin/analytics/workout-journey.ts) | Firestore `user_activity_logs`; indexes documented in [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md). |
| Hub correlation | Hub `workout_attempt_id` + `details.surface` | Documented in [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md). |

**Remaining gap:** **Workout generated** and other adoption rows do not yet have registry-driven drill-downs. If the **Workout journey explorer** list is empty in production while adoption counts show starts, typical causes are: traffic still on a build without `workout:start` + `workout_attempt_id`, legacy rows without the top-level id, or Firestore composite indexes not yet deployed—see [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md) and [Phase 0 completed](#phase-0-completed-baseline-player-attempt-journeys) below.

---

## Goals

1. **Workout started:** Treat the table row as the primary entry (click row or prominent control), keep **Browse journeys**, and ensure empty states explain prerequisites (indexes, hub version, `workout_attempt_id`). **Phase 0** shipped row click + keyboard focus, **Browse journeys**, `WorkoutJourneyExplorer`, and empty-state copy for indexes / hub version.
2. **Workout generated:** Add a **parallel** drill-down: recent `workout:generate` rows, then a **journey** view correlated by top-level **`generation_id`** (approved approach — see §B).
3. **General scaffold:** One pattern reusable for each Hub action (and later optional Marketing/Supabase rows), without duplicating bespoke APIs per action forever.

Non-goals for v1 of this design: full Supabase `analytics_funnel_events` parity (different schema; separate phase).

---

## Design principles

1. **Correlation strategy is per action family** — not every action has `workout_attempt_id`. The admin layer should declare, per `eventName`, how to **list recent events** and how to **expand a journey**.
2. **Prefer top-level Firestore fields** for anything we query at scale (same rationale as `workout_attempt_id`).
3. **One generic API surface** behind small, typed query modules—avoid N nearly identical route files.
4. **UI registry** maps `eventName` → panel component + labels so `EngagementDetailPanel` stays thin.

---

## Correlation models (by action family)

### A. Attempt-scoped (**Phase 0 shipped**): `workout:open` | `workout:start` | `workout:complete`

- **Key:** `workout_attempt_id` (top-level).
- **List:** `where action == 'workout:start'` + time range + `orderBy timestamp desc` (admin: `list_starts` on `/api/admin/analytics/workout-journey`).
- **Timeline:** `where workout_attempt_id == id` + `orderBy timestamp asc` (admin: `workout_attempt_id` query param).

### B. Generation-scoped (**Workout generated**) — **B1 approved**

Today `workout:generate` typically has `resource_id` = new workout id and may include `session_id`. There is **no** shared id tying “generate → open → start” without an explicit correlation field.

**Option B1 (approved):** Add optional top-level **`generation_id`** (UUID) on `workout:generate`, and pass the same value on subsequent events in that flow (`workout:open`, `workout:start`, `workout:complete`) when the user is continuing from that generation in-session. This mirrors `workout_attempt_id` but spans the funnel from creation through player engagement. Admin lists recent `workout:generate` rows and loads timelines with `where generation_id == id` + `orderBy timestamp asc` (composite index required).

**Option B2 (session / time window, not approved):** Infer journeys from `user_id` + time window or `session_id` + `timestamp >= T0` without `generation_id`. Rejected for productized drill-downs due to noise and ambiguity (power users, multiple workouts per session). May still be used ad hoc in internal scripts only; **do not** build the engagement UI around B2.

**Decision:** **Ship B1** for **Workout generated** journeys in admin Analytics. Sequencing is in [Phased delivery (suggested)](#phased-delivery-suggested) below.

### C. Session-scoped: `app:session_start` | `app:session_end` | dense intra-session noise

- **List:** recent `app:session_start` (indexed query: `action` + `timestamp`).
- **Timeline:** `where session_id == S` + `orderBy timestamp asc` **requires** a composite index `(session_id, timestamp)` and may return many rows—cap limit (e.g. 200) and filter optional `action in (…)` in app code.

### D. Resource-scoped: `recipe:view`, `workout:save`, etc.

- **List:** by `action` + time (existing index pattern).
- **Timeline:** `where user_id == U` + `resource_id == R` + time window, or session-scoped as in C—define per action in registry.

---

## API design (generalized)

### Single route (preferred)

`GET /api/admin/analytics/activity-journey`

Query parameters:

| Param | Use |
| ----- | --- |
| `action` | Hub action, e.g. `workout:start`, `workout:generate` |
| `list` | `1` → return recent rows for that action (`days`, `limit`) |
| `correlation` | Discriminator: `workout_attempt_id`, `session_id`, `generation_id`, `user_time_window`, etc. |
| `id` | Value for correlation (e.g. UUID) |
| `days`, `limit` | List windows; cap `limit` server-side |

Response shapes:

- `{ mode: 'list', action, rows: ActivityLogRow[] }`
- `{ mode: 'timeline', correlation, id, rows: ActivityLogRow[] }`

Implementation: refactor [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts) into a small **firebase/activity-logs-query.ts** (or extend the file) with functions:

- `listRecentByAction(action, days, limit)`
- `timelineByWorkoutAttemptId(id)`
- `timelineBySessionId(id, limit)` (future)
- `timelineByGenerationId(id)` (after hub ships B1 + index)

Keep **`/api/admin/analytics/workout-journey`** as a thin backward-compatible alias that delegates to the generic handler with fixed `action=workout:start` and correlation `workout_attempt_id`, or deprecate after one release.

### Firestore indexes

Add composites as new query modes ship. Today:

- `(workout_attempt_id, timestamp asc)` — journey
- `(action, timestamp desc)` — list by action

Future examples:

- `(session_id, timestamp asc)` — session timeline
- `(generation_id, timestamp asc)` — generation funnel (B1, approved)

Document each in [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md) and hub [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json).

---

## UI design (scaffold)

### 1. Registry: `activity-drill-down-config.ts` (new)

For each `eventName` in `HUB_FEATURE_ADOPTION_ACTIONS` that supports drill-down:

```ts
type DrillDownConfig = {
  eventName: string;
  label: string;
  /** Shown when list is empty */
  emptyHint?: string;
  listQuery: { action: string; daysDefault: number };
  correlation: 'workout_attempt_id' | 'session_id' | 'generation_id' | 'none';
  /** If true, row click opens explorer filtered to this action */
  enabled: boolean;
};
```

Ship with `enabled: true` for `workout:start` and `workout:generate` first; others `enabled: false` until indexes + hub fields exist.

### 2. Generic explorer component

Replace or wrap `WorkoutJourneyExplorer` with **`ActivityJourneyExplorer`**:

- Props: `config: DrillDownConfig`
- Fetches list via generic API with `action` from config
- Timeline button uses `correlation` + id from selected row (read from top-level fields on the log doc)

For **Workout generated**, list shows timestamp, user, `resource_id` (workout id), `session_id`, and **`generation_id`** when present; **View journey** uses **`generation_id`** only (B1).

### 3. Engagement table wiring

In `EngagementDetailPanel`:

- For rows with `enabled` drill-down: make the **Action** cell a button or link that sets `selectedDrillDownAction` in state (or navigates to `/analytics/detail/engagement/activity?action=workout:generate`).
- Keep secondary text link **Browse** / **View journeys** consistent with today’s **Browse journeys** for `workout:start`.

**Phase 0:** **Workout started** uses full row click, `cursor-pointer`, and keyboard (**Enter** / **Space**) on the adoption table row—pattern to mirror for future drill-down rows.

### 4. Route-based deep link (optional v1.1)

`AnalyticsDetailView` already supports dataset keys. Add optional query `?focusAction=workout:generate` to open the explorer pre-scrolled. Helps support and bookmarks.

---

## Hub work summary (Workout generated — B1 approved)

| Item | Description |
| ---- | ----------- |
| `generation_id` | New optional top-level field on logs; UUID created when user generates a workout; max length same pattern as `workout_attempt_id`. |
| Propagation | Same `generation_id` on `workout:open` when opening that workout from the generation flow (if detectable), or at minimum on `workout:generate` only until flows are wired. |
| API | Extend `POST /api/analytics/log-activity` to accept optional `generation_id`. |
| Logger | Extend `logUserActivity` extras parallel to `workoutAttemptId`. |

Exact propagation rules are product-specific; the admin design only requires **one stable id** to query.

---

## Phase 0 completed (baseline player-attempt journeys)

**Status:** Implemented in **hub** (`aiworkoutgenerator-hub`) and **admin** (`admin-dash-astro`). Treat as **code complete**; **production sign-off** still requires composite indexes **built** on the hub Firebase project (see deploy steps in [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md)) and the Phase 0 manual QA checklist there.

| Area | Delivered |
| ---- | --------- |
| **Hub — API** | `POST /api/analytics/log-activity` accepts optional top-level `workout_attempt_id` (validated; max length in `user-activity-constants.ts`); client `logUserActivity` trims before API / Firestore fallback. |
| **Hub — correlation** | `WorkoutAnalyticsAttemptContext` (one UUID per player route mount); same id on `workout:open`, `workout:start`, `workout:complete` where applicable. |
| **Hub — surfaces** | Guided player, written desktop, written mobile: `details.surface` = `workout_player` / `simple_player` / `mobile_player`; written paths also set `surface_legacy` for older dashboards. |
| **Hub — logging** | `logUserActivity` extras include `workoutAttemptId`; `ManualWorkoutPlayer` + written views emit `workout:start` once per attempt; `CompletionModal` enriches `workout:complete` when under the provider. |
| **Hub — docs** | [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md) — workout funnel + correlation fields. |
| **Hub — indexes** | [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json) — `user_activity_logs` composites: `(workout_attempt_id, timestamp asc)`, `(action, timestamp desc)`. |
| **Admin — API** | [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts) queries + [`workout-journey` route](../src/pages/api/admin/analytics/workout-journey.ts): timeline by attempt id, recent `workout:start` list. |
| **Admin — UI** | [`WorkoutJourneyExplorer.tsx`](../src/components/react/admin/analytics-detail/WorkoutJourneyExplorer.tsx); [`EngagementDetailPanel.tsx`](../src/components/react/admin/analytics-detail/EngagementDetailPanel.tsx) embeds explorer when Hub adoption is present; **Workout started** row scrolls to explorer (**Browse journeys**). |
| **Admin — catalog** | [`analytics-datasets.ts`](../src/lib/admin/analytics-datasets.ts) documents journey endpoints under Engagement; [`analytics-glossary.ts`](../src/lib/admin/analytics-glossary.ts) — `workout_attempt_id`, workout surface, journey explorer. |
| **Admin — docs** | [`ENGAGEMENT_FEATURE_ADOPTION.md`](./ENGAGEMENT_FEATURE_ADOPTION.md), [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md) — index deploy + Phase 0 QA steps. |

**Next:** [Phased delivery](#phased-delivery-suggested) — Phase 1 (`generation_id`) and below.

---

## Marketing & timer (Supabase) — phase 2

The second table (`analytics_funnel_events`) uses different columns and possibly `session` or funnel ids. **Do not** force into the Firestore `ActivityJourneyExplorer` without a **second registry namespace**, e.g. `source: 'hub' | 'marketing'` and separate API routes under `/api/admin/analytics/funnel-events/…`. The screenshot’s “timer session…” row would map there.

---

## Phased delivery (suggested)

Phases are ordered so **hub data exists before** admin queries and UI depend on it. Adjust dates or split PRs per team capacity.

| Phase | Scope | Outcome |
| ----- | ----- | ------- |
| **0 — Baseline (complete)** | `workout_attempt_id`, `workout-journey` API, `WorkoutJourneyExplorer`, engagement **Browse journeys** for **Workout started** | **Shipped** — see [Phase 0 completed](#phase-0-completed-baseline-player-attempt-journeys). **Production sign-off:** indexes deployed + hub QA on all three players + admin list/**View journey** per [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md). |
| **1 — Hub: `generation_id`** | `POST /api/analytics/log-activity` + client logger: optional top-level `generation_id` (same max-length pattern as `workout_attempt_id`). Emit UUID on `workout:generate`; propagate to `workout:open` / `workout:start` / `workout:complete` per product rules when the user continues from that generation. | Firestore rows usable for generation-scoped timelines. |
| **1b — Indexes** | Hub `firestore.indexes.json`: composite `user_activity_logs` on **`generation_id` ASC, `timestamp` ASC** (and list query already covered by `action` + `timestamp` for `workout:generate`). Document in [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md). | Queries succeed in production after deploy. |
| **1c — Hub docs** | [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md): define `generation_id`, event order generate → open → …, and propagation expectations. | Contract for client teams and admin. |
| **2 — Admin: query + API** | Refactor or extend [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts): `listRecentByAction('workout:generate', …)`, `timelineByGenerationId(id)`. Add `GET /api/admin/analytics/activity-journey` (or extend `workout-journey` with `correlation=generation_id`) with auth + validation consistent with existing routes. | Admin can fetch list + timeline by `generation_id`. |
| **3 — Admin: UI** | Introduce `activity-drill-down-config.ts` + **`ActivityJourneyExplorer`** (or evolve `WorkoutJourneyExplorer`): **Workout generated** row gets **Browse / View** pattern like **Workout started**; register `workout:start` in the same registry (behavior parity). | Feature adoption table drives both drills without duplicate bespoke components. |
| **4 — Scaffold expansion** | Enable registry entries for more `HUB_FEATURE_ADOPTION_ACTIONS` as indexes + hub fields exist (e.g. session timeline needs `(session_id, timestamp)`). | Incremental drill-downs without new architecture. |
| **5 — Marketing / Supabase** | Separate namespace + APIs for `analytics_funnel_events` (see §Marketing & timer). | Parity for the second adoption table. |

**Dependencies:** Phase 2+ admin work should assume Phase 1 hub writes are deployed to the environment under test; otherwise **Workout generated** lists may populate from legacy rows without `generation_id`, and **View journey** will stay empty until new logs appear.

---

## Rollout plan (summary)

**Phase 0** (attempt-scoped **Workout started** journeys) is **done in code**; confirm indexes and QA in each environment. The detailed sequence is **[Phased delivery (suggested)](#phased-delivery-suggested)**. **From Phase 1 onward:** hub **`generation_id` + index + docs first**, then **admin API**, then **UI registry + Workout generated row**, then **more actions** and optionally **Supabase**.

---

## Testing

- **Phase 0 (regression):** With dev/staging Firestore, confirm recent `workout:start` rows with top-level `workout_attempt_id` appear in the admin list; **View journey** returns ordered steps for a known id; missing indexes surface a clear error in the explorer.
- Contract tests or manual checks: list + timeline for each `enabled` action with dev Firestore data (future registry actions).
- Verify empty states when indexes are missing (Firestore error surfaced in UI).
- After hub ships new fields (e.g. `generation_id`), verify admin queries return expected ordering.

---

## References

- [`ENGAGEMENT_FEATURE_ADOPTION.md`](./ENGAGEMENT_FEATURE_ADOPTION.md)
- [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md)
- Hub [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md)
- [`analytics-glossary.ts`](../src/lib/admin/analytics-glossary.ts) — add a glossary term for **`generation_id`** when Phase 3 UI ships
