# Workout Data Model (admin-dash-astro)

This document clarifies the two distinct workout concepts in the admin system: **workout_sets** (Workout Factory) and **workouts** (trainer roster / program scheduling). Understanding the difference avoids routing and data-model confusion.

---

## Overview

| Concept | Table | Purpose |
|---------|-------|---------|
| **Workout Factory sets** | `workout_sets` | AI-generated multi-session workout sets (splits, two-a-days, HIIT) |
| **Trainer roster / program scheduling** | `workouts` | Single-session workouts tied to programs; used by ScheduleBuilder and ProgramBlueprintEditor |

These are separate tables and flows. Workout Factory operates only on `workout_sets`.

---

## workout_sets (Workout Factory)

- **What:** AI-generated workout sets with one or more sessions per set (e.g. Upper/Lower split, 4-day PPL).
- **Table:** `workout_sets`
- **API:** `api/admin/workouts/index.ts` (GET list, POST create), `api/admin/workouts/[workoutId].ts` (GET one, PATCH, DELETE)
- **Routes:** `/admin/workouts` (library), `/admin/workouts/sets/:id` (editor)
- **Key types:** `WorkoutSetTemplate`, `WorkoutConfig`, `WorkoutChainMetadata` from `types/ai-workout.ts`

### Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | text | NOT NULL |
| `description` | text | |
| `author_id` | uuid | FK to auth.users; NOT NULL |
| `status` | text | `draft` \| `published`; default `draft` |
| `config` | jsonb | WorkoutConfig (persona, goals, equipment, etc.) |
| `chain_metadata` | jsonb | AI chain outputs (step 1–4, timestamps) |
| `workouts` | jsonb | Array of WorkoutInSet; NOT NULL, default `[]` |
| `workout_count` | integer | NOT NULL, default 0 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## workouts (trainer roster / program scheduling)

- **What:** Single-session workouts tied to programs. Used when building program schedules (weeks → workouts).
- **Table:** `workouts` (different schema: `trainer_id`, `program_id`, `blocks`, etc.)
- **Used by:** ScheduleBuilder, ProgramBlueprintEditor
- **Route:** If edited in admin, use a route **distinct** from `/admin/workouts/sets/:id` to avoid confusion (e.g. program-specific editor paths).

---

## Setup

If the Workout Factory shows 404 or errors on `/rest/v1/workout_sets`, the `workout_sets` table may not exist. Run the idempotent migration:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → select your project → **SQL Editor**.
2. Open **`apps/admin-dash-astro/docs/RUN_WORKOUT_SETS_SCHEMA.sql`** in this repo.
3. Copy the entire file contents, paste into the SQL Editor, click **Run**.

Safe to run multiple times. Then refresh the Workout Factory page.

---

## RLS (workout_sets)

| Policy | Effect |
|--------|--------|
| **Authors can manage own workout_sets** | `auth.uid() = author_id` — authors can INSERT, UPDATE, DELETE their own rows |
| **Anyone can read published workout_sets** | `status = 'published'` — public SELECT for published sets |

---

## Related docs

- [WORKOUT_GENERATOR_SPEC.md](./WORKOUT_GENERATOR_SPEC.md) — Full spec for the Generate Workout modal and 4-step AI prompt chain.

## Future work

- **Config presets:** Save/load config presets (e.g. "Upper/Lower Intermediate") to speed up workout creation. Lower priority; similar patterns exist in Visualization Lab.

## References

- [workout-factory-migration-blueprint.md](../../apps/programs/docs/audits/workout-factory-migration-blueprint.md)
- [workout-factory-swot-analysis.md](../../apps/programs/docs/audits/workout-factory-swot-analysis.md)
