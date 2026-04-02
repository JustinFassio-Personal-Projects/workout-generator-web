# Technical design: Feature adoption → activity journeys (admin Analytics)

## Purpose

Extend the **Analytics → Engagement → Feature adoption (Hub / Firestore)** experience so admins can move from aggregate counts to **inspectable user journeys**. **Phase 0** delivered the **Workout started** baseline (attempt-scoped journeys). **Phase 1 (hub)** delivered **B1 `generation_id`** end-to-end on the hub (emit, propagate, index, docs). **Phase 2 (admin)** shipped **`listRecentByAction` / `timelineByGenerationId`** and **`GET /api/admin/analytics/activity-journey`** so admins can fetch **Workout generated** lists and **`generation_id`** timelines. **Phase 3** shipped engagement **Browse / View journey** UI for **Workout started** and **Workout generated** via [`activity-drill-down-config.ts`](../src/lib/admin/activity-drill-down-config.ts) and [`ActivityJourneyExplorer.tsx`](../src/components/react/admin/analytics-detail/ActivityJourneyExplorer.tsx). **Phase 4** expanded the registry (more list actions, **`workout:open`** per-row funnel vs attempt timelines, list-only rows, **`app:session_start`** + **`session_id`** timelines) with list allowlists derived from the registry and a hub **`(session_id, timestamp)`** composite.

This document is implementation guidance for `admin-dash-astro` and, where noted, companion changes in `aiworkoutgenerator-hub` for correlation fields.

---

## Current state

| Piece | Location | Behavior |
| ----- | -------- | -------- |
| Adoption table | [`EngagementDetailPanel.tsx`](../src/components/react/admin/analytics-detail/EngagementDetailPanel.tsx) | Lists `HUB_FEATURE_ADOPTION_ACTIONS` with 7d/30d counts from [`engagement-hub.ts`](../src/lib/firebase/engagement-hub.ts). Enabled drill-down rows set `activeDrillDownEvent` and scroll to `#activity-journey-explorer`. |
| Activity journey drill-down | Same panel + [`activity-drill-down-config.ts`](../src/lib/admin/activity-drill-down-config.ts) + [`ActivityJourneyExplorer.tsx`](../src/components/react/admin/analytics-detail/ActivityJourneyExplorer.tsx) | Registry drives list/timeline fetches per `eventName`. **`workout:start`:** list via `workout-journey`; **View journey** → attempt timeline. **`workout:generate`:** list `GET …/activity-journey?list=1&action=workout:generate&…`; **View journey** → `generation_id`. **Phase 4:** additional enabled rows (e.g. **`workout:open`** per-row generation vs attempt, **`workout:complete`** / **`recipe:view`** list-only, **`app:session_start`** + session timeline) — see registry. |
| Journey API + queries | [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts), [`workout-journey` route](../src/pages/api/admin/analytics/workout-journey.ts), [`activity-journey` route](../src/pages/api/admin/analytics/activity-journey.ts) | **Attempt:** `workout-journey`. **Generation / session lists + timelines:** `activity-journey` (`list=1&action=…` allowlist from `getActivityJourneyListActions()`; `correlation=generation_id` or `session_id`). Indexes in [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md). |
| Hub correlation | Hub `workout_attempt_id` + `details.surface`; hub optional **`generation_id`** (Phase 1) | Documented in [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md). |

