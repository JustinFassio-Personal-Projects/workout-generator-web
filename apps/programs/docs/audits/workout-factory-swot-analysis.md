# Workout Factory — SWOT Analysis

**Date:** 2025-03-06  
**Scope:** Workout Factory in `apps/programs` admin  
**Purpose:** Assess current state to inform migration to admin-dash-astro (feature/workout-factory-migration)

---

## Executive Summary

The Workout Factory lets admins create and manage AI-generated workout sets (splits, two-a-days, HIIT) via a config form, a 4-step AI chain, and a library table. It lives in `apps/programs`, uses Supabase (`workout_sets`), and has strong documentation. It is a candidate for migration to admin-dash-astro following the Program Factory pattern.

---

## Architecture Overview

| Layer      | Component                                       | Notes                                                                   |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| **Views**  | `ManageWorkouts`, `WorkoutEditor`               | Library + edit page                                                     |
| **Modal**  | `WorkoutGeneratorModal`                         | Config → Generate → Preview (config/preview steps)                      |
| **Table**  | `WorkoutLibraryTable`                           | List, filter, publish, delete, edit                                     |
| **API**    | `api/admin/workouts/index.ts`, `[workoutId].ts` | CRUD for workout sets                                                   |
| **AI**     | `api/ai/generate-workout-chain`                 | 4-step chain: Architect → Biomechanist → Coach → Mathematician          |
| **Data**   | `workout_sets` (Supabase)                       | JSONB config, workouts, chain_metadata                                  |
| **Client** | `workout-persistence.ts`                        | saveWorkoutToLibrary, fetchWorkoutLibrary, updateWorkout, deleteWorkout |

---

## Strengths

| Strength                   | Detail                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Documented AI pipeline** | Full spec in `docs/features/workouts/generate-workout-modal-and-prompt.md` — persona mapping, prompt builders, validation per step |
| **4-step AI chain**        | Clear separation: Architect (structure) → Biomechanist (patterns) → Coach (exercises) → Mathematician (sets/reps or timer schema)  |
| **Dual mode support**      | Standard (sets/reps/RPE) and HIIT (timer schema, metabolic architecture). Block options vs circuit structure.                      |
| **Supabase-backed**        | Migrated from Firestore to `workout_sets` table; RLS policies; config, chain_metadata, workouts stored in JSONB                    |
| **Persona-driven config**  | Target audience, goals, equipment (zone-based), medical context, split type, lifestyle, preferred focus                            |
| **Library UX**             | Filter (all/draft/published), publish/unpublish, delete, edit, loading/error states                                                |
| **Chain metadata**         | Step 1–4 outputs and timestamps stored for audit/debug; useful for regeneration and analytics                                      |
| **Shared types**           | `@/types/ai-workout` (WorkoutConfig, WorkoutSetTemplate, WorkoutChainMetadata, etc.) used across modal, API, persistence           |
| **Consistent pattern**     | Mirrors Program Factory (ManagePrograms, generator modal, library table) — reusable migration playbook                             |

---

## Weaknesses

| Weakness                              | Detail                                                                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit flow confusion**               | `WorkoutLibraryTable` Edit links to `/admin/workouts/:id` → `WorkoutEditor`. `WorkoutEditor` uses `workout-details.ts` and reads from `workouts` table (trainer roster), not `workout_sets`. Factory sets may fail to load in editor or load wrong data. |
| **Two workout concepts**              | `workout_sets` (Factory) vs `workouts` (trainer roster, program scheduling). Shared route `/admin/workouts/:id` but different tables; risk of mixed usage.                                                                                               |
| **No “Regenerate with AI” from list** | ManageWorkouts only opens modal for new workout. “Regenerate with AI” for existing sets requires opening the edit page; no inline action in the table.                                                                                                   |
| **ManageWorkouts does not wire Edit** | `WorkoutLibraryTable` receives no `onEdit`; Edit uses `Link to={item.id}`. ManageWorkouts never passes `editingWorkout`, `editingWorkoutConfig`, etc. for edit mode, so “Regenerate with AI” from the library is effectively unavailable.                |
| **Heavy modal**                       | `WorkoutGeneratorModal` ~1,400 lines; config, HIIT mode, blocks, equipment, medical, buildPersona, save/update logic. High cognitive load for changes.                                                                                                   |
| **Dev-only error fallback**           | `fetchWorkoutLibrary` returns `[]` on error in API; errors are logged but client sees empty list instead of explicit error.                                                                                                                              |
| **No batch operations**               | No bulk publish/unpublish, export, or duplicate.                                                                                                                                                                                                         |

