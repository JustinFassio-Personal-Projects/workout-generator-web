# Content Generation Lab — Reusable Framework Blueprint

**Date:** 2026-03-14  
**Status:** Proposal  
**Source:** Visualization Lab (Exercise Image Generator) in admin-dash-astro  
**Goal:** Extract reusable patterns into an adaptable content-generation framework usable across apps and use cases.

---

## Executive Summary

The Visualization Lab is a rich, well-structured AI content generator: form inputs → API call → optional review step → result → save. This document outlines how to generalize it into a **Content Generation Lab** that can power:

- **Post-workout AI Insight** (HUD): User enters heart rate → cardiovascular recovery assessment
- **Personalized exercise image**: User uploads photo → image of themselves doing an exercise from their completed workout
- **Future**: Challenge summaries, program recommendations, nutrition insights, etc.

---

## Use Cases (Target)

| Use Case | App | Inputs | Output | Persistence |
|----------|-----|--------|--------|-------------|
| **Post-workout insight** | programs (HUD) | Heart rate, workout ID, optional notes | AI text: recovery assessment, insight | `workout_logs` or new `workout_insights` |
| **Personalized exercise image** | programs | User photo, exercise name, workout context | AI image (user in pose) | Storage + optional gallery |
| **Exercise image (admin)** | admin-dash-astro | Topic, style, reference image | AI image + biomechanics | `generated_exercises` |
| **Challenge summary** | admin-dash-astro / programs | Challenge ID, participants | AI summary | Challenge record |

---

## Architecture: Extract from Visualization Lab

The Visualization Lab has a clear layered structure:

```
┌─────────────────────────────────────────────────────────────────┐
│ View (ExerciseImageGenerator)                                    │
│   - Form UI (topic, complexity, style, etc.)                     │
│   - Reference media picker                                       │
│   - Generate button → loading → result → save/download           │
│   - Optional: prompt review step                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ Hook (useVisualizationLab)                                       │
│   - Form state (generic key-value)                               │
│   - Reference state (url, dataUrl, loading, error)               │
│   - Generation state (loading, result, error)                    │
│   - handleSubmit → fetch API → setResult                         │
│   - Optional: researchOnly → review step → handleGenerateFromPrompts│
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ API (/api/generate-exercise-image)                               │
│   - Parse body, validate inputs                                  │
│   - Research (optional) → Image generation                       │
│   - Return { image, biomechanics, ... } or { error }             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ Persistence (Supabase)                                           │
│   - generated_exercises, exercise_images, storage bucket         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Abstract Pattern: Content Generation Lab

### Core Contract

| Concept | Visualization Lab | Generic |
|---------|-------------------|---------|
| **Form** | exerciseTopic, complexityLevel, visualStyle, ... | `Record<string, unknown>` configurable per use case |
| **Reference** | referenceImage (URL or dataUrl) | Optional reference media (image, text) |
| **Generation** | Research → Image | Configurable pipeline (text-only, image-only, research→image) |
| **Result** | `{ image, biomechanics, searchResults }` | `T` (generic result type) |
| **Save** | createGeneratedExercise, uploadExerciseImage | Callback `(result: T) => Promise<void>` or no-op |

### Proposed Hook Signature (Generic)

```ts
interface UseContentGenerationLabOptions<TCtx, TResult> {
  /** Initial context (e.g. workout ID, exercise name). */
  initialContext?: TCtx;
  /** Reset key: when changed, clear form and result. */
  resetKey?: string;
  /** API endpoint for generation. */
  apiEndpoint: string;
  /** Build request body from form + reference. */
  buildRequestBody: (form: Record<string, unknown>, reference: ReferenceState) => Record<string, unknown>;
  /** Parse API response into result. */
  parseResponse: (data: unknown) => TResult;
  /** Optional: save result (upload, create record). */
  onSave?: (result: TResult, context: TCtx) => Promise<void>;
  /** Optional: research-only step before final generation. */
  supportsPromptReview?: boolean;
}

