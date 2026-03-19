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
- **UI:** Two labeled subsections under Feature adoption: "Hub activity (Firestore)" and "Marketing & timer (Supabase)".

## Power-user distribution (follow-up)

Today power-user buckets use **KEY_EVENTS** in Supabase. A future pass can add hub power-user buckets from Firestore (e.g. count `user_activity_logs` rows per `user_id` in range, or restrict to workout actions only).
