# Pre-Merge Report — Visualization Lab Migration, AI User Instructions & Tutorial Lab PR

**Date:** 2026-03-07  
**Role:** Senior Lead Engineer (Final PR Gatekeeper)  
**Scope:** GitHub Copilot comments (already applied), code quality scrub, anti-slop check, security/env/build verification. Includes **Tutorial Lab** feature (TutorialTemplate, TutorialLabView, ConfigBuilder, InstructionModal, JointOverlay, voice cues, performance-summary API).

---

## Phase 1: Triage & Execution Summary

Review applied the Decision Matrix (Critical → Performance → Style). All previously identified Copilot comments were already addressed in prior commits. This pass performed a final scan for slop, env safety, dead code, and hallucinated APIs across both Viz Lab and **Tutorial Lab** scope.

---

## Fixed (Already Applied in Prior Commits)

| Item | Location | Action |
|------|----------|--------|
| **Reset on slug exit** | `apps/programs/src/hooks/useVisualizationLab.ts` | Reset effect runs when `topicKey` goes undefined (e.g. navigate from `/exercise-image-gen?slug=foo` to `/exercise-image-gen`) so the form is not stuck on the previous exercise. |
| **Trimmed URL in proxy** | `apps/admin-dash-astro/src/pages/api/load-reference-image.ts` | Use `const trimmed = (imageUrl ?? '').trim()` and use `trimmed` consistently for emptiness check, `isAllowedUrl()`, and `fetch()` to avoid allowlist/parsing issues from whitespace. |
| **Owner-scoped storage policies** | `apps/admin-dash-astro/docs/SUPABASE_VISUALIZATION_LAB_SETUP.sql` | INSERT/SELECT/UPDATE/DELETE policies for `exercise-images` bucket now include `AND owner_id = auth.uid()::text` (matches apps/programs 00061/00062). |
| **Storage doc accuracy** | `apps/admin-dash-astro/docs/SUPABASE_VISUALIZATION_LAB.md` | Doc states that Option C's script implements owner-scoped policies matching 00061/00062. |
| **promoteToPrimary error handling** | `apps/admin-dash-astro/src/lib/supabase/client/exercise-gallery.ts` | Capture `{ error: insertError }` from `exercise_images` insert; throw on insert failure before delete/update to avoid inconsistent state. |

---

## Slop Scrubbed

| Category | Detail |
|----------|--------|
| **Redundant comments** | None removed. Existing comments in PR scope document non-obvious behavior (e.g. reset effect when topicKey goes undefined, owner-scoped policies, fail-fast on insert). No "// set name to string"–style slop found. |
| **Dead code** | None. No placeholder logic, unused variables, or redundant try/catch in PR-touched files. |
| **Commented-out blocks** | None in PR scope. |

---

## Tutorial Lab (this PR) — Verification

- **Client safety:** No `import.meta.env`, `process`, `fs`, or `path` in `src/features/TutorialLab/`. All env/Node usage is in API routes or `lib/gemini-server.ts` (server-only).
- **Admin APIs:** `performance-summary` and `generate-tutorial` are POST-only, use `verifyAdminRequest`; callers use `credentials: 'include'` (TutorialTemplate, TutorialLabView).
- **Imports:** `createPoseLandmarker`, `detectLandmarks`, `angleAtJoint`, `getAnglesForCriteria`, `formatCriterionTarget`, `getWrongPoseCue`, `truncateForTTS`, `useVoiceCues`, `ExerciseConfig`, `ParsedBiomechanicsContext`, `LANDMARK_INDEX_TO_LABEL` — all exist and are used correctly. No hallucinated APIs.
- **Comments:** InstructionModal NOTE (focus-trap removal) and JointOverlay/angleCalculations doc comments are purposeful; no redundant "obvious" comments removed.
- **TODO/FIXME/dead code:** None in Tutorial Lab files.

---

## Verification Performed

- **Security / env:** `import.meta.env`: `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` used only in server/API code. `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` used in client and in API (load-reference-image allowlist); intentional. No env misuse in Frontmatter or client components.
- **Build-time safety:** No `fs`/`path`/Node in client components. `path`/`process` only in `lib/supabase/server.ts` (dotenv load). No Node APIs in React components.
- **Imports / APIs:** Verified in PR scope: `parseBiomechanicalPoints`, `transformSearchResultsToSources`, `generateSlug`, `buildSaveExercisePreview`, `addExerciseImage`, `createGeneratedExercise`, `generateUserFriendlyInstructions`, `ParsedBiomechanicsContext`, `verifyAdminRequest`, `getSupabaseServer` exist and are used correctly. No hallucinated APIs.
- **TODO/FIXME:** None in PR-touched files. "Placeholder" matches are UI `placeholder` props or intentional component descriptions (e.g. ComingSoon, DashboardHome).
- **Build:** `npm run build` (admin-dash-astro) completed successfully.

---

## Ignored / Not Applied

| Suggestion / Pattern | Reason |
|----------------------|--------|
| N/A | No new Copilot suggestions in this pass. Prior suggestions were either applied (see Fixed) or already rejected in context. |
| **Section comments in JSX** | Comments like `{/* Header */}` in AdminExerciseDetail are kept; they match existing patterns and aid navigation in long components. |

---

## Status

**READY TO MERGE**

- Critical and security-related fixes are in place (reset on slug exit, trimmed URL, owner-scoped storage, promoteToPrimary error handling).
- Tutorial Lab: admin APIs POST + credentials; no env/Node in client; all imports verified; no slop or new debt.
- No slop or new debt introduced; comments are purposeful; no dead code or hallucinated APIs.
- Env and server-only usage verified; build passes.

---

*Generated after final PR gatekeeper pass and build verification (Viz Lab + Tutorial Lab).*
