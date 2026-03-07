# Program Factory Migration Audit

**Date:** 2025-03-05  
**Goal:** Determine if Program Factory is the best next migration step, or if bigger-picture foundations should come first. Create a V2-quality admin as we migrate.

---

## Setup: Programs table (fix 404)

If Program Library shows "Failed to fetch programs" and the network tab shows **404** on `/rest/v1/programs`, the Supabase project used by admin-dash-astro does not yet have the `programs` (and `program_weeks`) tables. Run the idempotent migration in **`docs/RUN_PROGRAMS_SCHEMA.sql`** in the Supabase SQL Editor for that project. After that, refresh the Program Library page.

---

## 1. Current State

### admin-dash-astro (target)

| Area | Status |
|------|--------|
| **Auth** | `admin_users` table; `verifyAdminRequest()` in `src/lib/supabase/admin/auth.ts` |
| **Routes** | Dashboard, Users, Zones implemented; Programs, Workouts, Challenges, etc. → `ComingSoon` |
| **API** | `api/admin/users`, `api/admin/users/[uid]/revoke` only |
| **AI APIs** | None |
| **Deps** | framer-motion, react-select, sonner, @workout-generator/design-system. No @dnd-kit, no Vertex/Gemini |
| **Supabase libs** | auth, statistics, client, client/equipment |

### programs (source)

| Area | Status |
|------|--------|
| **Auth** | `profiles.role === 'admin'` (different from admin-dash-astro’s `admin_users`) |
| **Program Factory** | ManagePrograms, ProgramEditor, ProgramLibraryTable, ProgramGeneratorModal, ProgramBlueprintEditor, ScheduleBuilder, etc. |
| **API** | `api/admin/programs/index.ts`, `[programId].ts`; 5 AI routes: generate-architect, generate-blueprint, generate-program, generate-program-chain, extend-program |
| **Deps** | @dnd-kit (core, sortable, utilities), @google-cloud/vertexai, @google/genai, fuse.js, recharts, etc. |

---

## 2. Program Factory Dependency Map

### Components (programs → admin-dash-astro)

| Component | Sub-dependencies | Notes |
|-----------|------------------|-------|
| **ManagePrograms** | ProgramLibraryTable, createProgram (lib) | Light; list + New Program button |
| **ProgramLibraryTable** | fetchPrograms, deleteProgram, fetchFullProgram (API), ProgramGeneratorModal | Table + Edit opens modal |
| **ProgramEditor** | ScheduleBuilder, fetchProgram, updateProgram (lib) | Full-page metadata + schedule |
| **ProgramGeneratorModal** | ProgramBlueprintEditor, BlueprintPreview, ArchitectBlueprintPreview, ChainDebugPanel, program-persistence (client) | Heavy; multi-step config → generate → preview |
| **ProgramBlueprintEditor** | @dnd-kit, ExerciseMapPickerModal, WarmupLikeBlockList, ExerciseDetailModal, getGeneratedExercises, approved-exercise-maps, validate-program-schedule, program-schedule-utils | Very heavy; drag-drop weeks/workouts/blocks |
| **ScheduleBuilder** | WeekView, workout-sets | Schedule display/edit |
| **BlueprintPreview** | — | Read-only preview |
| **ArchitectBlueprintPreview** | — | Architect step preview |
| **ChainDebugPanel** | — | Debug metadata display |

### API routes to copy

| Route | Purpose |
|-------|---------|
| `api/admin/programs/index.ts` | GET list, POST create |
| `api/admin/programs/[programId].ts` | GET one, PUT update, DELETE |
| `api/ai/generate-architect.ts` | Architect blueprint (optional two-phase) |
| `api/ai/generate-blueprint.ts` | Single-step blueprint |
| `api/ai/generate-program.ts` | Full program from config |
| `api/ai/generate-program-chain.ts` | Chain: architect → weeks |
| `api/ai/extend-program.ts` | Extend existing program |

