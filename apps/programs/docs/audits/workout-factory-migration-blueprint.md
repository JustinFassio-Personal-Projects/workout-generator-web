# Workout Factory Migration Blueprint

**Date:** 2025-03-06  
**Branch:** feature/workout-factory-migration  
**Source:** [workout-factory-swot-analysis.md](./workout-factory-swot-analysis.md)  
**Target:** admin-dash-astro

---

## Progress Summary

| Phase                             | Status      | Completed                                                                                                                  |
| --------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0: Foundation**           | Done        | RUN_WORKOUT_SETS_SCHEMA.sql, WORKOUT_DATA_MODEL.md; gates (Program Factory, auth, workout_sets table) verified or provided |
| Phase 1: API and Data Layer       | Completed   | —                                                                                                                          |
| Phase 2: Views and Modal          | Completed   | —                                                                                                                          |
| Phase 3: Edit Flow and Regenerate | Completed   | —                                                                                                                          |
| Phase 4: Edit Program Integration | Not started | —                                                                                                                          |
| Phase 5: Polish and Documentation | Not started | —                                                                                                                          |

---

## 1. Vision and Goals

### 1.1 Vision

The migrated Workout Factory becomes the **single hub** for all workout creation and editing in the admin. Admins can:

- **Create standalone workout sets** (splits, two-a-days, HIIT) not tied to any program.
- **Open Program Factory–generated workouts** and edit them in Workout Factory (AI regenerate + granular edits).
- **Edit Program** deep-links into Workout Factory: clicking "Edit workout" from a program schedule opens that workout in Workout Factory.

This replaces Program Factory's current "Edit with AI" (100% AI-driven, no granular editing) with a unified flow that supports both AI regeneration and manual refinement.

### 1.2 Goals

| Goal                            | Success Criteria                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Migrate to admin-dash-astro** | Workout Factory runs in admin-dash-astro; uses `verifyAdminRequest`, same nav/layout as Program Factory.                                                     |
| **Fix edit flow**               | Edit uses `workout_sets` API; dedicated WorkoutSetEditor for `workout_sets`; no confusion with `workouts` (trainer roster).                                  |
| **Wire Regenerate**             | "Regenerate with AI" from WorkoutLibraryTable opens WorkoutGeneratorModal in edit mode with `editingWorkout`, `editingWorkoutConfig`, `editingWorkoutId`.    |
| **Integrate with Edit Program** | Edit Program can deep-link to Workout Factory with a workout set ID or program-embedded workout context; Workout Factory loads and saves back appropriately. |
| **Minimize threats**            | Auth aligned; data model documented; dual table (`workout_sets` vs `workouts`) clearly explained and routed.                                                 |

---

## 2. Prerequisites (Threat Mitigation)

### 2.1 Auth (Threat: Auth divergence)

- **Dependency:** Program Factory migration must be complete so admin-dash-astro uses `admin_users` and `verifyAdminRequest`.
- **Action:** All Workout Factory API routes use `verifyAdminRequest` from `admin-dash-astro/src/lib/supabase/admin/auth.ts`. No `profiles.role` checks.
- **Documentation:** Ensure admins exist in `admin_users`; sync with `profiles` if both apps share the same Supabase project.

### 2.2 AI Infrastructure (Threat: Dependency lift)

- **Dependency:** Program Factory migration adds Vertex AI (or Gemini), prompt-chain libs, equipment/zones. Workout Factory reuses them.
- **Action:** Copy `api/ai/generate-workout-chain` and its prompt-chain steps only; no new AI infra beyond what Program Factory introduces.
- **Env:** `GEMINI_API_KEY`, `GOOGLE_PROJECT_ID` (or equivalent) already set for Program Factory.

### 2.3 Program Factory (Threat: Program Factory dependency)

- **Dependency:** Program Factory migration must be complete. Workout Factory follows the same playbook (library table, generator modal, API, persistence).
- **Action:** Migrate Workout Factory **after** Program Factory. Reuse patterns: ManagePrograms → ManageWorkouts, ProgramLibraryTable → WorkoutLibraryTable, ProgramGeneratorModal → WorkoutGeneratorModal.