---

## Opportunities

| Opportunity                                     | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single hub for workout creation and editing** | Today, Program Factory offers "Edit with AI" — 100% AI-driven, no granular editing. The migrated Workout Factory can become the **single robust location** for all workout workflows: admins create standalone workout sets (not tied to a program) _or_ open Program Factory–generated workouts and edit them there. Seamless integration with Edit Program: clicking "Edit workout" from a program schedule opens that workout in Workout Factory (AI regenerate + granular edits). Simplifies the codebase, reduces duplicate flows, and gives admins one place to create, refine, and publish workouts. |
| **Migrate to admin-dash-astro**                 | FEATURES.md lists Workout Factory as post–Program Factory; same pattern (library, modal, API). Reuse auth, navigation, layout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Unify edit experience**                       | Add a dedicated editor for workout sets (config + sessions) that uses `workout_sets` and API. Support both standalone workouts and program-embedded workouts; route by resource type so Edit Program can deep-link into Workout Factory.                                                                                                                                                                                                                                                                                                                                                                    |
| **Regenerate from table**                       | Add “Regenerate with AI” action in `WorkoutLibraryTable` that opens `WorkoutGeneratorModal` with `editingWorkout`, `editingWorkoutConfig`, `editingWorkoutId`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Structured testing**                          | Modal and chain are complex; add unit/integration tests for buildPersona, step validators, and API contract.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Template/presets**                            | Save config presets (e.g. “Upper/Lower Intermediate”) to speed up creation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Public consumption**                          | `workout_set_service.ts` and `/workouts` already serve published sets; can expand usage in app, programs, challenges.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## Threats

| Threat                         | Detail                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth divergence**            | programs uses `profiles.role === 'admin'`; admin-dash-astro uses `admin_users`. Migration must resolve auth before or during Workout Factory migration.                   |
| **Dependency lift**            | Workout Factory needs Vertex AI, prompt-chain libs, equipment/zones. admin-dash-astro currently has no AI routes; migration adds Vertex/Gemini and related deps.          |
| **Data model drift**           | If `workout_sets` schema or `WorkoutConfig` changes without migration docs, programs and admin-dash-astro could diverge.                                                  |
| **Program Factory dependency** | FEATURES.md suggests Programs → Workouts migration order. If Program Factory migration is delayed, Workout Factory migration may wait or proceed without shared patterns. |
| **Dual table complexity**      | `workout_sets` vs `workouts`; ScheduleBuilder links to `/admin/workouts/:id` for trainer workouts. Route sharing can confuse developers and users.                        |

---

## Recommendations for Migration

1. **Fix edit flow** — Ensure Workout Factory Edit uses `workout_sets` API and a set-specific editor (or a unified editor that branches on resource type).
2. **Wire Regenerate** — Pass `onEdit` from ManageWorkouts to WorkoutLibraryTable and open WorkoutGeneratorModal in edit mode.
3. **Migrate after auth and Program Factory** — Align auth and Program Factory patterns first; reuse migration playbook for Workout Factory.
4. **Document data model** — Clarify `workout_sets` vs `workouts` in DEPLOYMENT/README; consider naming or routing to reduce confusion.
5. **Preserve spec** — Carry `generate-workout-modal-and-prompt.md` into admin-dash-astro or a shared docs location.

---

## File Reference

| Area    | Files                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Views   | `ManageWorkouts.tsx`, `WorkoutEditor.tsx`                                                                                  |
| Modal   | `WorkoutGeneratorModal.tsx`                                                                                                |
| Table   | `WorkoutLibraryTable.tsx`                                                                                                  |
| API     | `api/admin/workouts/index.ts`, `[workoutId].ts`, `api/ai/generate-workout-chain.ts`                                        |
| Data    | `lib/supabase/admin/workout-sets.ts`, `client/workout-persistence.ts`                                                      |
| Prompts | `lib/prompt-chain/step1-workout-architect.ts`, `step2-biomechanist.ts`, `step3-coach.ts`, `step4-workout-mathematician.ts` |
| Types   | `types/ai-workout.ts`                                                                                                      |
| Spec    | `docs/features/workouts/generate-workout-modal-and-prompt.md`                                                              |
