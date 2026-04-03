# Firestore Indexes for Retention & Cohorts

The Retention & Cohorts feature queries the `user_activity_logs` collection (or the collection named by `FIREBASE_USER_ACTIVITY_COLLECTION`) with a time-bounded query.

## Current Query Shape

```
where('timestamp', '>=', start)
where('timestamp', '<=', end)
orderBy('timestamp')
```

Firestore typically serves this with the **single-field** index on `timestamp`, which is created automatically for simple range queries. No manual index is usually required.

### Live hub users (admin dashboard home)

`GET /api/admin/hub/live-users` reads recent rows for the **Live** card (default activity window: **since midnight `America/Los_Angeles` through now**, not a 5-minute rolling slice):

```text
where('timestamp', '>=', fromTs)
orderBy('timestamp', 'desc')
limit(scanLimit)
```

`fromTs` is either the start of the current Pacific calendar day or `now - minutes` when `window=rolling`. This uses the **automatic single-field index** on `timestamp` (same idea as the retention time window above). No extra composite is declared in [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json) for this query. If Firestore ever returns a missing-index error for this shape, use the console link from the error or confirm the project matches admin’s `FIREBASE_SERVICE_ACCOUNT_KEY` (see troubleshooting below).

### Live hub users — presence (v2 heartbeat)

`GET /api/admin/hub/live-users?source=presence` reads the `user_presence` collection (or `FIREBASE_USER_PRESENCE_COLLECTION`):

```text
where('last_seen_at', '>=', fromTs)
orderBy('last_seen_at', 'desc')
limit(scanLimit)
```

This typically uses the **automatic single-field index** on `last_seen_at`. If Firestore returns a missing-index error, use the console link from the error or confirm project alignment (same as above).

## Firebase Console

To view or create indexes:

1. Open [Firebase Console](https://console.firebase.google.com/) → your hub project
2. Go to **Firestore Database** → **Indexes**
3. URL pattern: `https://console.firebase.google.com/project/<PROJECT_ID>/firestore/indexes`

If Firestore returns an error mentioning a missing index, the error message will include a direct link to create the required index.

## When a Composite Index Is Required

If the query is extended in the future (e.g. adding a server-side filter on `action`):

```text
where('action', 'in', ['app:open', 'app:session_start'])
where('timestamp', '>=', start)
where('timestamp', '<=', end)
orderBy('timestamp')
```

Firestore would require a **composite index** on:

- Collection: `user_activity_logs` (or your configured collection)
- Fields: `action` (Ascending), `timestamp` (Ascending)

Create this in Firebase Console → Firestore → Indexes → Add index, or follow the link in the error message when the query runs.

## Workout journey drill-down (admin)

The hub logs optional top-level `workout_attempt_id` on `user_activity_logs`. Admin APIs may query:

```text
where('workout_attempt_id', '==', id)
orderBy('timestamp', 'asc')
```

Composite index (also declared in [`apps/aiworkoutgenerator-hub/firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json)):

- `workout_attempt_id` (Ascending), `timestamp` (Ascending)

### Generation funnel timeline (admin)

The hub logs optional top-level `generation_id` on `user_activity_logs` to correlate **generate → open → start → complete** when the user continues from a fresh generation in the same tab. Admin APIs query:

```text
where('generation_id', '==', id)
orderBy('timestamp', 'asc')
```

Composite index (declared in the same hub [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json)):

- `generation_id` (Ascending), `timestamp` (Ascending)

### Session-scoped timeline (admin, Phase 4)

When logs include top-level `session_id`, admin **activity journey** can load all rows for one session (oldest first):

```text
where('session_id', '==', id)
orderBy('timestamp', 'asc')
```

Composite index (declared in hub [`firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json)):

- `session_id` (Ascending), `timestamp` (Ascending)

Deploy these indexes to the **hub** Firebase project using the same command as above (`firebase deploy --only firestore:indexes` from `apps/aiworkoutgenerator-hub`).

To list recent `workout:start` rows for exploration:

```text
where('action', '==', 'workout:start')
orderBy('timestamp', 'desc')
```

Composite index: `action` (Ascending), `timestamp` (Descending).

### Deploying these indexes (operators)

Indexes are declared in the hub app at [`apps/aiworkoutgenerator-hub/firestore.indexes.json`](../../aiworkoutgenerator-hub/firestore.indexes.json). Push them to the **hub** Firebase project (the one that receives `user_activity_logs`):

```bash
cd apps/aiworkoutgenerator-hub
firebase login   # or firebase login:ci for CI
firebase deploy --only firestore:indexes
```

Until indexes finish building in the console, admin **Workout journey** list/timeline requests may fail with a Firestore index error.

### Troubleshooting: “The query requires an index” / `FAILED_PRECONDITION`

Firestore does **not** require deploying “tables.” `user_activity_logs` is a collection; documents appear when the hub writes them. What you must deploy for admin list and timeline APIs are **composite indexes** (declared in the hub repo file above).

1. **Confirm project alignment:** Admin’s `FIREBASE_SERVICE_ACCOUNT_KEY` must be for the **same** Firebase project that stores `user_activity_logs` (default hub project: `ai-workout-generator-hub` per [`apps/aiworkoutgenerator-hub/.firebaserc`](../../aiworkoutgenerator-hub/.firebaserc)). A wrong project or missing **Cloud Datastore User** on the service account can look like query failures; the canonical index error includes a **Create index** link scoped to the project Firestore chose for the query.
2. **Create the missing composite:** Open the URL from the Firestore error (it pre-fills collection group `user_activity_logs` and field order). Typical engagement/journey queries need:
   - **Recent rows by action:** `action` (Ascending) + `timestamp` (Descending)
   - **Attempt timeline:** `workout_attempt_id` (Ascending) + `timestamp` (Ascending)
   - **Generation timeline:** `generation_id` (Ascending) + `timestamp` (Ascending)
   - **Session timeline:** `session_id` (Ascending) + `timestamp` (Ascending)
3. **Deploy from repo (preferred):** After `firebase login --reauth` (or `firebase login:ci` in CI), run `firebase deploy --only firestore:indexes` from `apps/aiworkoutgenerator-hub` so all declared composites stay in sync. If the CLI reports invalid credentials, re-authentication is required on that machine; neither the Firebase MCP nor deploy will succeed until then.

### Phase 0 manual QA (player-attempt journeys)

1. **Hub:** From each player (guided, written desktop, written mobile), start a workout and complete once; in Firestore `user_activity_logs`, confirm `workout:open`, `workout:start`, and `workout:complete` share the same `workout_attempt_id` where applicable.
2. **Admin:** Analytics → Engagement → **Workout started** counts move after new traffic; click the **Workout started** row (or use **Browse journeys**) to scroll to the explorer; **View journey** shows an ordered timeline for a chosen attempt id.

## IAM

The service account (`FIREBASE_SERVICE_ACCOUNT_KEY`) needs **Cloud Datastore User** (or Firebase Admin) to read from `user_activity_logs`.