### 2.4 Data Model Clarity (Threat: Dual table complexity; Data model drift)

- **Documentation:** **Done.** `WORKOUT_DATA_MODEL.md` created at [admin-dash-astro/docs/WORKOUT_DATA_MODEL.md](../../admin-dash-astro/docs/WORKOUT_DATA_MODEL.md). It documents:
  - **`workout_sets`** — Workout Factory: AI-generated workout sets (multi-session). Stored in `workout_sets`. API: `api/admin/workouts/*`.
  - **`workouts`** — Trainer roster / program scheduling: single-session workouts tied to programs. Stored in `workouts`. Used by ScheduleBuilder, ProgramBlueprintEditor.
- **Routing:** Use distinct routes:
  - `/admin/workouts` — Workout Factory library (ManageWorkouts).
  - `/admin/workouts/sets/:id` — Workout set editor (WorkoutSetEditor, `workout_sets`).
  - If trainer `workouts` are edited elsewhere, avoid sharing `/admin/workouts/:id` for both.
- **Types:** Maintain `types/ai-workout.ts` as source of truth; copy or symlink into admin-dash-astro. Document `WorkoutSetTemplate`, `WorkoutConfig`, `WorkoutChainMetadata`.

---

## 3. Migration Phases

### Phase 0: Foundation (Pre-Workout Factory)

| Task                                    | Status | Notes                                                                                                                                                          |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Program Factory migration complete      | Gate   | Verify ManagePrograms, api/admin/programs, routes exist before Phase 1                                                                                         |
| `workout_sets` table exists in Supabase | Setup  | Run [RUN_WORKOUT_SETS_SCHEMA.sql](../../admin-dash-astro/docs/RUN_WORKOUT_SETS_SCHEMA.sql) in Supabase SQL Editor if missing (idempotent)                      |
| Auth: `verifyAdminRequest` in use       | Done   | [auth.ts](../../admin-dash-astro/src/lib/supabase/admin/auth.ts)                                                                                               |
| RUN_WORKOUT_SETS_SCHEMA.sql created     | Done   | [admin-dash-astro/docs/RUN_WORKOUT_SETS_SCHEMA.sql](../../admin-dash-astro/docs/RUN_WORKOUT_SETS_SCHEMA.sql)                                                   |
| WORKOUT_DATA_MODEL.md created           | Done   | [admin-dash-astro/docs/WORKOUT_DATA_MODEL.md](../../admin-dash-astro/docs/WORKOUT_DATA_MODEL.md) — clarifies `workout_sets` vs `workouts`, routing, setup, RLS |

### Phase 1: API and Data Layer

| Task                                                       | Source   | Target           | Notes                                                                                 |
| ---------------------------------------------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------- |
| Copy `api/admin/workouts/index.ts`                         | programs | admin-dash-astro | GET list, POST create; use `verifyAdminRequest`                                       |
| Copy `api/admin/workouts/[workoutId].ts`                   | programs | admin-dash-astro | GET, PATCH, DELETE; use `verifyAdminRequest`                                          |
| Copy `api/ai/generate-workout-chain.ts`                    | programs | admin-dash-astro | Single AI route                                                                       |
| Copy prompt-chain steps                                    | programs | admin-dash-astro | step1-workout-architect, step2-biomechanist, step3-coach, step4-workout-mathematician |
| Copy `lib/supabase/admin/workout-sets.ts`                  | programs | admin-dash-astro | Supabase persistence for workout_sets                                                 |
| Copy `lib/supabase/client/workout-persistence.ts`          | programs | admin-dash-astro | Client API calls; adapt base URL if needed                                            |
| Copy `types/ai-workout.ts`                                 | programs | admin-dash-astro | Shared types                                                                          |
| Copy `lib/program-schedule-utils.ts` (normalizeWorkoutSet) | programs | admin-dash-astro | If not already present from Program Factory                                           |
| Copy `lib/hiit-workout-data.ts`                            | programs | admin-dash-astro | isHIITWorkout, workoutInSetToHIITWorkoutData                                          |

### Phase 2: Views and Modal

