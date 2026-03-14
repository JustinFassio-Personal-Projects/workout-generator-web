# Visualization Lab — SWOT Analysis

**Date:** 2026-03-14  
**Scope:** Visualization Lab (Exercise Image Generator) in `apps/admin-dash-astro`  
**Purpose:** Assess the migrated version relative to `apps/programs` to identify strengths, weaknesses, opportunities, and threats.  
**Context:** The Lab was migrated from programs and improved during migration; this analysis evaluates the current state.

---

## Executive Summary

The Visualization Lab enables admins to generate AI exercise images and biomechanical instructions via a research → image pipeline. It lives at `/exercise-image-gen`, uses Supabase for persistence, and integrates with ManageExercises and AdminExerciseDetail. The migrated version in admin-dash-astro has gained security and infra improvements (Supabase-only, owner-scoped storage, trimmed URLs) but has **regressed on edit-by-slug**—the "Edit in Visualization Lab" link does not load the existing exercise.

---

## Architecture Overview

| Layer      | Component                                       | Notes                                                                   |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| **View**   | `ExerciseImageGenerator`                        | Form, templates, reference image, generate → preview → save             |
| **Hook**   | `useVisualizationLab`                           | Form state, reference image, generation logic                           |
| **Modal**  | `ExerciseVisualizationLabModal` (WOD Engine)    | Inline generation for WOD exercises (programs; may be in admin-dash)    |
| **API**    | `/api/generate-exercise-image`, `/api/load-reference-image` | Gemini research + image generation; reference image proxy |
| **Data**   | `generated_exercises`, `exercise_images`        | Supabase tables; `exercise-images` storage bucket                       |
| **Client** | `generated-exercises.ts`, `exercise-gallery.ts`, `storage.ts` | CRUD, upload, add image to gallery                         |

---

## Strengths

| Strength                       | Detail                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase-native**            | No Firebase/Firestore; full migration to Supabase (auth, storage, Postgres). Same project as programs for shared data.                |
| **Owner-scoped storage**       | `exercise-images` bucket policies include `owner_id = auth.uid()::text`; admins can only upload/update/delete their own objects.      |
| **Security hardening**         | Trimmed URL in load-reference-image proxy to avoid allowlist/parsing issues; fail-fast on promoteToPrimary insert before delete.      |
| **Reset on slug exit**         | `useVisualizationLab` reset effect when `topicKey` goes undefined prevents form sticking when navigating from `/exercise-image-gen?slug=foo` to `/exercise-image-gen`. |
| **Templates & presets**        | Save/load form presets in localStorage; demographics presets; reduces repeat configuration.                                           |
| **Rich generation pipeline**   | Research step (biomechanics, sources) → optional prompt review → image(s); single or 3-image sequence.                                 |
| **Integration with exercises** | ManageExercises links to Lab; AdminExerciseDetail has "Edit in Visualization Lab" CTA. Post-save "View Exercise (Admin)" links to detail. |
| **Documentation**              | `SUPABASE_VISUALIZATION_LAB.md`, `SUPABASE_VISUALIZATION_LAB_SETUP.sql` (idempotent), `PRE_MERGE_REPORT_VIZ_LAB_AND_AI_INSTRUCTIONS.md`. |
| **Tutorial Lab co-location**   | Tutorial Lab (tutorial_config, voice cues) lives alongside Viz Lab in admin-dash-astro; shared exercise data model.                    |
| **Broader admin surface**      | admin-dash-astro includes Blog, Deep Research, Tutorial Lab; Viz Lab is part of a richer admin experience.                             |

---

## Weaknesses

| Weakness                              | Detail                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit-by-slug not implemented**      | AdminExerciseDetail links to `/exercise-image-gen?slug=foo`, but ExerciseImageGenerator does **not** read `slug` from URL or load the exercise. programs has `useSearchParams`, `getGeneratedExerciseBySlug`, `editingExercise`, and `initialExercise`; admin-dash-astro lacks these. The link is effectively dead. |
| **useVisualizationLab missing initialExercise** | programs `useVisualizationLab` supports `initialExercise` to pre-fill topic, visualStyle, complexityLevel; admin-dash-astro's hook does not. |
| **No update flow for existing exercises** | When editing, programs calls `updateGeneratedExercise` and reuses slug; admin-dash-astro only creates new exercises, never updates. |
| **Two places to add/regenerate images** | Add Image and Regenerate modals in AdminExerciseDetail vs Lab; no single canonical "edit in Lab" flow as recommended in ADMIN_EXERCISES_AND_VIZ_LAB_REVIEW. |
| **Heavy component**                   | `ExerciseImageGenerator` ~900+ lines; form, templates, preview, download, save, and result display in one file.                        |
| **Library tab mixed types**           | Exercise Library merges manual + generated; only generated link to detail. Manual exercises have no equivalent "Edit in Lab" path.     |