interface UseContentGenerationLabReturn<TCtx, TResult> {
  form: Record<string, unknown> & setters;
  reference: ReferenceState & loaders;
  generation: {
    loading: boolean;
    result: TResult | null;
    error: string | null;
    handleSubmit: () => Promise<void>;
    clearResult: () => void;
    promptStep?: 'idle' | 'research' | 'review' | 'generating';
    handleGenerateFromPrompts?: (prompts: unknown) => Promise<void>;
  };
  user: { id: string } | null;
}
```

### Proposed View Component Slots

```tsx
<ContentGenerationLab
  title="Post-Workout AI Insight"
  formSlot={<PostWorkoutInsightForm />}       // Heart rate, notes
  referenceSlot={null}                         // No reference for this use case
  resultSlot={<RecoveryAssessmentDisplay />}  // Render text result
  onSave={saveToWorkoutLog}
  apiEndpoint="/api/workout-insight"
/>
```

For the personalized image use case:

```tsx
<ContentGenerationLab
  title="Your Exercise Moment"
  formSlot={<ExerciseFromWorkoutForm />}     // Exercise picker, style
  referenceSlot={<PhotoUploadPicker />}       // User photo
  resultSlot={<GeneratedImageDisplay />}      // Image + download/save
  onSave={saveToUserGallery}
  apiEndpoint="/api/personalized-exercise-image"
/>
```

---

## Phased Implementation

### Phase 1: Extract Shared Primitives (Low Risk)

**Goal:** Create reusable building blocks without changing existing Visualization Lab.

| Deliverable | Location | Description |
|-------------|----------|-------------|
| `useReferenceImage` | `packages/content-generation-lab` or `apps/admin-dash-astro/src/hooks` | Hook for URL input + proxy load + dataUrl state. Already exists as part of useVisualizationLab; extract. |
| `useGenerationState` | Same | Generic `{ loading, result, error, handleSubmit, clearResult }` with fetch + error handling (including 429). |
| `ReferenceImagePicker` | Shared component | Already exists in admin-dash-astro; move to shared package if needed. |

**Files to create:**
- `packages/content-generation-lab/src/useReferenceImage.ts`
- `packages/content-generation-lab/src/useGenerationState.ts`
- `packages/content-generation-lab/package.json`

---

### Phase 2: First New Use Case — Post-Workout Insight (HUD)

**Goal:** Add “Record workout” flow in HUD with heart rate → AI insight.

**Flow:**
1. User completes workout (or manually records completion).
2. User enters post-workout heart rate and minutes since last set(and optionally notes).
3. “Get AI Insight” → call `/api/workout-insight` (new).
4. API: Gemini text generation with prompt like “Given heart rate X after y minutes and workout z, provide a brief cardiovascular recovery assessment and 2–3 actionable tips.”
5. Display result; optionally save to `workout_logs` or new `workout_insights` table.

**New files:**
- `apps/programs/src/pages/api/workout-insight.ts` (or equivalent in programs API structure)
- `apps/programs/src/components/react/hud/WorkoutInsightForm.tsx`
- `apps/programs/src/components/react/hud/RecoveryAssessmentDisplay.tsx`
- Integration in `TodayWorkoutCard` or `HistoryZone` (“Record” / “Add insight” CTA)

**Schema (optional):**
- `workout_insights` table: `id`, `workout_log_id`, `heart_rate`, `notes`, `insight_text`, `created_at`

---

### Phase 3: Second New Use Case — Personalized Exercise Image

**Goal:** User uploads photo → AI generates image of them doing an exercise from their workout.

**Flow:**
1. User completes workout; sees “Create your exercise moment” CTA.
2. User picks an exercise from the workout.
3. User uploads a reference photo (or uses existing profile photo).
4. “Generate” → call `/api/personalized-exercise-image` (new).
5. API: Similar to `generate-exercise-image` but with user photo as primary reference and exercise-specific prompt.
6. Display image; optional save to user gallery.

**Considerations:**
- Same Gemini image API; different prompt structure.
- Privacy: user photo stays in user-scoped storage; clear consent.
- May need new storage path: `user-content/{userId}/personalized-exercise-{slug}-{ts}.png`

---

### Phase 4: Generic Content Generation Lab Package

**Goal:** Full `useContentGenerationLab<TCtx, TResult>` and `ContentGenerationLab` shell.

| Package | Exports |
|---------|---------|
| `@workout-generator/content-generation-lab` | `useContentGenerationLab`, `ContentGenerationLab`, `useReferenceImage`, `useGenerationState` |

**Slots / composition:**
- `formSlot`, `referenceSlot`, `resultSlot` as React nodes
- `apiEndpoint`, `buildRequestBody`, `parseResponse`, `onSave` as props or hook options

**Refactor:** ExerciseImageGenerator becomes one instantiation of this framework.

---

## Package Structure Proposal

```
packages/
  content-generation-lab/
    package.json
    src/
      index.ts
      useContentGenerationLab.ts    # Generic hook
      useReferenceImage.ts          # Reference media (image URL + dataUrl)
      useGenerationState.ts         # loading, result, error, submit
      ContentGenerationLab.tsx      # Shell with slots
      types.ts                      # TCtx, TResult, ReferenceState
