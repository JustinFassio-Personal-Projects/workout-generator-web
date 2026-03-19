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

## IAM

The service account (`FIREBASE_SERVICE_ACCOUNT_KEY`) needs **Cloud Datastore User** (or Firebase Admin) to read from `user_activity_logs`.
