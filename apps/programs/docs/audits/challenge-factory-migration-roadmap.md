# Challenge Factory Migration Roadmap

**Date:** 2025-03-12  
**Branch:** feature/challenge-factory-migration (TBD)  
**Source:** Challenge Factory review (Programs)  
**Target:** admin-dash-astro

---

## Progress Summary

| Phase                                 | Status      | Notes                                                                                     |
| ------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| **Phase 0: Foundation**               | Done        | RUN_CHALLENGES_SCHEMA.sql, CHALLENGE_DATA_MODEL.md; gates verified                        |
| **Phase 1: API and Data Layer**       | Done        | CRUD, images, AI routes, admin libs, client persistence; auth on AI routes                |
| **Phase 2: Views and Modal**          | Done        | ManageChallenges, ChallengeLibraryTable, ChallengeEditor, ChallengeGeneratorModal, images |
| **Phase 3: Edit Flow and Regenerate** | Not started | Wire edit mode, regenerate from table/editor                                              |
| **Phase 4: Polish and Documentation** | Not started | Auth on AI routes, error handling, docs                                                   |
| **Phase 6: Risk Register**            | Done        | Status tracking, verification steps, mitigation text updated                              |

---

## 1. Vision and Goals

### 1.1 Vision

The migrated Challenge Factory becomes the **single hub** for 2–6 week fitness challenges in the admin. Admins can:

- **Create challenges** via config form → AI chain (Architect → Biomechanist → Coach → Mathematician) → preview → save.
- **Edit challenges** (metadata, schedule) and **regenerate schedule with AI** from the editor.
- **Manage images** (hero + section slots 1–5) with AI generation and Supabase storage.
- **Publish/unpublish** and delete challenges.

### 1.2 Goals

| Goal                            | Success Criteria                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Migrate to admin-dash-astro** | Challenge Factory runs in admin-dash-astro; uses `verifyAdminRequest`; same nav/layout as Program Factory. |
| **Full CRUD**                   | List, create, update, delete, status (draft/published) via admin API.                                      |
| **AI generation**               | 4-step chain (challenge Architect + shared steps 2–4); optional two-phase (architect-only) flow.           |
| **Image support**               | Hero + section images; generate via Gemini; upload/remove via Supabase Storage.                            |
| **Edit and regenerate**         | Edit metadata in ChallengeEditor; "Regenerate with AI" opens ChallengeGeneratorModal in edit mode.         |
| **Minimize migration risk**     | Shared Supabase tables; no data migration; auth and storage policies documented.                           |

---

## 2. Prerequisites (Dependency Gates)

### 2.1 Auth

- **Dependency:** admin-dash-astro uses `admin_users` and `verifyAdminRequest`.
- **Action:** All Challenge Factory API routes use `verifyAdminRequest`. AI routes (`generate-challenge-architect`, `generate-challenge-chain`) currently lack auth in programs — **add auth during migration**.
- **Reference:** [admin-dash-astro/src/lib/supabase/admin/auth.ts](../../admin-dash-astro/src/lib/supabase/admin/auth.ts)

### 2.2 Program / Workout Factory

- **Dependency:** Program Factory and Workout Factory migrations establish prompt-chain steps 2–4, equipment/zones, Vertex AI, `program-schedule-utils`.
- **Action:** Migrate Challenge Factory **after** Workout Factory. Reuse: Biomechanist, Coach, Mathematician, equipment server libs, `normalizeProgramSchedule`.
- **Reference:** [workout-factory-migration-blueprint.md](./workout-factory-migration-blueprint.md), [FEATURES.md](../../admin-dash-astro/FEATURES.md)

### 2.3 AI Infrastructure

- **Dependency:** Vertex AI (`GOOGLE_PROJECT_ID`, `GOOGLE_LOCATION`, `gcloud auth application-default login`), Gemini for images.
- **Action:** Reuse existing env; add `step1-challenge-architect` as the only challenge-specific prompt step.
- **Env:** `GOOGLE_PROJECT_ID`, `GOOGLE_LOCATION`; Gemini keys for `generateInfographicImage`.

### 2.4 Schema and Storage

- **Tables:** `challenges`, `challenge_weeks` (from programs schema). Both apps share same Supabase project.
- **Columns:** `challenges` includes `hero_image_url`, `section_images` (from migration `00055_challenges_images.sql`).
- **Storage:** Images use `uploadBufferToStorage` with path `challenges/{challengeId}/images/{slot}.{ext}`. Programs uses `exercise-images` bucket; ensure bucket policies allow this path or add a `challenges` bucket.
- **Action:** Verify schema exists in shared Supabase; add storage bucket/policy if needed. Create `RUN_CHALLENGES_SCHEMA.sql` if migration scripts are not applied.

