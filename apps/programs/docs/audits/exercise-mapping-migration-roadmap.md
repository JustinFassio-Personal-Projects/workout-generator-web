# Phased Roadmap: Exercise Mapping Migration (Programs → Admin-Dash-Astro)

**Branch:** `update/mapping-exercises-to-workouts`  
**Date:** 2025-03-06  
**Purpose:** Migrate exercise mapping logic to admin-dash-astro as the source of truth; enable auto-mapping of AI-generated workout exercises to approved exercises; ensure full exercise pages link to Additional Tactical Data.

---

## Current State Summary

### Programs App (Consumer)

- **Resolution:** `approved-exercise-maps.ts` builds `exerciseMap`, `extendedMap`, `slugMap` from `getGeneratedExercises('approved')`
- **Usage:** AppIslands (WODs), ActiveProgramView, ProgramSalesView, ActiveChallengeView, ChallengeSalesView
- **Resolution order:** WOD override → approved map (normalized name) → warmup block → `getExerciseDetails()` (placeholder)
- **Placeholder:** `src/data/exercises.ts` returns generic Unsplash images + generic instructions when no match
- **Public pages:** `/exercises`, `/exercises/[slug]`, `/exercises/[slug]/learn` — served by programs
- **Admin:** ExerciseMapPickerModal, ExerciseSwapModal, ProgramBlueprintEditor (exerciseQuery mapping)

### Admin-Dash-Astro (Management)

- **Visualization Lab:** ExerciseImageGenerator — creates exercises in `generated_exercises`
- **ManageExercises:** Library (manual + generated), Generated tab, Manually Added
- **AdminExerciseDetail:** Approve, add images, deep dive, videos
- **ExerciseMapPickerModal:** Map block to approved exercise (exerciseQuery)
- **approved-exercise-maps.ts:** Duplicated from programs
- **Shared Supabase:** Same `generated_exercises`, `exercise_images`, `exercises` tables

### Key Gap

AI-generated workouts (Workout Factory, Program Factory) store **exercise names only**. No automatic mapping to approved exercises. Matching is done at **display time** by normalized name; unmapped exercises fall back to placeholder.

---

## Phase 1: Shared Exercise Mapping Package (Foundation)

**Goal:** Extract exercise mapping logic to a shared package so both apps use identical resolution rules.

### 1.1 Create `packages/exercise-mapping`

- Move `approved-exercise-maps.ts` → `packages/exercise-mapping/src/approved-maps.ts`
- Add types: `Exercise`, `ExtendedBiomechanics`, `GeneratedExercise` (or import from shared types)
- Export: `normalizeExerciseName`, `buildApprovedExerciseMaps`, `ApprovedExerciseMaps`
- Publish as `@workout-generator/exercise-mapping` (or `workspace:*`)

### 1.2 Add Public API for Approved Exercises

- **Option A:** Shared Supabase client in package (both apps use same project)
- **Option B:** Admin-dash exposes `/api/admin/exercises/approved` (GET) — returns approved list; programs fetches on mount
- **Option C:** Keep `getGeneratedExercises('approved')` in each app’s Supabase client; package only provides mapping logic

**Recommendation:** Option C for Phase 1 — minimal change. Package has no data fetching; apps pass `GeneratedExercise[]` to `buildApprovedExerciseMaps`.

### 1.3 Migrate Both Apps to Package

- programs: replace local `approved-exercise-maps` import with `@workout-generator/exercise-mapping`
- admin-dash-astro: same
- Remove duplicate `approved-exercise-maps.ts` from both apps

### 1.4 Deliverables

- [ ] `packages/exercise-mapping` with `buildApprovedExerciseMaps`, `normalizeExerciseName`
- [ ] programs and admin-dash-astro depend on package
- [ ] No behavior change; tests pass

---

## Phase 2: Admin API for Approved Exercise Lookup

**Goal:** Centralize approved exercise data behind an admin API so programs can optionally fetch from a single source.

### 2.1 Admin API: GET /api/admin/exercises/approved

- **Location:** admin-dash-astro
- **Auth:** Verify admin (or public read for approved-only)
- **Response:** JSON array of approved `GeneratedExercise` (or minimal shape: id, slug, exerciseName, imageUrl, biomechanics, etc.)
- **Use case:** Programs can fetch this instead of direct Supabase if we want admin to own the “published” contract

### 2.2 Programs: Optional API Consumer

- Add `fetchApprovedExercisesFromAdmin()` that calls `PUBLIC_ADMIN_URL/api/admin/exercises/approved` (or equivalent)
- Fallback: keep `getGeneratedExercises('approved')` if API unreachable (e.g. local dev)
- **Note:** Programs and admin share same Supabase project; direct Supabase may remain simpler. API useful if we need admin-specific filtering, caching, or rate limiting.

### 2.3 Deliverables

- [ ] `GET /api/admin/exercises/approved` returns approved list
- [ ] Optional programs integration (can defer to Phase 3 if API not yet needed)

---

## Phase 3: Auto-Map Workout Exercises on Generation

**Goal:** When a workout or program is generated, automatically link exercise names to approved exercises where names match.

### 3.1 Workout Factory (Admin-Dash)

- **Trigger:** After Step 4 (Workout Mathematician) returns workouts
- **Action:** For each `exerciseName` in exercise blocks, run `normalizeExerciseName` and check against approved map
- **Storage:** Persist `exerciseOverrides` or `exerciseQueryMap` when match found:
  - `exerciseOverrides[exerciseName] = { imageUrl, instructions }` from approved, OR
  - `exerciseQueryMap` with `exerciseName` → approved `exerciseName` (for slug lookup)