---

## Opportunities

| Opportunity                                | Detail                                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Port edit-by-slug from programs**         | Copy slug-from-URL, `editingExercise` state, `getGeneratedExerciseBySlug` fetch, and `initialExercise`/`topicKey` wiring from programs. Add `updateGeneratedExercise` path when saving in edit mode. Low–medium effort; high impact. |
| **Extend useVisualizationLab**              | Add `initialExercise?: InitialExerciseForLab` to admin-dash-astro's hook (programs already has this).                                   |
| **Single hub for image generation**         | Make Lab the canonical place for create and edit; "Add variant in Lab" from detail could deep-link with slug; reduce modal duplication. |
| **Batch / bulk operations**                 | Generate multiple exercises from a list; batch approve from ManageExercises.                                                            |
| **Public consumption**                     | `generated_exercises` with `status = 'approved'` already powers public exercise pages; can expand usage in programs, challenges, WOD.   |
| **Template sharing**                       | Templates are localStorage-only; could persist to Supabase for team-wide presets.                                                       |

---

## Threats

| Threat                          | Detail                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema drift**                | `generated_exercises`, `exercise_images`, and bucket must stay in sync between programs and admin-dash-astro. Both use same Supabase project; migrations in programs affect admin-dash. |
| **Auth divergence**             | admin-dash-astro uses `admin_users`; programs may use `profiles.role`. If projects diverge, admin access could break.                  |
| **Gemini API dependency**       | Image generation depends on `GEMINI_API_KEY`; rate limits or model changes could impact workflow.                                      |
| **Regressive UX**               | "Edit in Visualization Lab" suggests edit mode exists; users may be confused when form does not pre-fill. Erodes trust in the Lab.     |

---

## Recommendations

1. **Implement edit-by-slug** — Port from programs: `useSearchParams`, fetch by slug, `editingExercise`, `initialExercise`/`topicKey` in `useVisualizationLab`, and `updateGeneratedExercise` on save when editing.
2. **Align useVisualizationLab with programs** — Add `initialExercise` and `InitialExerciseForLab` so the Lab can pre-fill from existing exercise data.
3. **Preserve existing improvements** — Keep owner-scoped storage, trimmed URLs, reset-on-slug-exit, and Supabase-only stack.
4. **Clarify docs** — Note in ADMIN_EXERCISES_AND_VIZ_LAB_REVIEW or a migration doc that edit-by-slug is implemented in programs but not yet in admin-dash-astro.

---

## File Reference

| Area       | Files                                                                 |
| ---------- | --------------------------------------------------------------------- |
| View       | `src/components/ExerciseImageGenerator.tsx`                           |
| Hook       | `src/hooks/useVisualizationLab.ts`                                    |
| Types      | `src/lib/visualization-lab/types.ts`, `preview-payload.ts`, `export.ts`, `templates.ts`, `demographics-presets.ts` |
| API        | `src/pages/api/generate-exercise-image.ts`, `src/pages/api/load-reference-image.ts` |
| Client     | `src/lib/supabase/client/generated-exercises.ts`, `exercise-gallery.ts`, `storage.ts` |
| Docs       | `docs/SUPABASE_VISUALIZATION_LAB.md`, `docs/SUPABASE_VISUALIZATION_LAB_SETUP.sql`, `docs/PRE_MERGE_REPORT_VIZ_LAB_AND_AI_INSTRUCTIONS.md` |
| Detail     | `src/components/react/admin/AdminExerciseDetail.tsx` (links to Lab)   |
| Manage     | `src/components/react/admin/views/ManageExercises.tsx`                |

---

## Comparison: programs vs admin-dash-astro

| Feature                     | programs | admin-dash-astro |
| --------------------------- | -------- | ----------------- |
| Edit-by-slug (load exercise) | ✅       | ❌                |
| initialExercise in hook     | ✅       | ❌                |
| updateGeneratedExercise     | ✅       | ❌                |
| Supabase-only               | ✅       | ✅                |
| Owner-scoped storage        | ✅       | ✅                |
| Trimmed URL (proxy)         | ?        | ✅                |
| promoteToPrimary fail-fast  | ?        | ✅                |
| Reset on slug exit          | ✅       | ✅                |
| Tutorial Lab                | ❌       | ✅                |
