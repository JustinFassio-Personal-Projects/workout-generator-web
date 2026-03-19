# Retention Cohorts — Optional Rollups (Future)

**Status:** Documented only. Not implemented in this repo.  
**See also:** [RETENTION_COHORTS_FIREBASE_DESIGN.md](./RETENTION_COHORTS_FIREBASE_DESIGN.md) §7, [FIRESTORE_INDEXES_RETENTION.md](./FIRESTORE_INDEXES_RETENTION.md)

---

## Motivation

At scale, repeated full-window reads of `user_activity_logs` for retention cohort computation can become costly. Each admin dashboard load triggers Firestore queries over the union of all cohort periods in the view. As user count and activity volume grow, read costs increase linearly with time range and cohort count.

**Current behavior (P0–P2):** The admin reads raw `user_activity_logs` documents within a time-bounded window, filters by qualifying actions in memory, and builds the cohort matrix. This works well for moderate scale.

---

## Proposed Rollup Shape

Pre-aggregate activity at ingest or on a schedule so the admin can read compact summary documents instead of scanning raw logs.

### Option A: Period-keyed rollups

- **Collection:** `retention_rollups/{granularity}/{periodKey}`
  - `granularity`: `week` or `day`
  - `periodKey`: `YYYY-MM-DD` (Monday for weekly; calendar day for daily)
- **Document fields:**
  - `periodKey`: string
  - `activeUserIds`: array of UIDs (or a more compact representation if user count is very large)
  - `activeDefinition`: `session` | `workout` (separate docs or embedded)
  - `updatedAt`: timestamp

Admin would read only the rollup docs for the periods in view and reconstruct the matrix without scanning raw logs.

### Option B: Weekly snapshot documents

- **Collection:** `retention_rollups/weekly`
- One document per week with pre-computed `Set<uid>` per active definition.
- Admin reads a small number of docs (e.g. 12–52) per request.

---

## Admin Switch (Future)

When rollups are implemented, the admin can support two data sources via environment:

| Env var | Values | Behavior |
|---------|--------|----------|
| `RETENTION_DATA_SOURCE` | `firestore` (default) \| `rollup` | If `rollup`, read from `retention_rollups/*` instead of `user_activity_logs`. |

---

## Cloud Function (Future Implementation)

A scheduled Cloud Function could:

1. Run daily (or on a configurable schedule)
2. Query `user_activity_logs` for the previous day/week
3. Filter by qualifying actions (`session` vs `workout` sets)
4. Write or merge into `retention_rollups/{granularity}/{periodKey}`

**Index implications:** If the rollup function queries by `action` + `timestamp`, see [FIRESTORE_INDEXES_RETENTION.md](./FIRESTORE_INDEXES_RETENTION.md) for composite index requirements.

---

## Migration Path

1. Implement Cloud Function to populate rollups (out of scope for P2).
2. Add `RETENTION_DATA_SOURCE=rollup` support in `retention-cohorts.ts` to read from rollup collection when set.
3. Deprecate raw-log path for high-traffic deployments; keep as fallback for small installs.