**Operational note:** If the **Workout started** explorer list is empty while adoption shows starts, typical causes are traffic on an old hub build, legacy rows without `workout_attempt_id`, or composite indexes not deployed—see [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md) and [Phase 0 completed](#phase-0-completed-baseline-player-attempt-journeys). **Workout generated** **View journey** requires top-level `generation_id` on the log row (newer hub builds).

---

## Goals

1. **Workout started:** Treat the table row as the primary entry (click row or prominent control), keep **Browse journeys**, and ensure empty states explain prerequisites (indexes, hub version, `workout_attempt_id`). **Phase 0** shipped row click + keyboard focus and **Browse journeys**; **Phase 3** moved the explorer onto `ActivityJourneyExplorer` + registry while preserving behavior.
2. **Workout generated:** **Parallel** drill-down (**Phase 3**): recent `workout:generate` rows, then a **journey** view correlated by top-level **`generation_id`** (B1 — hub data **Phase 1**; admin **API Phase 2**; engagement **UI Phase 3**, see §B).
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

### B. Generation-scoped (**Workout generated**) — **B1 approved** (**Phase 1 hub complete**)

Today `workout:generate` typically has `resource_id` = new workout id and may include `session_id`. There is **no** shared id tying “generate → open → start” without an explicit correlation field.

**Option B1 (approved):** Add optional top-level **`generation_id`** (UUID) on `workout:generate`, and pass the same value on subsequent events in that flow (`workout:open`, `workout:start`, `workout:complete`) when the user is continuing from that generation in-session. This mirrors `workout_attempt_id` but spans the funnel from creation through player engagement. Admin will list recent `workout:generate` rows and load timelines with `where generation_id == id` + `orderBy timestamp asc` (composite index declared in hub—deploy required).

**Phase 1 (hub) — done:** The hub emits `generation_id` on `workout:generate`, propagates it through player surfaces via sessionStorage + `WorkoutAnalyticsAttemptContext`, clears storage only after a persisted `workout:open`, and logs it on start/complete where applicable. See [Phase 1 completed](#phase-1-completed-hub-generation-funnel-b1-data). **Admin** list/timeline queries ship in **Phase 2** ([`activity-journey`](../src/pages/api/admin/analytics/activity-journey.ts)); engagement UI for **Workout generated** remains **Phase 3**.

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
- `timelineBySessionId(id)` (**Phase 4** — [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts); hub `(session_id, timestamp)` index)
- `timelineByGenerationId(id)` (**Phase 2** — same file; hub B1 + index Phase 1)

Keep **`/api/admin/analytics/workout-journey`** as a thin backward-compatible alias that delegates to the generic handler with fixed `action=workout:start` and correlation `workout_attempt_id`, or deprecate after one release.

### Firestore indexes

Add composites as new query modes ship. **Declared in hub** [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json) (deploy to hub Firebase project per [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md)):

- `(workout_attempt_id, timestamp asc)` — attempt journey (Phase 0)
- `(action, timestamp desc)` — list by action
- `(generation_id, timestamp asc)` — generation funnel timeline (Phase 1 hub; **admin queries Phase 2**)
- `(session_id, timestamp asc)` — session-scoped timeline (**Phase 4** admin + hub index)

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

Ship incrementally: **`enabled: true`** only when list/timeline queries and hub fields are ready (**Phase 4** added **`workout:open`**, **`workout:complete`**, **`recipe:view`**, **`app:session_start`** — see registry).

### 2. Generic explorer component

**Shipped (Phase 3):** **`ActivityJourneyExplorer`** (replaces the former `WorkoutJourneyExplorer`):

- Props: `activeEventName: string` — looks up [`DrillDownConfig`](../src/lib/admin/activity-drill-down-config.ts) via `getDrillDownConfig` and fetches list/timeline per `list` / `timeline` kinds (`workout-journey` vs `activity-journey`).
- **View journey** uses [`resolveRowTimelineTarget`](../src/lib/admin/activity-drill-down-config.ts) (or equivalent): single-field timelines use `getTimelineId`; **`workout:open`** uses **per-row** resolution (`generation_id` preferred, else `workout_attempt_id`).

For **Workout generated**, list shows timestamp, user, `resource_id` (workout id), `session_id`, and **`generation_id`** when present; **View journey** uses **`generation_id`** only (B1).

### 3. Engagement table wiring

In `EngagementDetailPanel`:

- For rows with `enabled` drill-down: row click / keyboard sets `activeDrillDownEvent` and scrolls to `#activity-journey-explorer` (optional v1.1: query `?focusAction=`).
- Keep secondary text link **Browse** / **View journeys** consistent with today’s **Browse journeys** for `workout:start`.

**Phase 0:** **Workout started** uses full row click, `cursor-pointer`, and keyboard (**Enter** / **Space**) on the adoption table row—pattern to mirror for future drill-down rows.

### 4. Route-based deep link (optional v1.1)

`AnalyticsDetailView` already supports dataset keys. Add optional query `?focusAction=workout:generate` to open the explorer pre-scrolled. Helps support and bookmarks.

---

## Hub work summary (Workout generated — B1)

| Item | Description |
| ---- | ----------- |
| `generation_id` | Optional top-level field on logs; UUID on hub generate; max length in `GENERATION_ID_MAX_LEN` (hub). |
| Propagation | SessionStorage bridge + context peek; same id on generate → open → start → complete when the user continues in-tab; clear after persisted `workout:open`. |
| API | `POST /api/analytics/log-activity` accepts optional `generation_id` (validated). |
| Logger | `logUserActivity` extras include `generationId`; returns persist boolean for open cleanup. |

Exact propagation rules are documented for the hub in [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md). The admin design only requires **one stable id**, queryable via the Phase 2 [`activity-journey`](../src/pages/api/admin/analytics/activity-journey.ts) API.

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
| **Admin — UI** | Historical: `WorkoutJourneyExplorer` + **Workout started** row only. **Superseded by Phase 3:** [`activity-drill-down-config.ts`](../src/lib/admin/activity-drill-down-config.ts), [`ActivityJourneyExplorer.tsx`](../src/components/react/admin/analytics-detail/ActivityJourneyExplorer.tsx); [`EngagementDetailPanel.tsx`](../src/components/react/admin/analytics-detail/EngagementDetailPanel.tsx) embeds explorer when Hub adoption is present; **Workout started** and **Workout generated** rows scroll to `#activity-journey-explorer` (**Browse journeys**). |
| **Admin — catalog** | [`analytics-datasets.ts`](../src/lib/admin/analytics-datasets.ts) documents journey endpoints under Engagement; [`analytics-glossary.ts`](../src/lib/admin/analytics-glossary.ts) — `workout_attempt_id`, workout surface, journey explorer. |
| **Admin — docs** | [`ENGAGEMENT_FEATURE_ADOPTION.md`](./ENGAGEMENT_FEATURE_ADOPTION.md), [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md) — index deploy + Phase 0 QA steps. |

**Next:** [Phase 1 completed](#phase-1-completed-hub-generation-funnel-b1-data) (hub `generation_id`); then [Phase 2 completed](#phase-2-completed-admin-generation-queries--api) and [Phase 3](#phased-delivery-suggested) UI (shipped).

---

## Phase 1 completed (hub generation funnel — B1 data)

**Status:** Implemented in **hub** (`aiworkoutgenerator-hub`). **Code complete** for correlation writes; **production sign-off** requires the **`(generation_id, timestamp)`** composite **built** on the hub Firebase project (see [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md)) and spot-checking new logs for top-level `generation_id` on `workout:generate` and downstream actions. **Admin** list/timeline **API** for **Workout generated** is [Phase 2](#phase-2-completed-admin-generation-queries--api); engagement **UI** is [Phase 3](#phased-delivery-suggested) (shipped).

| Area | Delivered |
| ---- | --------- |
| **Hub — API** | [`log-activity/route.ts`](../../aiworkoutgenerator-hub/src/app/api/analytics/log-activity/route.ts) validates and persists optional top-level `generation_id` (with `GENERATION_ID_MAX_LEN`). |
| **Hub — logger** | [`user-activity-logger.ts`](../../aiworkoutgenerator-hub/src/lib/user-activity-logger.ts): `LogUserActivityExtras.generationId`, trim + payload; `Promise<boolean>` persist signal. |
| **Hub — constants** | [`user-activity-constants.ts`](../../aiworkoutgenerator-hub/src/lib/user-activity-constants.ts): `GENERATION_ID_MAX_LEN`. |
| **Hub — bridge** | [`workout-generation-analytics-storage.ts`](../../aiworkoutgenerator-hub/src/lib/workout-generation-analytics-storage.ts): sessionStorage keyed by normalized workout id; set on generate, read in player context, clear after persisted open. |
| **Hub — generate** | [`generate/page.tsx`](../../aiworkoutgenerator-hub/src/app/generate/page.tsx): new UUID per successful generate; `setGenerationIdForWorkout`; `workout:generate` with `generation_id`. |
| **Hub — context** | [`WorkoutAnalyticsAttemptContext.tsx`](../../aiworkoutgenerator-hub/src/contexts/WorkoutAnalyticsAttemptContext.tsx): exposes `generationId` from storage peek for player analytics. |
| **Hub — workout:open** | [`useLogWorkoutOpenActivity.ts`](../../aiworkoutgenerator-hub/src/hooks/useLogWorkoutOpenActivity.ts): central open log with retries; `resource_id` = Firestore doc id (aligned with `workout:start`); clear generation storage only after persist. |
| **Hub — document id** | [`useTrainerWorkout.ts`](../../aiworkoutgenerator-hub/src/hooks/useTrainerWorkout.ts): workout object includes `id: snap.id` so client `resource_id` matches the document path. |
| **Hub — start / complete** | [`ManualWorkoutPlayer.tsx`](../../aiworkoutgenerator-hub/src/components/workout/player/ManualWorkoutPlayer.tsx), [`WrittenWorkoutView.tsx`](../../aiworkoutgenerator-hub/src/components/workout/written/WrittenWorkoutView.tsx), [`WrittenWorkoutMobileView.tsx`](../../aiworkoutgenerator-hub/src/components/workout/written/WrittenWorkoutMobileView.tsx), [`CompletionModal.tsx`](../../aiworkoutgenerator-hub/src/components/history/CompletionModal.tsx): pass `generation_id` when present. |
| **Hub — indexes** | [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json): `user_activity_logs` composite `(generation_id asc, timestamp asc)`. |
| **Hub — docs** | [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md): `generation_id`, propagation, event order. |
| **Admin — docs** | [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md): generation timeline index + deploy note. |

**Next:** [Phase 2 completed](#phase-2-completed-admin-generation-queries--api); [Phase 3](#phased-delivery-suggested) registry + explorer UI is **shipped**.

---

## Phase 2 completed (admin generation queries + API)

**Status:** Implemented in **admin** (`admin-dash-astro`). **Code complete** for Firestore reads; **production sign-off** requires the same **`(generation_id, timestamp)`** composite **built** on the Firebase project admin uses (see [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md)) and authenticated API smoke tests.

| Area | Delivered |
| ---- | --------- |
| **Admin — lib** | [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts): `generation_id` on `WorkoutActivityLogRow`; `listRecentByAction`; `timelineByGenerationId`; shared timeline helper; `listRecentWorkoutStarts` delegates to `listRecentByAction('workout:start', …)`. |
| **Admin — API** | [`activity-journey.ts`](../src/pages/api/admin/analytics/activity-journey.ts): `list=1&action=workout:generate&days=&limit=`; `correlation=generation_id&id=`; allowlists + caps aligned with `workout-journey`. |
| **Admin — catalog / docs** | [`analytics-datasets.ts`](../src/lib/admin/analytics-datasets.ts), [`ENGAGEMENT_FEATURE_ADOPTION.md`](./ENGAGEMENT_FEATURE_ADOPTION.md). |

**Next:** [Phase 3](#phased-delivery-suggested) UI, then [Phase 4 completed](#phase-4-completed-scaffold-expansion).

---

## Phase 4 completed (scaffold expansion)

**Status:** Implemented in **admin** (`admin-dash-astro`) and **hub** index declaration (`aiworkoutgenerator-hub`). **Code complete**; **production sign-off** requires **`(session_id, timestamp)`** composite **built** on the hub Firebase project (same as other `user_activity_logs` composites) and spot-checks that `app:session_start` (and other) rows carry `session_id` when you expect session timelines.

| Area | Delivered |
| ---- | --------- |
| **Admin — registry** | [`activity-drill-down-config.ts`](../src/lib/admin/activity-drill-down-config.ts): `getActivityJourneyListActions()`, `resolveRowTimelineTarget()`; enabled rows for **`workout:open`** (per-row generation vs attempt), **`workout:complete`** / **`recipe:view`** (list-only), **`app:session_start`** (session timeline); optional **`showSessionIdColumn`**. |
| **Admin — lib** | [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts): `timelineBySessionId`. |
| **Admin — API** | [`activity-journey.ts`](../src/pages/api/admin/analytics/activity-journey.ts): list allowlist derived from `getActivityJourneyListActions()`; `correlation=session_id&id=`. |
| **Admin — UI** | [`ActivityJourneyExplorer.tsx`](../src/components/react/admin/analytics-detail/ActivityJourneyExplorer.tsx): unified timeline fetch by target kind (attempt / generation / session); hides timeline panel for list-only configs. |
| **Hub — indexes** | [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json): `user_activity_logs` **`session_id` ASC, `timestamp` ASC**. |
| **Docs / catalog** | [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md), [`ENGAGEMENT_FEATURE_ADOPTION.md`](./ENGAGEMENT_FEATURE_ADOPTION.md), [`analytics-datasets.ts`](../src/lib/admin/analytics-datasets.ts), hub [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md) (`session_id` admin note). |

**Next:** [Phased delivery](#phased-delivery-suggested) — **Phase 5** (Marketing / Supabase) or further registry entries.

---

## Marketing & timer (Supabase) — phase 2

The second table (`analytics_funnel_events`) uses different columns and possibly `session` or funnel ids. **Do not** force into the Firestore `ActivityJourneyExplorer` without a **second registry namespace**, e.g. `source: 'hub' | 'marketing'` and separate API routes under `/api/admin/analytics/funnel-events/…`. The screenshot’s “timer session…” row would map there.

---

## Phased delivery (suggested)

Phases are ordered so **hub data exists before** admin queries and UI depend on it. Adjust dates or split PRs per team capacity.

| Phase | Scope | Outcome |
| ----- | ----- | ------- |
| **0 — Baseline (complete)** | `workout_attempt_id`, `workout-journey` API, `WorkoutJourneyExplorer`, engagement **Browse journeys** for **Workout started** | **Shipped** — see [Phase 0 completed](#phase-0-completed-baseline-player-attempt-journeys). **Production sign-off:** indexes deployed + hub QA on all three players + admin list/**View journey** per [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md). |
| **1 — Hub: `generation_id`** | `POST /api/analytics/log-activity` + client logger: optional top-level `generation_id`. Emit UUID on `workout:generate`; propagate to `workout:open` / `workout:start` / `workout:complete` when continuing from that generation in-tab. | **Shipped (hub)** — see [Phase 1 completed](#phase-1-completed-hub-generation-funnel-b1-data). **Production sign-off:** hub deployed + generation index built + sample logs verified. |
| **1b — Indexes** | Hub `firestore.indexes.json`: composite **`generation_id` ASC, `timestamp` ASC**; document in [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md). | **Shipped** (declared in repo; deploy `firestore:indexes` to hub project). |
| **1c — Hub docs** | [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md): `generation_id`, event order, propagation. | **Shipped**. |
| **2 — Admin: query + API** | Extend [`workout-journey.ts`](../src/lib/firebase/workout-journey.ts): `listRecentByAction`, `timelineByGenerationId`, DRY timeline helper; add [`activity-journey`](../src/pages/api/admin/analytics/activity-journey.ts) (`list=1&action=workout:generate`, `correlation=generation_id&id=`). | **Shipped** — authenticated list + timeline by `generation_id`; **sign-off:** index deployed + API smoke in target environment. |
| **3 — Admin: UI** | Introduce `activity-drill-down-config.ts` + **`ActivityJourneyExplorer`** (replaces `WorkoutJourneyExplorer`): **Workout generated** row gets **Browse / View** pattern like **Workout started**; register `workout:start` in the same registry (behavior parity). | **Shipped** — feature adoption table drives both drills; scroll target `#activity-journey-explorer`. |
| **4 — Scaffold expansion** | Enable registry entries for more `HUB_FEATURE_ADOPTION_ACTIONS` as indexes + hub fields exist (`session_id` timeline + `(session_id, timestamp)` index; list allowlist synced from registry). | **Shipped** — see [Phase 4 completed](#phase-4-completed-scaffold-expansion). **Sign-off:** session index deployed + sample `session_id` logs for session drill-down. |
| **5 — Marketing / Supabase** | Separate namespace + APIs for `analytics_funnel_events` (see §Marketing & timer). | Parity for the second adoption table. |

**Dependencies:** Phase 2+ admin work should assume Phase 1 hub writes and the **`generation_id`** composite index are live in the environment under test; otherwise timelines will miss rows or fail with missing-index errors. Legacy **`workout:generate`** rows without `generation_id` will not appear in generation-scoped **View journey** until new traffic produces correlated logs.

---

## Rollout plan (summary)

Through **Phase 4**, hub correlation fields, admin journey APIs, registry, **`ActivityJourneyExplorer`**, and scaffold expansion (additional adoption drill-downs + session timelines) are **done in code**. Confirm Firestore indexes and QA in each environment. The detailed sequence is **[Phased delivery (suggested)](#phased-delivery-suggested)**. **Next:** **Phase 5** (Marketing / Supabase) or more registry rows as product needs them.

---

## Testing

- **Phase 0 (regression):** With dev/staging Firestore, confirm recent `workout:start` rows with top-level `workout_attempt_id` appear in the admin list; **View journey** returns ordered steps for a known id; missing indexes surface a clear error in the explorer.
- **Phase 1 (hub):** After generate → open player in the same tab, confirm new `user_activity_logs` rows share the same top-level `generation_id` on `workout:generate`, `workout:open`, and (when exercised) `workout:start` / `workout:complete`; confirm storage clears after a successful open persist; after hub index deploy, sanity-check a `generation_id` + `timestamp` query in Firebase console or defer to Phase 2 admin API tests.
- Contract tests or manual checks: list + timeline for each `enabled` action with dev Firestore data (includes **Workout started** and **Workout generated** via registry).
- Verify empty states when indexes are missing (Firestore error surfaced in UI).
- **Phase 2 (admin API):** With admin auth, `GET /api/admin/analytics/activity-journey?list=1&action=workout:generate&days=7&limit=50` returns `{ mode: 'list', rows }` newest-first; `?correlation=generation_id&id={uuid}` returns `{ mode: 'timeline', rows }` oldest-first for a known hub `generation_id`. Requires `(generation_id, timestamp)` index on the admin Firebase project.
- **Phase 4 (admin API):** `GET …/activity-journey?list=1&action=app:session_start&…` succeeds when the action is in `getActivityJourneyListActions()`; `?correlation=session_id&id={id}` returns a session-ordered timeline. Requires `(session_id, timestamp)` index. **`workout:open`** list + **View journey** exercises generation vs attempt APIs depending on row fields.

---

## References

- [`ENGAGEMENT_FEATURE_ADOPTION.md`](./ENGAGEMENT_FEATURE_ADOPTION.md)
- [`FIRESTORE_INDEXES_RETENTION.md`](./FIRESTORE_INDEXES_RETENTION.md)
- Hub [`ACTIVITY_LOGGING.md`](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md)
- [`analytics-glossary.ts`](../src/lib/admin/analytics-glossary.ts) — **`generation_id`** and **activity journey explorer** terms for engagement