---

## 3. Migration Phases

### Phase 0: Foundation

| Task                                         | Status | Notes                                                                                                      |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Program Factory migration complete           | Done   | ManagePrograms, api/admin/programs verified                                                                |
| Workout Factory migration complete           | Done   | ManageWorkouts, api/admin/workouts verified; generate-workout-chain gap documented in CHALLENGE_DATA_MODEL |
| `challenges`, `challenge_weeks` tables exist | Done   | [RUN_CHALLENGES_SCHEMA.sql](../../admin-dash-astro/docs/RUN_CHALLENGES_SCHEMA.sql) created                 |
| Storage bucket allows challenge images       | Done   | Documented in CHALLENGE_DATA_MODEL; exercise-images bucket; service role bypasses RLS                      |
| Auth: `verifyAdminRequest` in use            | Done   | Already in admin-dash-astro                                                                                |
| Create `CHALLENGE_DATA_MODEL.md`             | Done   | [CHALLENGE_DATA_MODEL.md](../../admin-dash-astro/docs/CHALLENGE_DATA_MODEL.md)                             |

### Phase 1: API and Data Layer

| Task                                                 | Status | Notes                                                           |
| ---------------------------------------------------- | ------ | --------------------------------------------------------------- |
| Copy `api/admin/challenges/index.ts`                 | Done   | GET list, POST create; `verifyAdminRequest`                     |
| Copy `api/admin/challenges/[challengeId].ts`         | Done   | GET, PUT, PATCH, DELETE; metadata query param for `?metadata=1` |
| Copy `api/admin/challenges/[challengeId]/images.ts`  | Done   | POST upload, DELETE remove; `verifyAdminRequest`                |
| Copy `api/admin/challenges/generate-image.ts`        | Done   | POST; `verifyAdminRequest`; uses `generateInfographicImage`     |
| Copy `api/ai/generate-challenge-architect.ts`        | Done   | Step 1 only; `verifyAdminRequest` added                         |
| Copy `api/ai/generate-challenge-chain.ts`            | Done   | Full 4-step chain; `verifyAdminRequest` added                   |
| Copy `lib/supabase/admin/challenges.ts`              | Done   | CRUD + image helpers                                            |
| Copy `lib/supabase/admin/storage-upload.ts`          | Done   | `uploadBufferToStorage` with import fix                         |
| Copy `lib/supabase/client/challenge-persistence.ts`  | Done   | All client API calls                                            |
| Copy `lib/prompt-chain/step1-challenge-architect.ts` | Done   | Challenge-specific step 1                                       |
| Copy `lib/supabase/admin/server-equipment.ts`        | Skip   | Already present from Program/Workout Factory                    |
| Copy `types/ai-challenge.ts`                         | Done   | Shared types                                                    |
| Verify `lib/program-schedule-utils.ts`               | Done   | Exists; `normalizeProgramSchedule` used                         |
| Verify `lib/gemini-server.ts`                        | Done   | `generateInfographicImage` present                              |

### Phase 2: Views and Modal

| Task                                   | Status | Notes                                                                                           |
| -------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Copy `ManageChallenges.tsx`            | Done   | Layout matches admin-dash-astro                                                                 |
| Copy `ChallengeLibraryTable.tsx`       | Done   | Filter, publish/unpublish, edit (Link to full-page), delete                                     |
| Copy `ChallengeEditor.tsx`             | Done   | Full-page editor; metadata, schedule, milestones, "Edit schedule with AI"                       |
| Copy `ChallengeGeneratorModal.tsx`     | Done   | Config → architect → chain → preview → save; uses AppContext                                    |
| Copy `ChallengeBlueprintEditor.tsx`    | Done   | Wraps ProgramBlueprintEditor; milestones + ChallengeImagesPanel                                 |
| Copy `ChallengeImagesPanel.tsx`        | Done   | Hero + section image management                                                                 |
| Copy `ChallengeImageGenerateModal.tsx` | Done   | AI image generation per slot                                                                    |
| Copy shared components                 | Done   | EditorHeader, StatusMessage, EditorMetaForm, ScheduleViewer, ExerciseBlockCard (Phase 2 Prereq) |
| Add route `/admin/challenges`          | Done   | ManageChallenges                                                                                |
| Add route `/admin/challenges/:id`      | Done   | ChallengeEditor                                                                                 |
| Nav item "Challenge Factory"           | Done   | Already present; routes to `/challenges`                                                        |

