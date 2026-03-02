# Phase 1 App-Side Events Spec

**Audience:** App team (app.aiworkoutgenerator.com)  
**Purpose:** Implement conversion events that occur in the app for the Reverse Trial funnel.  
**Context:** See [REVERSE_TRIAL_ROADMAP.md](REVERSE_TRIAL_ROADMAP.md) Phase 1.

---

## Event Schema

Use the same canonical event names so PostHog funnels and dashboards work across landing site and app. Identify users with `posthog.identify(userId)` so events join with signup and onboarding.

| Event                  | When to Fire                                       | Props |
| ---------------------- | -------------------------------------------------- | ----- |
| `Workout_Generated`    | AI generates a workout for an authenticated user   | `user_id`, `workout_id`, `equipment_count`, `goal` |
| `Set_Logged`           | User logs reps/weight for a set                     | `user_id`, `workout_id`, `exercise_id`, `sets_logged`, `time_since_app_open_sec` (for time-to-first-logged-set) |
| `Workout_Completed`    | User completes all programmed sets in a session     | `user_id`, `workout_id`, `workout_number` (1st, 2nd, 3rd in last 10 days for Rule of Three) |
| `Adaptation_Requested` | User asks AI to swap an exercise                    | `user_id`, `reason` (e.g. fatigue, equipment) |
| `paywall_viewed`       | Paywall is shown to the user                        | `user_id`, `trigger` (e.g. workout_limit, trial_ended) |

---

## Workout_Generated

- **When:** After the app’s AI successfully generates a workout for the logged-in user.
- **Props:**
  - `user_id` (string)
  - `workout_id` (string)
  - `equipment_count` (number) or `equipment_categories` (string[])
  - `goal` (string)

---

## Set_Logged

- **When:** User saves reps/weight for a set (or equivalent log action).
- **Props:**
  - `user_id`
  - `workout_id`
  - `exercise_id` (or exercise key)
  - `sets_logged` (number)
  - `time_since_app_open_sec` (number) — seconds from app open/session start to this log. Used for “time to first logged set” (Day 1 retention).

**Implementation note:** Store `app_opened_at` (or session start) when the user opens the app; compute `time_since_app_open_sec` when the first set is logged.

---

## Workout_Completed

- **When:** User completes all programmed sets in a session (workout marked complete).
- **Props:**
  - `user_id`
  - `workout_id`
  - `workout_number` (number) — e.g. 1, 2, 3 for “workouts completed in last 10 days” to support Rule of Three.

**Rule of Three:** Users with ≥3 `Workout_Completed` events within 10 days of signup are 400% more likely to subscribe. Optionally send a derived event `rule_of_three_achieved` when the 3rd workout in 10 days is completed.

---

## Adaptation_Requested

- **When:** User requests an exercise swap or adaptation (e.g. due to fatigue, equipment, or injury).
- **Props:**
  - `user_id`
  - `reason` (string, e.g. `fatigue`, `equipment`, `injury`)

---

## paywall_viewed

- **When:** The paywall is shown (e.g. when user hits 5-workout limit, or when trial ends in later phases).
- **Props:**
  - `user_id`
  - `trigger` (string, e.g. `workout_limit`, `trial_ended`, `feature_gate`)

---

## PostHog Integration

- Use the same PostHog project as the landing site so funnels are end-to-end.
- Call `posthog.identify(userId)` after login/signup so app events attach to the same person as `user_signed_up` and `Onboarding_Complete`.
- Set person properties where useful (e.g. `subscription_tier`, `signup_date`) for cohort filtering.

---

## Baseline Funnel (PostHog)

Once app events are implemented, the funnel can be:

1. `Onboarding_Complete` (landing)
2. `user_signed_up` (landing/app)
3. `Workout_Generated` (app)
4. `Workout_Completed` (app)
5. `paywall_viewed` (app) and/or `subscription_purchase_initiated` (landing/app)

Additional insights:

- **Rule of Three:** % of signups with ≥3 `Workout_Completed` in first 10 days.
- **Time to first logged set:** Distribution of `time_since_app_open_sec` on first `Set_Logged` (target: many under 15 minutes for Day 1 retention).