### Libs to copy or adapt

| Lib | Used by |
|-----|---------|
| `lib/supabase/admin/programs.ts` | ManagePrograms, ProgramLibraryTable, ProgramEditor |
| `lib/supabase/admin/program-server.ts` | API routes |
| `lib/supabase/client/program-persistence.ts` | ProgramGeneratorModal (fetchFullProgram, saveProgramToLibrary, updateProgram) |
| `lib/supabase/admin/server-equipment.ts` | AI routes (zones, equipment) |
| `lib/vertex-ai-client.ts` or equivalent | AI routes |
| `lib/prompt-chain.ts` | AI routes |
| `lib/json-parser.ts` | AI routes |
| `lib/program-schedule-utils.ts` | ProgramBlueprintEditor, program-persistence |
| `lib/validate-program-schedule.ts` | ProgramBlueprintEditor |
| `lib/approved-exercise-maps.ts` | ProgramBlueprintEditor |
| `lib/supabase/client/generated-exercises.ts` | ProgramBlueprintEditor |

### Types

- `types/ai-program.ts` (ProgramTemplate, ProgramConfig, ProgramPersona, ArchitectBlueprint, etc.)
- `types/ai-workout.ts` (WorkoutSetTemplate, WorkoutConfig, etc.)
- `types/generated-exercise.ts`

---

## 3. Bigger-Picture Items to Consider

### 3.1 Auth alignment

- **admin-dash-astro** uses `admin_users` (id, role).
- **programs** uses `profiles.role === 'admin'`.

If both apps share the same Supabase project, admins must exist in the table each app checks. Options:

- **A)** Keep both: document that admins need a row in both `admin_users` and `profiles` (or a trigger/sync).
- **B)** Unify: migrate programs to `admin_users`, or admin-dash-astro to `profiles.role`.
- **C)** When copying API routes, use admin-dash-astro’s `verifyAdminRequest` (admin_users) so copied routes work with admin-dash-astro’s auth.

**Recommendation:** Use (C) for copied routes. Document that programs and admin-dash-astro can share the same Supabase project; ensure admins are in `admin_users` for admin-dash-astro.

### 3.2 AI API infrastructure

admin-dash-astro has **no** AI routes. Program Factory needs:

- Vertex AI or Gemini client
- Env: `GEMINI_API_KEY` or Vertex credentials
- 5 AI route files + shared prompt/JSON libs

**Recommendation:** Add a small “AI foundation” step before or in parallel with Program Factory: copy `vertex-ai-client` (or Gemini client), `prompt-chain`, `json-parser`, and one simple AI route to validate the setup. Then copy the program AI routes.

### 3.3 Design system

- **DESIGN_SYSTEM_ROADMAP:** admin-dash-astro has “empty Tailwind extend”; programs uses hardcoded `#0d0500`, `orange-light`, etc.
- **@workout-generator/design-system:** Both apps use it; scope is limited (tokens, base styles).

**Recommendation:** Migrate first with programs’ existing styles. In a later pass, align tokens and components per DESIGN_SYSTEM_ROADMAP for a cleaner V2.

### 3.4 Shared packages

- `packages/ui` has Button, Card.
- programs and admin-dash-astro use `@workout-generator/design-system`.

**Recommendation:** No change for Program Factory. Use existing design-system; adopt `packages/ui` later if desired.

---

## 4. Alternative Migration Orders

| Order | Pros | Cons |
|-------|------|------|
| **Programs first** (FEATURES.md) | Programs are core content; establishes schedule/workout model; Workouts and Challenges build on it | Heaviest feature; many components and AI routes |
| **Workouts first** | Simpler: ManageWorkouts, WorkoutLibraryTable, WorkoutGeneratorModal; one AI route (generate-workout-chain); no ProgramBlueprintEditor | Workouts are building blocks for programs; less “core” than programs |
| **Programs lite first** | ManagePrograms + ProgramLibraryTable + ProgramEditor (metadata only); no generator modal | Delivers list + edit quickly; add AI later | 
| **AI foundation first** | Copy Vertex/Gemini client + one AI route; validate env and prompts | Doesn’t ship a user-facing feature alone |

