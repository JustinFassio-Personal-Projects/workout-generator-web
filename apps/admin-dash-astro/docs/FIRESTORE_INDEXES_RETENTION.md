# Firestore Indexes for Retention & Cohorts

The Retention & Cohorts feature queries the `user_activity_logs` collection (or the collection named by `FIREBASE_USER_ACTIVITY_COLLECTION`) with a time-bounded query.

## Current Query Shape

```
where('timestamp', '>=', start)
where('timestamp', '<=', end)
orderBy('timestamp')
```

Firestore typically serves this with the **single-field** index on `timestamp`, which is created automatically for simple range queries. No manual index is usually required.

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

### Phase 0 manual QA (player-attempt journeys)

1. **Hub:** From each player (guided, written desktop, written mobile), start a workout and complete once; in Firestore `user_activity_logs`, confirm `workout:open`, `workout:start`, and `workout:complete` share the same `workout_attempt_id` where applicable.
2. **Admin:** Analytics → Engagement → **Workout started** counts move after new traffic; click the **Workout started** row (or use **Browse journeys**) to scroll to the explorer; **View journey** shows an ordered timeline for a chosen attempt id.

## IAM

The service account (`FIREBASE_SERVICE_ACCOUNT_KEY`) needs **Cloud Datastore User** (or Firebase Admin) to read from `user_activity_logs`.
