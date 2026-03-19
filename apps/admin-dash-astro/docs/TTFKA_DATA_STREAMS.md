# Time to first key action — data streams

The **Auth & onboarding** section of Analytics shows TTFKA (time from signup to first key action) in two streams, with sub-day latency buckets suited to real conversion timelines.

## Streams

| Stream | When | Anchor (start) | Key action (end) | Purpose |
|--------|------|----------------|------------------|---------|
| **Hub (Firestore + Auth)** | `FIREBASE_SERVICE_ACCOUNT_KEY` set + Firestore read | Firebase Auth `metadata.creationTime` | First `user_activity_logs` row whose `action` is in `TTFKA_HUB_KEY_ACTIONS` | In-app time-to-value for hub signups |
| **Marketing & builder (Supabase)** | Always (when DB has data) | `account_signup_complete` in `analytics_funnel_events` | First `timer_session_complete` or `hub_timer_launch_1` | Builder/timer funnel on marketing-connected flows |

When Firebase is not configured, only the Supabase block appears. On Firestore errors, an amber warning is shown and Supabase rows are still displayed.

## Bucket design

Buckets use **elapsed time** (ms) from anchor to first key action — not calendar days:

1. **< 15 minutes**
2. **15 min – 1 hour**
3. **1 – 24 hours**
4. **1 – 7 days**
5. **7+ days**
6. **Never** (no qualifying key action observed)

## Hub key-action catalog

Actions that count as the first key action (excludes noisy signals like `app:open`):

- `workout:generate`
- `workout:start`
- `workout:complete`
- `workout:save`
- `workout:share`
- `profile:onboarding_complete`

Defined in `TTFKA_HUB_KEY_ACTIONS` in [ttfka-hub.ts](../src/lib/firebase/ttfka-hub.ts).

## Marketing key events

- Anchor: `account_signup_complete` (Supabase `user_id`)
- Key action: first of `timer_session_complete`, `hub_timer_launch_1` in `analytics_funnel_events`

## Implementation

- **Lib:** [ttfka-hub.ts](../src/lib/firebase/ttfka-hub.ts) — Auth list for signup anchors; paginated Firestore scan of `user_activity_logs` for first key action per UID.
- **API:** `GET /api/admin/analytics/auth-funnel` returns `ttfkaDistributionMarketing` (always) and `ttfkaDistributionHub` when Firebase is configured.
- **UI:** Two labeled subsections under Time to first key action: "Hub (Firestore)" and "Marketing & timer (Supabase)".

## Relationship to Feature adoption

- **Feature adoption** = event volume (7d/30d counts per action).
- **TTFKA** = latency distribution from a defined start (signup) to first qualifying action.

Complementary metrics; different streams use appropriate anchors and key actions per identity source.