| Task                                 | Source   | Target           | Notes                                                                                                                                                                                                                                               |
| ------------------------------------ | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy `ManageWorkouts.tsx`            | programs | admin-dash-astro | Adapt imports, use admin-dash-astro layout                                                                                                                                                                                                          |
| Copy `WorkoutLibraryTable.tsx`       | programs | admin-dash-astro | Wire `onEdit` (see Phase 3)                                                                                                                                                                                                                         |
| Copy `WorkoutGeneratorModal.tsx`     | programs | admin-dash-astro | Heavy; adapt imports, equipment/zones client                                                                                                                                                                                                        |
| Create `WorkoutSetEditor.tsx`        | New      | admin-dash-astro | Dedicated editor for `workout_sets`; uses fetchWorkoutDocument, updateWorkout. **Does not** use workout-details.ts (workouts table). Supports: view/edit metadata, sessions, blocks; "Regenerate with AI" opens WorkoutGeneratorModal in edit mode. |
| Add route `/admin/workouts`          | —        | admin-dash-astro | ManageWorkouts                                                                                                                                                                                                                                      |
| Add route `/admin/workouts/sets/:id` | —        | admin-dash-astro | WorkoutSetEditor                                                                                                                                                                                                                                    |
| Add nav item "Workout Factory"       | —        | admin-dash-astro | Existing nav entry; point to `/admin/workouts`                                                                                                                                                                                                      |

### Phase 3: Edit Flow and Regenerate (Opportunities)

| Task                                      | Detail                                                                                                                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wire Regenerate**                       | ManageWorkouts passes `onEdit` to WorkoutLibraryTable. `onEdit(workoutId)` fetches workout document, sets `editingWorkout`, `editingWorkoutConfig`, `editingWorkoutId`, `editingChainMetadata`, opens WorkoutGeneratorModal in edit mode. |
| **Edit links to WorkoutSetEditor**        | WorkoutLibraryTable "Edit" links to `/admin/workouts/sets/:id` (WorkoutSetEditor), not a generic `/admin/workouts/:id`.                                                                                                                   |
| **WorkoutSetEditor "Regenerate with AI"** | Button opens WorkoutGeneratorModal with `editingWorkout`, `editingWorkoutConfig`, `editingWorkoutId`. On save, calls updateWorkout; refreshes editor.                                                                                     |

### Phase 4: Edit Program Integration (Opportunity: Single hub)

| Task                              | Detail                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deep-link from Program Editor** | In ProgramBlueprintEditor (or equivalent), "Edit workout" for a program-embedded workout opens Workout Factory. Options: (A) If workout is already a `workout_sets` ref, link to `/admin/workouts/sets/:id`. (B) If embedded in program content only, "Extract to Workout Factory" creates a new workout set from that content and opens it; or open WorkoutGeneratorModal with that content as seed. |
| **Save back to program**          | When editing a workout that came from a program, WorkoutSetEditor can offer "Save back to program" to update the program's schedule content. Requires Program persistence API support.                                                                                                                                                                                                                |
| **Unify "Edit with AI"**          | Remove or redirect Program Factory "Edit with AI" to open Workout Factory (WorkoutGeneratorModal or WorkoutSetEditor). Single location for AI-driven workout editing.                                                                                                                                                                                                                                 |

### Phase 5: Polish and Documentation

| Task                            | Detail                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Preserve spec**               | Copy or link `generate-workout-modal-and-prompt.md` into admin-dash-astro docs.                                            |
| **Error handling**              | API `fetchWorkoutLibrary` on error: return 500 with message instead of `[]` when appropriate; client shows explicit error. |
| **Template/presets** (optional) | Save config presets for faster creation; lower priority.                                                                   |

---

## 4. File Mapping