- **Schema:** `workout_sets.workouts` is JSONB; add optional `exerciseOverrides` or `exerciseMappings` at set or workout level

### 3.2 Program Factory (Admin-Dash)

- **Trigger:** After program schedule is built (weeks → workouts → blocks)
- **Action:** For each block exercise, match by normalized name; if match, set `exerciseQuery` to approved `exerciseName` (or store mapping)
- **Storage:** Program schedule already supports `exerciseQuery` per block; populate it when match exists

### 3.3 Matching Strategy

- **Exact:** `normalizeExerciseName(generated) === normalizeExerciseName(approved)`
- **Future:** Fuzzy match (Levenshtein, synonyms) — Phase 4 or later

### 3.4 Deliverables

- [ ] Workout Factory: post-generation step that enriches workouts with approved exercise data where names match
- [ ] Program Factory: post-generation step that sets `exerciseQuery` on blocks where names match
- [ ] Existing manual mapping (ExerciseMapPickerModal, ExerciseSwapModal) unchanged

---

## Phase 4: Visualization Lab → Workout Mapping

**Goal:** When an admin generates an exercise in the Visualization Lab, surface it for mapping into existing workouts.

### 4.1 “Map to Workouts” from AdminExerciseDetail

- **UI:** In AdminExerciseDetail (or ManageExercises card), add action: “Map to workouts”
- **Behavior:** Search workout_sets and program schedules for blocks with matching `exerciseName` (normalized)
- **Result:** List of workouts/programs using that name; allow bulk “apply mapping” to set `exerciseOverrides` or `exerciseQuery`

### 4.2 “Suggest mappings” on Viz Lab approval

- When an exercise moves from `pending` → `approved`, optionally run background job or show banner: “This exercise name appears in X workouts. Map now?”
- Links to mapping UI

### 4.3 Deliverables

- [ ] AdminExerciseDetail: “Map to workouts” or “Find usages” action
- [ ] List view of workouts/programs with matching exercise names
- [ ] One-click apply mapping

---

## Phase 5: Full Exercise Page ↔ Additional Tactical Data

**Goal:** Ensure the full exercise page (`/exercises/[slug]`) and the workout modal’s “Additional Tactical Data” stay in sync and linked.

### 5.1 Current State

- **ExerciseDetailModal:** “Additional Tactical Data” shows Biomechanical Chain, Pivot Points, Stabilization Needs, Common Mistakes (from `extendedBiomechanics`)
- **“View full page”** links to `/exercises/${slug}` when exercise resolved from approved map
- **GeneratedExerciseDetail** (full page): Iceberg layout with Performance Cues, Common Mistakes, biomechanics, deep dive link

### 5.2 Consistency

- Ensure `extendedBiomechanics` in approved map matches what’s on full page
- Full page should have clear “Additional Tactical Data” section or link that matches modal content
- **Action:** Audit GeneratedExerciseDetail; add explicit “Additional Tactical Data” section or collapsible if not present

### 5.3 “View full page” for All Mapped Exercises

- When workout exercise is resolved from approved map, `exerciseSlug` is set → “View full page” appears
- When resolved from placeholder, no slug → no link (unchanged)
- **Check:** Ensure Workout Factory / Program Factory mappings populate slug path correctly

### 5.4 Deliverables

- [ ] Full page and modal share same “Additional Tactical Data” structure
- [ ] “View full page” appears for all exercises resolved from approved map
- [ ] Docs updated

---

## Phase 6: Consolidate Admin as Source of Truth (Optional)

**Goal:** Make admin-dash-astro the single place for exercise creation, approval, and mapping configuration.

### 6.1 Move Exercise Management Fully to Admin

- Programs retains: public display, resolution logic (from package), public routes
- Admin owns: generated_exercises CRUD, approval workflow, mapping UI, Viz Lab
- Programs has no admin exercise routes; all admin exercise flows live in admin-dash

### 6.2 Redirects / Links

- Any `/admin/exercises` in programs → redirect to admin-dash-astro equivalent
- Deep links from programs admin (if any) updated to admin-dash URLs

### 6.3 Deliverables

- [ ] All exercise admin UI in admin-dash-astro
- [ ] Programs admin navigation updated/redirected
- [ ] No duplicated admin exercise screens

---

## Dependency Graph

```
Phase 1 (shared package)
    ↓
Phase 2 (API - optional)
    ↓
Phase 3 (auto-map on generation) ← depends on Phase 1
Phase 4 (Viz Lab → workout mapping) ← can run parallel with Phase 3
Phase 5 (full page ↔ tactical data) ← minimal, can run anytime
Phase 6 (consolidate admin) ← after Phase 3, 4 stable
```

---

## Risk & Rollback

- **Phase 1:** Low risk. Package extraction; both apps keep same behavior.
- **Phase 3:** Medium. Schema change for `exerciseOverrides`/mappings. Backfill optional; new generations benefit first.
- **Phase 4:** Low. Additive UI; no breaking changes.
- **Rollback:** Phase 1 revert = restore local `approved-exercise-maps` in both apps. Phase 3 = stop running mapping step; existing data unchanged.

---

## References

- [ADMIN_EXERCISES_AND_VIZ_LAB_REVIEW.md](../features/exercises/ADMIN_EXERCISES_AND_VIZ_LAB_REVIEW.md) — current admin exercise setup
- [ExerciseDetailModal.md](../components/modals/workout-detail-modal/exercise-detail-modal/ExerciseDetailModal.md)
- [workout-factory-migration-blueprint.md](./workout-factory-migration-blueprint.md)
- [approved-exercise-maps.ts](../../src/lib/approved-exercise-maps.ts) — logic to extract (programs; admin-dash has copy)