```

**Dependencies:** React, optional Supabase client for auth (user.id). No Gemini dependency — API lives in each app.

---

## API Pattern (Per Use Case)

Each use case gets its own API route. Shared behavior:

| Concern | Approach |
|---------|----------|
| **Auth** | Require Supabase session; use `user.id` for scoping |
| **Rate limiting** | Return 429 with message; client shows “Rate limit exceeded. Wait and retry.” |
| **Errors** | `{ error: string }` in JSON; consistent logging |
| **AI provider** | Gemini (or Vertex) for text and image; each route calls the appropriate server-side function |

---

## Visualization Lab Refactor (Future)

Once the generic framework exists:

1. **useVisualizationLab** → implemented using `useContentGenerationLab` with exercise-specific options.
2. **ExerciseImageGenerator** → uses `ContentGenerationLab` with exercise form, reference picker, and result slots.
3. Domain logic (templates, batch generate, edit-by-slug) stays in admin-dash-astro; only the core generation flow is generic.

---

## Suggested First Step

**Immediate (Phase 1):** Extract `useGenerationState` — the smallest, most reusable piece. It encapsulates:

- `loading`, `result`, `error` state
- `handleSubmit` that calls `fetch(apiEndpoint, { method: 'POST', body })`
- 429 handling (rate limit message)
- `clearResult`

Use it first in a minimal proof-of-concept (e.g. a simple “Generate text” demo) before refactoring the Visualization Lab.

---

## File Reference (Current Viz Lab)

| Area | Path |
|------|------|
| View | `apps/admin-dash-astro/src/components/ExerciseImageGenerator.tsx` |
| Hook | `apps/admin-dash-astro/src/hooks/useVisualizationLab.ts` |
| Reference picker | `apps/admin-dash-astro/src/components/react/ReferenceImagePicker.tsx` |
| API | `apps/admin-dash-astro/src/pages/api/generate-exercise-image.ts` |
| Load reference | `apps/admin-dash-astro/src/pages/api/load-reference-image.ts` |
| Types | `apps/admin-dash-astro/src/lib/visualization-lab/types.ts` |
| HUD | `apps/programs/src/components/react/hud/*` |

---

## Open Questions

1. **Monorepo package location:** New package under `packages/` vs. shared code in a single app (e.g. `apps/programs/src/lib/content-generation-lab`)?
2. **Programs API host:** Programs may use a different API host (e.g. Cloud Run). Ensure `apiEndpoint` can be absolute or relative.
3. **Consent for personalized images:** Where to capture “I agree to use my photo for AI image generation”?
4. **Cost / quotas:** Per-user limits for AI generation in HUD vs. admin-only use?

---

## Related Documents

- [Visualization Lab SWOT Analysis](../../apps/admin-dash-astro/docs/visualization-lab-swot-analysis.md) — strengths, weaknesses, opportunities, threats of the current Viz Lab
- [Admin Dash Astro Site Publish Roadmap](./ADMIN_DASH_ASTRO_SITE_PUBLISH_ROADMAP.md) — content publishing from admin to astro-site
