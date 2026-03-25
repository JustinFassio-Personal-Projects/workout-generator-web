# Plan: Workout details as review / editor only (no completion on details page)

## Goal

Treat [`WorkoutDetailsContent.tsx`](../../src/app/workouts/WorkoutDetailsContent.tsx) + [`WorkoutDisplay`](../../src/components/workout/WorkoutDisplay.tsx) as **plan review and editing** only. **Set / exercise completion and “complete workout”** happen **only in the workout player** ([`ManualWorkoutPlayer`](../../src/components/workout/player/ManualWorkoutPlayer.tsx) + [`CompletionModal`](../../src/components/history/CompletionModal.tsx) on [`/workouts/[id]/player`](../../src/app/workouts/[id]/player/page.tsx)).

## Current state (baseline)

| Surface | Role today |
|--------|------------|
| `WorkoutDetailsContent` | `CompleteWorkoutFAB`, `CompletionModal`, `currentWorkoutState` + `onWorkoutStateChange` so completion uses edited-but-unsaved workout |
| `WorkoutDisplay` | `handleSetComplete` / `handleExerciseComplete` → `WorkoutSection`, `ExerciseModal`; set “Done” column + “Complete Exercise” footer |
| Player route | `ManualWorkoutPlayer` already owns completion flow + `CompletionModal` |

`CompleteWorkoutFAB` is **only** referenced from `WorkoutDetailsContent` (safe to remove usage; optional file removal).

## Target behavior

1. **Details page:** No FAB, no completion modal, no CTAs that imply “finish the session” here. Primary session path: **Workout Player** (existing link).
2. **Details page:** No **interactive** set/exercise completion (no toggling `set.completed` / `exercise.completed` from this surface).
3. **Player:** Remains the single place users mark sets/exercises done and submit **Complete Workout** / session report (existing `CompletionModal`).

## Implementation outline

### 1. `WorkoutDetailsContent.tsx`

- Remove imports and JSX for `CompleteWorkoutFAB` and `CompletionModal`.
- Remove `completionModalOpen` / `setCompletionModalOpen` state.
- Remove `currentWorkoutState` / `setCurrentWorkoutState` and **`onWorkoutStateChange`** on `WorkoutDisplay` (only needed for FAB/modal sync today).
- Optionally add a short comment near `WorkoutDisplay` that completion is player-only (helps future contributors).

No change required to certification, save, or player link unless you want stronger copy (e.g. hint that logging/completion happens in the player).

### 2. `WorkoutDisplay.tsx`

Introduce an explicit mode, e.g. **`sessionCompletionEnabled`** (default **`true`** to avoid affecting any future callers):

- When **`false`** (passed only from `WorkoutDetailsContent`):
  - Do **not** pass `onToggleSetComplete` or `onExerciseComplete` into `WorkoutSection` or `ExerciseModal`.
  - Omit or no-op the handlers that only exist for completion (`handleSetComplete` / `handleExerciseComplete` can stay internal but stay unwired, or be skipped behind the flag to avoid dead code).

**Call site:** `WorkoutDetailsContent` uses `<WorkoutDisplay … sessionCompletionEnabled={false} />` (exact prop name up to you).

Today `WorkoutDisplay` is only used from this page in the hub app, but a default preserves a safe API.

### 3. `ExerciseSetLogTable.tsx`

Today the “Done” column still renders when `onToggleSetComplete` is omitted; the button calls `onToggleSetComplete?.(...)` so it **looks clickable but does nothing**.

**Required change:** When `onToggleSetComplete` is **undefined**, **do not render** the Done column (header + cells). Adjust the grid template (or use a variant class) so reps / note / intensity / weight / rest still align for editing.

Alternatively, add a dedicated prop `showSetDoneColumn`—but deriving from `onToggleSetComplete` keeps a single source of truth.

### 4. `ExerciseModal.tsx`

It receives `onToggleSetComplete` from `WorkoutDisplay`. With the flag off, pass **undefined** and ensure any “Mark complete” / set-done UI is **hidden** when the handler is missing (mirror `ExerciseSetLogTable` behavior).

### 5. Completion visuals on cards (product decision)

`ExerciseCard` uses `exercise.completed` for borders, opacity, and “Completed” badge. After a real session, Firestore may still have `completed: true` on exercises.

Choose one:

- **A (recommended for “editor”):** Add something like **`showSessionCompletionState`** on `ExerciseCard` / `WorkoutSection` (default `true`). When `false`, treat the exercise as not visually “session-complete” for layout purposes (ignore `exercise.completed` for chrome only; do not mutate data).
- **B:** Leave badges as-is so coaches/users see last session state on the plan (can be confusing next to “you can’t complete here”).

Document the choice in the PR.

### 6. `CompleteWorkoutFAB.tsx`

After removing the only usage:

- **Delete** the component file **and** remove its export from `components/workout/index.ts` if present, **or** keep the file temporarily with a deprecation comment. Prefer delete if nothing else imports it.

### 7. Docs and analytics (secondary)

- [`docs/design/onboarding-workflow/FIRST_TIME_USER_WORKFLOW.md`](../design/onboarding-workflow/FIRST_TIME_USER_WORKFLOW.md) mentions the Complete Workout FAB—update to say completion is in the player.
- [`docs/admin/ADMIN_WORKOUT_COMPLETION_ANALYTICS_FEATURE.md`](../admin/ADMIN_WORKOUT_COMPLETION_ANALYTICS_FEATURE.md) ties `WorkoutDisplay` to completion—narrow to player + history flows if needed.

## Data and save semantics

- **Save** on the details page should continue to persist **sections** (structure, prescriptions, edits) via existing `TrainerService.updateWorkoutSections`.
- **Do not** add logic that clears `completed` flags on save unless product explicitly wants a “reset session” action (out of scope unless requested).
- Player continues to load the same document; completion writes stay in `WorkoutHistoryService.markComplete` / `CompletionModal` as today.

## Verification checklist

- Details `/workouts?id=…`: no FAB, no completion modal; set table has no Done column; exercise modal has no set/exercise completion controls; “Complete Exercise” footer absent.
- Player `/workouts/[id]/player`: completion + `CompletionModal` still work; session report / history unchanged.
- **Workout history** and other `CompletionModal` callers (e.g. `WorkoutHistoryList`) unchanged.
- Regression: AI editor, save, certification, image request flows on details page unchanged.

## Risk / edge cases

- Users who used to **complete from the details page** must discover the player (Workout Player button already exists; consider microcopy later).
- Partial completion stored on the workout document may still appear if you choose **not** to hide completion chrome (decision in §5).

## Suggested task order

1. `ExerciseSetLogTable` + `ExerciseModal` guardrails when `onToggleSetComplete` is absent.
2. `WorkoutDisplay` prop + wire-through to `WorkoutSection` / `ExerciseCard` (including optional §5).
3. `WorkoutDetailsContent` cleanup + `sessionCompletionEnabled={false}`.
4. Remove `CompleteWorkoutFAB` usage and file/export.
5. Docs pass + manual QA.