| programs                                               | admin-dash-astro                                      |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `src/components/react/admin/views/ManageWorkouts.tsx`  | `src/components/admin/views/ManageWorkouts.tsx`       |
| `src/components/react/admin/WorkoutLibraryTable.tsx`   | `src/components/admin/WorkoutLibraryTable.tsx`        |
| `src/components/react/admin/WorkoutGeneratorModal.tsx` | `src/components/admin/WorkoutGeneratorModal.tsx`      |
| (New) WorkoutSetEditor                                 | `src/components/admin/views/WorkoutSetEditor.tsx`     |
| `src/pages/api/admin/workouts/index.ts`                | `src/pages/api/admin/workouts/index.ts`               |
| `src/pages/api/admin/workouts/[workoutId].ts`          | `src/pages/api/admin/workouts/[workoutId].ts`         |
| `src/pages/api/ai/generate-workout-chain.ts`           | `src/pages/api/ai/generate-workout-chain.ts`          |
| `src/lib/prompt-chain/step1-workout-architect.ts`      | `src/lib/prompt-chain/step1-workout-architect.ts`     |
| `src/lib/prompt-chain/step2-biomechanist.ts`           | `src/lib/prompt-chain/step2-biomechanist.ts`          |
| `src/lib/prompt-chain/step3-coach.ts`                  | `src/lib/prompt-chain/step3-coach.ts`                 |
| `src/lib/prompt-chain/step4-workout-mathematician.ts`  | `src/lib/prompt-chain/step4-workout-mathematician.ts` |
| `src/lib/supabase/admin/workout-sets.ts`               | `src/lib/supabase/admin/workout-sets.ts`              |
| `src/lib/supabase/client/workout-persistence.ts`       | `src/lib/supabase/client/workout-persistence.ts`      |
| `src/types/ai-workout.ts`                              | `src/types/ai-workout.ts`                             |
| `src/lib/hiit-workout-data.ts`                         | `src/lib/hiit-workout-data.ts`                        |

---

## 5. Risk Register

| Risk                                     | Mitigation                                                                                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WorkoutEditor (workouts table) confusion | Use distinct route `/admin/workouts/sets/:id` for Workout Factory; document in WORKOUT_DATA_MODEL.md. Do not migrate programs' WorkoutEditor (trainer workouts) unless ScheduleBuilder is also migrated. |
| Modal size / complexity                  | WorkoutGeneratorModal stays as-is for Phase 2; refactor in a later pass if needed.                                                                                                                       |
| Program-embedded workout identity        | Programs store workouts inline in schedule content. Define contract: workout set ID in program content vs embedded JSON. Phase 4 may require program schema or API changes.                              |
| Shared Supabase project                  | Both programs and admin-dash-astro use same `workout_sets` table. No migration of data; same RLS. Ensure `author_id` matches admin users.                                                                |

---

## 6. Acceptance Criteria

- [ ] Admin can open Workout Factory in admin-dash-astro and see workout library.
- [ ] Admin can create a new workout set via "Generate Workout" (config → AI chain → preview → save).
- [ ] Admin can edit an existing workout set via "Edit" → WorkoutSetEditor.
- [ ] Admin can "Regenerate with AI" from WorkoutSetEditor or from table (modal opens in edit mode).
- [ ] Admin can publish/unpublish and delete workout sets.
- [ ] Edit Program (when implemented) can deep-link to Workout Factory for a workout.
- [x] `workout_sets` vs `workouts` is documented; routes are unambiguous (WORKOUT_DATA_MODEL.md).
- [ ] All Workout Factory APIs use `verifyAdminRequest`.

---

## 7. References

- [workout-factory-swot-analysis.md](./workout-factory-swot-analysis.md)
- [WORKOUT_GENERATOR_SPEC.md](../../admin-dash-astro/docs/WORKOUT_GENERATOR_SPEC.md) (admin-dash-astro copy of generate-workout-modal-and-prompt spec)
- [PROGRAM_FACTORY_MIGRATION_AUDIT.md](../../admin-dash-astro/docs/PROGRAM_FACTORY_MIGRATION_AUDIT.md)
- [FEATURES.md](../../admin-dash-astro/FEATURES.md)
- [WORKOUT_DATA_MODEL.md](../../admin-dash-astro/docs/WORKOUT_DATA_MODEL.md) — data model and setup (Phase 0)
- [RUN_WORKOUT_SETS_SCHEMA.sql](../../admin-dash-astro/docs/RUN_WORKOUT_SETS_SCHEMA.sql) — idempotent `workout_sets` DDL (Phase 0)
