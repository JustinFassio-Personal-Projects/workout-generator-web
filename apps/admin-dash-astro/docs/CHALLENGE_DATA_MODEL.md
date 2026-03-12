# Challenge Data Model (admin-dash-astro)

This document describes the Challenge Factory data model: **challenges** (master document) and **challenge_weeks** (schedule content). Challenge Factory creates and manages 2–6 week fitness challenges with themes, milestones, and AI-generated schedules.

**Schema reference:** [CHALLENGE_SCHEMA_REFERENCE.md](./CHALLENGE_SCHEMA_REFERENCE.md) — canonical columns, JSONB shapes, indexes, RLS, TypeScript mapping.

---

## Overview

| Concept | Table | Purpose |
|---------|-------|---------|
| **Challenge** | `challenges` | Master document: title, description, config, chain_metadata, hero/section images |
| **Challenge weeks** | `challenge_weeks` | Week-by-week schedule content (workouts per week) |

---

## challenges (Challenge Factory)

- **What:** 2–6 week fitness challenges with themes, milestones, and AI-generated schedules.
- **Table:** `challenges`
- **API:** `api/admin/challenges/index.ts` (GET list, POST create), `api/admin/challenges/[challengeId].ts` (GET, PUT, PATCH, DELETE), `api/admin/challenges/[challengeId]/images` (POST upload, DELETE)
- **Routes:** `/admin/challenges` (library), `/admin/challenges/:id` (editor)
- **Key types:** `ChallengeTemplate`, `ChallengeConfig`, `ChallengeLibraryItem` from `types/ai-challenge.ts`

### Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | text | NOT NULL |
| `description` | text | |
| `author_id` | uuid | FK to auth.users; NOT NULL |
| `status` | text | `draft` \| `published`; default `draft` |
| `config` | jsonb | Difficulty, durationWeeks, theme, tagline, milestones, targetAudience, equipmentProfile, goals |
| `chain_metadata` | jsonb | AI chain outputs (step 1–4, timestamps) |
| `hero_image_url` | text | Hero image URL (Supabase Storage) |
| `section_images` | jsonb | `{"1":"url","2":"url",...}` for section slots 1–5 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### config JSONB shape

- `difficulty`: `'beginner'` \| `'intermediate'` \| `'advanced'`
- `durationWeeks`: number (2–6)
- `theme`: string (e.g. "Strength Builder", "Fat Loss")
- `tagline`: string
- `milestones`: `{ week: number; label: string }[]`
- `targetAudience`: `{ ageRange, sex, weight, experienceLevel }`
- `equipmentProfile`: `{ zoneId, equipmentIds }` (optional)
- `goals`: `{ primary, secondary }`

---

## challenge_weeks

- **What:** Week-by-week schedule for a challenge. Each row = one week.
- **Table:** `challenge_weeks`
- **Content:** `content` JSONB holds `{ workouts: [...] }` — array of workout blocks for that week.

### content JSONB shape

- `content.workouts`: Array of workout blocks; structure matches `ProgramSchedule['workouts']` from `types/ai-program.ts` (title, description, exerciseBlocks, warmupBlocks, etc.).
- Weeks are assembled into `ChallengeTemplate.schedule` (one `ProgramSchedule` per week).

### Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `challenge_id` | uuid | FK to challenges; NOT NULL |
| `week_number` | integer | NOT NULL; UNIQUE with challenge_id |
| `content` | jsonb | `{ workouts: [...] }` |
| `created_at` | timestamptz | |

---

## Image Slots and Storage

- **Slots:** `hero`, `1`, `2`, `3`, `4`, `5` (hero + 5 section slots). Defined in `lib/challenge-image-slots.ts` as `CHALLENGE_IMAGE_SLOTS` and `CHALLENGE_IMAGE_SLOTS_WITH_LABELS`.
- **Storage path:** `challenges/{challengeId}/images/{slot}.{ext}` (e.g. `challenges/abc123/images/hero.png`)
- **Bucket:** `exercise-images` (same bucket as Visualization Lab and generated exercises)

Ensure the `exercise-images` bucket exists. If not, run [SUPABASE_VISUALIZATION_LAB_SETUP.sql](./SUPABASE_VISUALIZATION_LAB_SETUP.sql) or programs migrations. Server-side uploads use `uploadBufferToStorage` with service role, which bypasses storage RLS.

---

## Setup

If the Challenge Factory shows errors on challenge list/fetch, the tables may not exist. Run the idempotent migration:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → select your project → **SQL Editor**.
2. Open **`apps/admin-dash-astro/docs/RUN_CHALLENGES_SCHEMA.sql`** in this repo.
3. Copy the entire file contents, paste into the SQL Editor, click **Run**.

Safe to run multiple times.

---

## RLS

| Table | Policy | Effect |
|-------|--------|--------|
| **challenges** | Authors can manage own challenges | `auth.uid() = author_id` — authors can INSERT, UPDATE, DELETE their own rows |
| **challenge_weeks** | Authors can manage challenge_weeks | EXISTS on challenges where `author_id = auth.uid()` — authors manage weeks for their own challenges |

---

## Prerequisite Gates (Phase 0)

Before Phase 1 migration:

- **Program Factory:** ManagePrograms, api/admin/programs
- **Workout Factory:** ManageWorkouts, api/admin/workouts; `api/ai/generate-workout-chain` (if Workout Factory uses it)
- **Auth:** `verifyAdminRequest` in `src/lib/supabase/admin/auth.ts`

---

## Prompt Chain

The Challenge Factory uses a 4-step AI chain:

- **Step 1 (Challenge Architect):** [lib/prompt-chain/step1-challenge-architect.ts](../src/lib/prompt-chain/step1-challenge-architect.ts) — challenge-specific; produces structure and milestones.
- **Steps 2–4 (Biomechanist, Coach, Mathematician):** Shared with Program and Workout Factory — [lib/prompt-chain](../src/lib/prompt-chain).

AI generation can run 30–60 seconds. On upstream timeout, the UI shows: "Request timed out. Generation often takes 30–60 seconds. Please try again."

Challenge AI generation requires Vercel serverless functions with sufficient `maxDuration` (300s recommended). Configure via the adapter in `astro.config.mjs`.

---

## References

- [CHALLENGE_SCHEMA_REFERENCE.md](./CHALLENGE_SCHEMA_REFERENCE.md) — canonical schema (columns, JSONB, indexes, RLS)
- [challenge-factory-migration-roadmap.md](../../programs/docs/audits/challenge-factory-migration-roadmap.md)
- [RUN_CHALLENGES_SCHEMA.sql](./RUN_CHALLENGES_SCHEMA.sql)