---

## 5. Recommendation

### 5.1 Program Factory is the right next step, with a phased approach

**Rationale:**

1. Programs are the main content surface; migrating them first sets the pattern for Workouts and Challenges.
2. Workout Factory depends on similar patterns (library table, generator modal, AI). Doing Programs first gives reusable structure.
3. A “lite then full” approach keeps early scope manageable.

### 5.2 Phased Program Factory migration

**Phase 1 — Foundation (do first)**

1. **Auth:** Confirm admin-dash-astro’s `verifyAdminRequest` is used by all new API routes.
2. **AI setup:** Copy `vertex-ai-client` (or Gemini), `prompt-chain`, `json-parser`, and `server-equipment` into admin-dash-astro. Add `GEMINI_API_KEY` / Vertex env to `.env.example`.
3. **Program CRUD API:** Copy `api/admin/programs/index.ts` and `[programId].ts`; wire to admin-dash-astro auth.
4. **Program libs:** Copy `lib/supabase/admin/programs.ts`, `program-server.ts`; add `program-persistence` client.

**Phase 2 — List + editor (no AI)**

1. Copy ManagePrograms, ProgramLibraryTable, ProgramEditor, ScheduleBuilder, BlueprintPreview (and any minimal deps).
2. Add routes: `programs`, `programs/:id`.
3. Support: list, create, edit metadata, view schedule. No generator modal yet.

**Phase 3 — AI generation**

1. Copy 5 AI routes: generate-architect, generate-blueprint, generate-program, generate-program-chain, extend-program.
2. Copy ProgramGeneratorModal, ProgramBlueprintEditor, ArchitectBlueprintPreview, ChainDebugPanel.
3. Add @dnd-kit, ExerciseMapPickerModal, WarmupLikeBlockList, and remaining libs.
4. Wire “Generate with AI” and full edit flow.

### 5.3 V2 improvements to apply during migration

| Area | Current (programs) | V2 improvement |
|------|--------------------|----------------|
| **Modal UX** | Large multi-step modal | Consider stepper or wizard with clearer progress |
| **Blueprint editor** | Dense; many nested modals | Simplify block editing; reduce modal nesting |
| **Error handling** | alert(), console.error | Use toast/sonner; structured error states |
| **Loading** | Inline spinners | Skeleton states; optimistic updates where safe |
| **Types** | Some `any` or loose types | Strict types; shared `types/` package if useful |
| **API shape** | Mixed patterns | Consistent request/response shapes; clear error codes |
| **Design tokens** | Hardcoded colors | Use design-system tokens (orange → accent, etc.) |

---

## 6. Summary

| Question | Answer |
|----------|--------|
| **Is Program Factory the best next step?** | Yes, with a phased approach. |
| **Bigger-picture items first?** | Yes: (1) Auth alignment for copied routes, (2) AI foundation (client + one route), (3) Program CRUD API. |
| **Suggested order** | Foundation → List + Editor (no AI) → AI generation. |
| **V2 opportunities** | Modal UX, blueprint editor simplification, error handling, loading states, design tokens. |

---

## 7. Next Actions

1. Add AI foundation to admin-dash-astro (Vertex/Gemini client, prompt-chain, json-parser, server-equipment).
2. Copy program CRUD API routes and adapt to admin-dash-astro auth.
3. Copy program libs (programs.ts, program-server.ts, program-persistence).
4. Copy Phase 2 components (ManagePrograms, ProgramLibraryTable, ProgramEditor, ScheduleBuilder).
5. Add `programs` and `programs/:id` routes; remove ComingSoon for Program Factory.
6. Then proceed to Phase 3 (AI routes + generator modal + blueprint editor).
