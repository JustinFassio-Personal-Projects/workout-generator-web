# Monetization Candidates — Admin Analytics Section

**Status:** Implemented (Phase 1: Firestore + Auth only)  
**Position:** Between Retention & Cohorts and Monetization in Analytics tab

---

## Intent

Surface a short list of **Firebase UIDs** who show high-intent product behavior (workout engagement, multi-day activity) but are still pre-paid. Use this list to look up users in your separate admin app for outreach. Ties Retention → Monetization: workflow KPIs into conversion pipeline.

---

## Identity Bridge (Firebase UID ↔ Supabase)

**Current state:** No proven join exists between Firebase Auth UID (used in Firestore `user_activity_logs`) and Supabase `profiles.id` (UUID from Supabase Auth). The hub uses Firebase; monetization analytics uses Supabase `profiles` (purchased_index, trial_ends_at).

**Phase 1:** Candidates are built from Firestore + Firebase Auth only. Paid/trial filtering is **not** applied. All high-intent users in the segment window are shown.

**Phase 1b (future):** If your shared DB has a mapping column (e.g. `profiles.firebase_uid` or `users.external_id`), add a filter to exclude `purchased_index > 0` and optionally `trial_ends_at > now`. Document the column and update `getMonetizationCandidates` to accept an optional paid-UID set.

---

## Segments

| Segment | Rule |
|---------|------|
| **New signups** | Signup in last N days (default 14); workout depth in that window (≥ min workout events or distinct workout days) |
| **Return / reactivation** | Account older than X days; activity in last Y days (default 7) with workout engagement — “came back” |

---

## Data Sources

- **Firestore `user_activity_logs`** — same collection and index as Retention. Per-UID aggregates: workout events, session events, distinct days in the **segment** window, last activity in that window, and **total active days** over a longer lookback.
- **Firebase Auth** — `listUsers` for `creationTime` (signup age).

### Total active days

**Total active** counts **distinct UTC calendar days** on which the user has **at least one** row in `user_activity_logs` (any `action`). It is **not** derived from Auth logins or session length: logging twice on the same day still counts as **one** active day; activity on March 16 and March 18 counts as **two**.

Default lookback is **365 days** (query param `totalActiveLookbackDays`, min 7, max 730). One Firestore scan covers both the segment window (eligibility) and the lookback window (total active).

### Display name

Loaded from Firestore **`user_profiles`** (document ID = Firebase UID): `display_name`, or `first_name` + `last_name`. Override collection with `FIREBASE_USER_PROFILES_COLLECTION`.

---

## Privacy

Admin-only. Do not add email to the UI; UID + copy is sufficient for lookup in your other admin app.