### Phase 3: Edit Flow and Regenerate

| Task                                            | Detail                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Edit links to ChallengeEditor**               | ChallengeLibraryTable "Edit" links to `/admin/challenges/:id` (full-page editor).                                        |
| **Regenerate from ManageChallenges (optional)** | If table supports inline edit: `onEdit` fetches full challenge + metadata, opens ChallengeGeneratorModal in edit mode.   |
| **ChallengeEditor "Edit schedule with AI"**     | Opens ChallengeGeneratorModal with `existingChallenge`, `challengeConfig`, `editingChallengeId`, `editingChainMetadata`. |
| **Image refresh after generation**              | On images update, ChallengeEditor/ManageChallenges call `fetchChallengeMetadata` to refresh hero/section URLs.           |

### Phase 4: Polish and Documentation

| Task                          | Detail                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add auth to AI routes**     | `generate-challenge-architect`, `generate-challenge-chain` must call `verifyAdminRequest` at start.                                                                                                                                                                                                                                                                  |
| **Error handling**            | GET `/api/admin/challenges` returns 500 with message on error instead of `[]`; client shows error.                                                                                                                                                                                                                                                                   |
| **AI route timeout handling** | Document and mitigate: "AI API returned non-JSON... upstream request timeout". Vertex client has 180s timeout; platform (e.g. Vercel) may cut off earlier. Options: increase serverless timeout (Vercel Pro 300s), show clearer user message ("Request timed out. Try again; generation often takes 30–60s"), consider retry or streaming for long-running AI calls. |
| **Centralize image slots**    | Define `CHALLENGE_IMAGE_SLOTS = ['hero','1','2','3','4','5']` in shared constant; remove duplication.                                                                                                                                                                                                                                                                |
| **CHALLENGE_DATA_MODEL.md**   | Document schema, config shape, image slots, RLS.                                                                                                                                                                                                                                                                                                                     |
| **Preserve specs**            | Copy or link any challenge-specific prompt/docs into admin-dash-astro.                                                                                                                                                                                                                                                                                               |

---

## 4. File Mapping

