# Feature adoption — data streams

The **Engagement** section of Analytics shows feature adoption in two streams.

## Streams

| Stream | When | Purpose |
|--------|------|---------|
| **Hub (Firestore)** | `FIREBASE_SERVICE_ACCOUNT_KEY` set + successful read | Primary in-app feature adoption: actions the hub actually logs in `user_activity_logs`. |
| **Marketing & timer (Supabase)** | Always (when DB has data) | Builder handoff, timer funnel on marketing-connected flows from `analytics_funnel_events`. |

When Firebase is not configured, only the Supabase block appears. When Firebase is configured but Firestore read fails, an amber warning is shown (same pattern as hub DAU) and Supabase rows are still displayed.

## Hub action catalog

Rows are derived from `user_activity_logs.action` values documented in the hub's [ACTIVITY_LOGGING.md](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md):

- **App / session:** `app:open`, `app:session_start`, `app:session_end`
- **Workout:** `workout:generate`, `workout:open`, `workout:start`, `workout:complete`, `workout:save`, `workout:share`
- **Profile:** `profile:update`, `profile:onboarding_complete`
- **Recipe:** `recipe:view`, `recipe:save`
- **Subscription:** `subscription:upgrade`, `subscription:downgrade`

The config list is `HUB_FEATURE_ADOPTION_ACTIONS` in `engagement-hub.ts`; human-readable labels are in `ACTION_LABELS`.

## Aggregation

- **Windows:** UTC date boundaries; 7d and 30d lookback (consistent with `from7` / `from30` in engagement stats).
- **Metric:** Event counts per action in each window (not distinct users).
- **Optional later:** Unique users (distinct `user_id` per action) for a stronger adoption signal.

## Implementation

- **Lib:** [engagement-hub.ts](../src/lib/firebase/engagement-hub.ts) — single paginated scan over `timestamp` in `[now - 30d, now]`; per-action counters for 7d and 30d slices in the same loop.
- **API:** `GET /api/admin/analytics/engagement` returns `featureAdoptionHub` when Firebase is configured and `featureAdoptionMarketing` (Supabase KEY_EVENTS).
- **API (journey — attempt):** `GET /api/admin/analytics/workout-journey` — either `workout_attempt_id={uuid}` (ordered steps for one attempt) or `list_starts=true&days=&limit=` (recent `workout:start` rows). See [workout-journey.ts](../src/lib/firebase/workout-journey.ts) and [FIRESTORE_INDEXES_RETENTION.md](./FIRESTORE_INDEXES_RETENTION.md) for required composite indexes on `user_activity_logs`.
- **API (journey — activity-journey):** `GET /api/admin/analytics/activity-journey` — **list mode:** `list=1&action=<hub_action>&days=&limit=` where `action` is allowlisted from enabled registry rows in [activity-drill-down-config.ts](../src/lib/admin/activity-drill-down-config.ts) (`getActivityJourneyListActions`). **Timelines:** `correlation=generation_id&id={uuid}` (funnel) or `correlation=session_id&id={id}` (session-scoped). Requires the matching composite indexes on `user_activity_logs` (see [FIRESTORE_INDEXES_RETENTION.md](./FIRESTORE_INDEXES_RETENTION.md)); see [activity-journey.ts](../src/pages/api/admin/analytics/activity-journey.ts) and [ANALYTICS_ACTIVITY_JOURNEYS_DESIGN.md](./ANALYTICS_ACTIVITY_JOURNEYS_DESIGN.md).
- **UI:** Two labeled subsections under Feature adoption: "Hub activity (Firestore)" and "Marketing & timer (Supabase)". When Hub adoption is present, the **activity journey explorer** lists recent rows for whichever adoption row is selected; enabled rows scroll from the table (hint: **Browse journeys** / **Browse activity**). **View journey** loads attempt, generation, or session timelines per [activity-drill-down-config.ts](../src/lib/admin/activity-drill-down-config.ts); see [FIRESTORE_INDEXES_RETENTION.md](./FIRESTORE_INDEXES_RETENTION.md) for index deploy.
- **Design (broader drill-downs):** To extend the same pattern to **Workout generated** and other Hub actions—and to scope Marketing/Supabase separately—see [ANALYTICS_ACTIVITY_JOURNEYS_DESIGN.md](./ANALYTICS_ACTIVITY_JOURNEYS_DESIGN.md).

## Workout attempt correlation (hub)

Hub clients should set top-level `workout_attempt_id` (via `POST /api/analytics/log-activity` or client Firestore write) on `workout:open`, `workout:start`, and `workout:complete` for the same UUID per player visit. Surfaces are documented in the hub [ACTIVITY_LOGGING.md](../../aiworkoutgenerator-hub/docs/admin/ACTIVITY_LOGGING.md) (`workout_player`, `simple_player`, `mobile_player`).

## Power-user distribution (follow-up)

Today power-user buckets use **KEY_EVENTS** in Supabase. A future pass can add hub power-user buckets from Firestore (e.g. count `user_activity_logs` rows per `user_id` in range, or restrict to workout actions only).
