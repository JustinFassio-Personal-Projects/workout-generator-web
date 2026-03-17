# Admin AI Trainer Manager Implementation Guide

This document is for the Admin Cursor AI IDE agent to implement the admin-side UI and CRUD needed to manage AI Trainers and their prompt workflows. The Hub app already reads from Firestore and expects this admin-managed data to exist; this admin app is the source of truth.

## Initial Seeding

**Before implementing the admin UI**, you must seed the existing prompts from the Hub codebase into Firestore. See `PROMPT_SEEDING_GUIDE.md` in this directory for:

- All current prompt strings extracted from the Hub codebase
- Step-by-step instructions for creating the initial Firestore documents
- Structure for prompt sets, prompts, and prompt injections

The seeding guide is designed for a separate codebase that doesn't have access to the Hub's prompt strings.

## Scope

- Create/Update AI trainer personas in Firestore (`trainers`).
- Create/Update prompt content (`ai_prompts`), prompt sets (`prompt_sets`), and prompt injections (`prompt_injections`).
- Attach prompt sets + injections to trainers.
- Generate or upload trainer profile images and store URLs/paths on trainer docs.
- Provide visibility into prompt usage logs (`ai_usage_logs`) for audit/debugging.

The Hub app does **not** implement admin UI or admin APIs. All admin interactions occur via direct Firestore writes using the Admin SDK.

## Firestore Collections (Admin-managed)

### `trainers/{trainerId}`

Keep the existing persona fields and add prompt references. Trainer IDs must match the Hub app persona IDs:
`marcus_chen`, `rivera_santos`, `alex_kim`, `jordan_williams`, `elena_popov`, `ryder_cross`.

Required persona fields (existing):

- `name`, `nickname`, `tagline`, `description`, `philosophy`, `personality`
- `imageUrl` (existing)
- `accentColor`, `borderColor`
- `focuses[]` (array of `{ id, name, icon, isPrimary }`)
- `stats.workoutsGenerated`, `stats.avgRating`
- `recommendedFor[]`
- `isActive`, `displayOrder`

Admin-managed extensions (new; optional):

- `profile_image_url` (string | null)
- `profile_image_storage_path` (string | null)
- `prompt_set_id` (string | null) — points to `prompt_sets/{setId}`
- `prompt_injections` (string[]) — array of `prompt_injections` IDs

### `ai_prompts/{promptId}`

Prompt content with versioning. Required:

- `name`, `type`, `category`, `content`
- `version`, `is_active`
- `created_at`, `updated_at`, `created_by`

Optional:

- `variables[]`, `description`, `usage_count`, `last_used_at`
- `previous_version_id`, `trainer_ids[]`

### `prompt_sets/{setId}`

Group prompt references for a trainer.
Required:

- `name`, `is_active`, `is_default`
- `created_at`, `updated_at`

Recommended references:

- `workout_generation_prompt_id`
- `edit_exercise_prompt_id`
- `swap_exercise_prompt_id`
- `coach_explain_prompt_id`
- `image_generator_prompt_id`
- `system_prompt_id` (fallback if a specific prompt is missing)
- `injection_ids[]`

### `prompt_injections/{injectionId}`

Prompt modifications applied by priority.
Required:

- `name`, `type`, `content`, `priority`, `is_active`
- `created_at`, `updated_at`

Optional:

- `target_section` (for `replace_section`)
- `variables[]`
- `conditions` object:
  - `fitness_level[]`
  - `has_injuries`
  - `equipment_access[]`

### `ai_usage_logs/{logId}`

Read-only view for auditing and troubleshooting.
Look for `prompt_metadata` to confirm which prompt set and prompt version were used.

## Prompt Variables (must be supported in Admin UI)

The Hub prompt resolver replaces `{{variable}}` placeholders in `ai_prompts.content` and `prompt_injections.content`. The admin UI should describe or list supported variables:

- `{{trainer_name}}`, `{{trainer_nickname}}`, `{{trainer_philosophy}}`, `{{trainer_personality}}`
- `{{trainer_focuses}}` (comma-separated)
- `{{focus}}`, `{{specific_focus}}`
- `{{equipment}}`, `{{available_equipment}}`
- `{{fitness_level}}`, `{{user_fitness_level}}`
- `{{injuries}}`, `{{user_injuries}}`
- `{{equipment_access}}`
- `{{workout_difficulty}}`
- `{{user_level}}`

## Admin UI Features (Recommended)

1. **Trainer Manager**
   - List all trainers (ordered by `displayOrder`).
   - Edit persona fields (name, nickname, philosophy, focuses, colors, isActive).
   - Manage prompt references:
     - Select a `prompt_set_id`.
     - Assign `prompt_injections` (multi-select).
   - Upload or generate trainer profile images.
     - Store `imageUrl` or `profile_image_url` and optionally `profile_image_storage_path`.

2. **Prompt Library**
   - CRUD for `ai_prompts`.
   - Versioning controls:
     - Duplicate prompt to create a new version.
     - Set `is_active` and `previous_version_id`.
   - Preview rendered prompt with variable substitution.

3. **Prompt Set Manager**
   - CRUD for `prompt_sets`.
   - Link prompt IDs to each category (workout/edit/swap/coach explain/image).
   - Mark exactly one `is_default` prompt set.

4. **Prompt Injection Manager**
   - CRUD for `prompt_injections`.
   - Visual ordering by `priority`.
   - Conditions editor (fitness level, injuries, equipment access).

5. **Usage & Audit**
   - Read-only table for `ai_usage_logs` filtered by:
     - trainerId, prompt_set_id, promptId, date range, edit_type.
   - Surface `prompt_metadata` from logs for debugging.

## Admin SDK + Firestore Writes

Use Admin SDK for all CRUD. Ensure:

- Input validation on required fields (no empty content, valid prompt type/category).
- Automatic timestamps:
  - `created_at` and `updated_at` as server timestamps.
- Consistent boolean fields (`is_active`, `is_default`, `isActive`) with a single canonical format.

## Image Workflow (Trainer Profile)

If you support AI image generation in admin:

- Generate image (your existing admin flow is fine).
- Store URL in `imageUrl` or `profile_image_url`.
- If using Storage, store `profile_image_storage_path`.

The Hub app will read `imageUrl` first, but also supports `profile_image_url` as a fallback.

## Suggested Validation Rules

- Only one `prompt_sets` document should have `is_default: true`.
- A `prompt_set_id` assigned to a trainer must exist and be `is_active: true`.
- `prompt_injections` assigned to trainers must exist and be `is_active: true`.
- Disallow empty `content` for prompts and injections.

## Test Plan (Admin → Hub Integration)

1. Create or update a `prompt_set` with valid prompt IDs and set `is_default: true`.
2. Assign that `prompt_set_id` to a trainer.
3. In Hub:
   - Generate a workout with that trainer.
   - Edit/swap an exercise and run coach explain.
4. Confirm:
   - Prompts in `ai_usage_logs` include `prompt_metadata`.
   - Trainer profiles update immediately in Hub.
   - Image generation uses the custom prompt template (when set).

## Notes

- The Hub app falls back to default hardcoded prompts if Firestore is missing data.
- Keep existing trainer persona fields intact; add only the prompt references and image fields.