| programs                                                     | admin-dash-astro                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/pages/api/admin/challenges/index.ts`                    | `src/pages/api/admin/challenges/index.ts`                        |
| `src/pages/api/admin/challenges/[challengeId].ts`            | `src/pages/api/admin/challenges/[challengeId].ts`                |
| `src/pages/api/admin/challenges/[challengeId]/images.ts`     | `src/pages/api/admin/challenges/[challengeId]/images.ts`         |
| `src/pages/api/admin/challenges/generate-image.ts`           | `src/pages/api/admin/challenges/generate-image.ts`               |
| `src/pages/api/ai/generate-challenge-architect.ts`           | `src/pages/api/ai/generate-challenge-architect.ts`               |
| `src/pages/api/ai/generate-challenge-chain.ts`               | `src/pages/api/ai/generate-challenge-chain.ts`                   |
| `src/lib/supabase/admin/challenges.ts`                       | `src/lib/supabase/admin/challenges.ts`                           |
| `src/lib/supabase/admin/storage-upload.ts`                   | `src/lib/supabase/admin/storage-upload.ts` (or extend if exists) |
| `src/lib/supabase/client/challenge-persistence.ts`           | `src/lib/supabase/client/challenge-persistence.ts`               |
| `src/lib/prompt-chain/step1-challenge-architect.ts`          | `src/lib/prompt-chain/step1-challenge-architect.ts`              |
| `src/lib/supabase/admin/server-equipment.ts`                 | `src/lib/supabase/admin/server-equipment.ts` (if not present)    |
| `src/types/ai-challenge.ts`                                  | `src/types/ai-challenge.ts`                                      |
| `src/components/react/admin/views/ManageChallenges.tsx`      | `src/components/admin/views/ManageChallenges.tsx`                |
| `src/components/react/admin/views/ChallengeEditor.tsx`       | `src/components/admin/views/ChallengeEditor.tsx`                 |
| `src/components/react/admin/ChallengeLibraryTable.tsx`       | `src/components/admin/ChallengeLibraryTable.tsx`                 |
| `src/components/react/admin/ChallengeGeneratorModal.tsx`     | `src/components/admin/ChallengeGeneratorModal.tsx`               |
| `src/components/react/admin/ChallengeBlueprintEditor.tsx`    | `src/components/admin/ChallengeBlueprintEditor.tsx`              |
| `src/components/react/admin/ChallengeImagesPanel.tsx`        | `src/components/admin/ChallengeImagesPanel.tsx`                  |
| `src/components/react/admin/ChallengeImageGenerateModal.tsx` | `src/components/admin/ChallengeImageGenerateModal.tsx`           |
| `ArchitectBlueprintPreview.tsx`, `ChainDebugPanel.tsx`, etc. | Copy if not already shared with Program/Workout Factory          |

---

## 5. Schema Reference

Canonical schema documentation:

- **DDL:** [RUN_CHALLENGES_SCHEMA.sql](../../admin-dash-astro/docs/RUN_CHALLENGES_SCHEMA.sql) — idempotent migration.
- **Schema reference:** [CHALLENGE_SCHEMA_REFERENCE.md](../../admin-dash-astro/docs/CHALLENGE_SCHEMA_REFERENCE.md) — columns, JSONB shapes, indexes, RLS.
- **Data model:** [CHALLENGE_DATA_MODEL.md](../../admin-dash-astro/docs/CHALLENGE_DATA_MODEL.md) — setup, config, image slots, prompt chain.

---

## 6. Risk Register

| Risk                               | Mitigation                                                                                                                                 | Status     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| AI routes lack auth                | `verifyAdminRequest` at start of both `generate-challenge-architect` and `generate-challenge-chain` (Phase 1).                             | Mitigated  |
| AI upstream request timeout        | User-facing message added (Phase 4). Optional: increase Vercel serverless timeout, add retry logic.                                        | Residual   |
| Storage bucket path                | `exercise-images` bucket; `uploadBufferToStorage` uses service role; path `challenges/{id}/images/{slot}`. CHALLENGE_DATA_MODEL documents. | Mitigated  |
| AppContext / user for modal        | ChallengeGeneratorModal uses `useAppContext`; AdminDashboard wraps in AppProvider.                                                         | Mitigated  |
| Shared Supabase tables             | Both apps use same `challenges`, `challenge_weeks`; RLS defined; no data migration.                                                        | Documented |
| Heavy modal complexity             | ChallengeGeneratorModal ~1,200 lines; migrate as-is; refactor in later pass if desired.                                                    | Residual   |
| Programs still serves public pages | Admin-only migration; public catalog/sales remain in programs.                                                                             | Documented |

### Verification

- **Auth:** Inspect `generate-challenge-architect.ts` and `generate-challenge-chain.ts` for `verifyAdminRequest` at start of handler.
- **Storage:** Confirm `storage-upload.ts` uses `exercise-images` bucket; `[challengeId]/images.ts` uses path `challenges/{id}/images/{slot}`.
- **AppContext:** Confirm AdminDashboard provides AppProvider; ChallengeGeneratorModal calls `useAppContext()`.

---

## 7. Acceptance Criteria

- [ ] Admin can open Challenge Factory in admin-dash-astro and see challenge library.
- [ ] Admin can create a new challenge via "Create Challenge" (config → AI chain → preview → save).
- [ ] Admin can edit an existing challenge via "Edit" → ChallengeEditor.
- [ ] Admin can "Edit schedule with AI" from ChallengeEditor; modal opens in edit mode and saves.
- [ ] Admin can manage hero and section images (generate, upload, remove).
- [ ] Admin can publish/unpublish and delete challenges.
- [ ] All Challenge Factory APIs use `verifyAdminRequest`.
- [ ] AI routes (generate-challenge-architect, generate-challenge-chain) use `verifyAdminRequest`.
- [ ] Schema and image slots documented (CHALLENGE_DATA_MODEL.md or equivalent).

---

## 8. References

- [workout-factory-migration-blueprint.md](./workout-factory-migration-blueprint.md)
- [FEATURES.md](../../admin-dash-astro/FEATURES.md)
- [PROGRAM_FACTORY_MIGRATION_AUDIT.md](../../admin-dash-astro/docs/PROGRAM_FACTORY_MIGRATION_AUDIT.md)
- [CHALLENGE_DATA_MODEL.md](../../admin-dash-astro/docs/CHALLENGE_DATA_MODEL.md) — schema, config, image slots, setup
- [RUN_CHALLENGES_SCHEMA.sql](../../admin-dash-astro/docs/RUN_CHALLENGES_SCHEMA.sql) — idempotent DDL (Phase 0)
- programs: `src/lib/supabase/admin/challenges.ts`, `src/pages/api/admin/challenges/*`, `src/types/ai-challenge.ts`
- programs migrations: `00001_initial_schema.sql`, `00055_challenges_images.sql`
