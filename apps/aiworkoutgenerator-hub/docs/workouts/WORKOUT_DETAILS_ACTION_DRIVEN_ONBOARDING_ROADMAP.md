# Roadmap: Action-Driven Interactive Walkthrough on Workout Details

## Purpose

Define a practical implementation roadmap for an action-driven onboarding walkthrough on `WorkoutDetailsContent.tsx`, where each step advances only after the user performs the intended UI action.

This roadmap is implementation-ready guidance for the team and does **not** start coding yet.

## Product Intent (Recap)

- Keep `WorkoutDetailsContent` as an editor/review surface.
- Add a guided, interactive walkthrough for key editing actions.
- Replace static "read-only" tooltip flow with a state-driven "director" that:
  - controls active step,
  - controls spotlight/backdrop behavior,
  - waits for required user action before advancing.

## Scope

- In scope:
  - First-time walkthrough orchestration on `WorkoutDetailsContent`.
  - Stable element targeting with `data-tour` attributes.
  - Action-gated progression for the 5 required steps.
  - Tour completion persistence flag in user profile.
  - Overlay layering rules to avoid conflict with existing `TooltipProvider`.
- Out of scope (for this phase):
  - Redesigning existing editing flows.
  - Session completion/player flow changes.
  - Broad onboarding architecture across unrelated pages.

## Current Constraints in This Page

- Workout identity is query-param based (`?id=`); missing ID short-circuits rendering.
- Auth/onboarding redirects can unmount the page early.
- `WorkoutDisplay` runs in editing mode with `sessionCompletionEnabled={false}` and should remain editor-only.
- Existing `TooltipProvider` is present and should not regress normal hover behavior.

Implication: onboarding must initialize only when auth/profile/workout state is stable and actionable UI targets are mounted.

## Proposed Architecture

### 1) Controller Component

Create `WorkoutOnboarding.tsx` (client component) as the orchestration layer.

Responsibilities:
- own current step index/state machine,
- own run/paused/completed state,
- attach/detach action listeners for current step target,
- coordinate spotlight/backdrop visibility,
- persist completion flag when tour finishes.

Keep this component separate to avoid inflating `WorkoutDetailsContent` with onboarding-specific state.

### 2) Launch Guard in WorkoutDetailsContent

In `WorkoutDetailsContent.tsx`, mount `WorkoutOnboarding` only when:
- user is authenticated,
- onboarding status is complete (existing gate),
- workout has loaded successfully,
- user profile indicates tour is not yet completed (`hasCompletedFirstWorkoutTour === false`).

### 3) Targeting Strategy

Use stable `data-tour` attributes (not CSS classes) for all guided targets:
- `data-tour="ai-edit"`
- `data-tour="add-exercise"`
- `data-tour="order-check"`
- `data-tour="select-image"`
- `data-tour="coach-info"`

Attributes should be placed on the real interactive elements receiving user input (button/control), not wrapper divs.

### 4) Action-Gated Progression Model

Each step advances only when required interaction is detected for its target:
- register listener for the active target only,
- verify the intended event occurs (click/open/reorder interaction),
- transition to next step, cleanup prior listener, focus next target.

Avoid generic "Next" progression for primary flow. Optional fallback behavior (skip/exit) can be included for resilience.

### 6) Exit and Skip Policy

Define explicit behavior before implementation:
- If user closes (`X`) or clicks **Skip Tour**, mark a dedicated dismissal/completion state so auto-launch does not repeatedly interrupt editing.
- Track dismissal separately from successful completion if analytics need distinction (recommended).
- Offer a manual restart entry point later (for example from settings/help), but keep first-load behavior non-intrusive after dismissal.

### 5) Library Choice

Preferred options:
- React Joyride (controlled mode), or
- Shepherd.js (controlled tour + custom hooks).

Decision criteria:
- controlled-step APIs for external state machines,
- easy target resolution using selectors,
- overlay/spotlight customizability,
- reliable behavior with client-rendered Next.js pages.

If internal architecture favors a lean custom implementation (or extension of existing tooltip logic), that is acceptable if it meets the same action-gated requirements.

## Step Script (Authoritative)

| Step | Target | Required Trigger |
| --- | --- | --- |
| 1 | `[data-tour="ai-edit"]` | User clicks to open Edit menu |
| 2 | `[data-tour="add-exercise"]` | User clicks to open Exercise Library |
| 3 | `[data-tour="order-check"]` | User completes one reorder action (default contract: reorder callback fires once, e.g. `onDragEnd` with changed index/order) |
| 4 | `[data-tour="select-image"]` | User clicks to open Image picker/gallery |
| 5 | `[data-tour="coach-info"]` | User clicks to open explanation/depth info |

## Delivery Phases

### Phase 0 - Discovery & Technical Decision

- Confirm exact DOM owners of the 5 targets (in page and nested components).
- Choose tour engine (Joyride, Shepherd, or custom).
- Define completion flag source of truth in profile schema.

#### Phase 0 Decisions (Completed)

1. DOM ownership of required targets (confirmed):
   - `ai-edit`: `ExerciseCard` action button (`onOpenAIEditor`) in `src/components/workout/ExerciseCard.tsx`
   - `add-exercise`: `ExerciseCard` action button (`onOpenAddExercise`) in `src/components/workout/ExerciseCard.tsx`
   - `order-check`: `ExerciseCard` action button (`onCheckOrder`) in `src/components/workout/ExerciseCard.tsx`
   - `select-image`: `ExerciseCard` action button (`onChooseImage`) in `src/components/workout/ExerciseCard.tsx`
   - `coach-info`: `ExerciseCard` action button (`onOpenCoachExplain`) in `src/components/workout/ExerciseCard.tsx`

2. Reorder ownership (separate from `order-check`):
   - Drag-and-drop reorder contract is implemented in `WorkoutSection` via dnd-kit `onDragEnd` and `onReorderExercises`.
   - This is a different interaction surface than the `order-check` button and should not be conflated.

3. Step 3 trigger contract decision:
   - For MVP, Step 3 remains tied to `[data-tour="order-check"]` and advances when the user clicks the Order Check control (and the check dialog/state opens).
   - Reorder interaction (drag handle / `onDragEnd`) is tracked as an optional follow-up enhancement, not the required trigger for Step 3 in this walkthrough.

4. Tour engine decision:
   - **Recommended for MVP: React Joyride (controlled mode)**.
   - Rationale:
     - Direct React integration for controlled `stepIndex` orchestration in a client component.
     - Straightforward callback model for step lifecycle events and analytics hooks.
     - Faster implementation path for this page-local onboarding scope.
   - Keep Shepherd.js as fallback if overlay behavior or target resolution in nested modal/portal interactions proves unstable during implementation.

5. Completion/dismissal flag source of truth (profile schema):
   - Source document: `user_profiles/{uid}` (already loaded by `useUserProfile` and consumed by `WorkoutDetailsContent` via `useOnboardingStatus`).
   - Add onboarding tour fields to profile document:
     - `workout_details_tour_completed: boolean`
     - `workout_details_tour_completed_at: Timestamp | null`
     - `workout_details_tour_dismissed: boolean`
     - `workout_details_tour_dismissed_at: Timestamp | null`
   - Initial launch condition:
     - auto-launch only when both `workout_details_tour_completed !== true` and `workout_details_tour_dismissed !== true`.
   - Persist updates through existing `ProfileService.updateUserProfile` path.

### Phase 1 - Instrumentation

- Add `data-tour` attributes to stable target elements.
- Add lightweight analytics hooks/events for:
  - tour started,
  - step advanced (with step ID),
  - tour completed,
  - tour dismissed/skipped.

### Phase 2 - Orchestrator Foundation

- Build `WorkoutOnboarding.tsx` with controlled step state.
- Implement mount guards and state hydration from user profile.
- Add overlay/spotlight shell with safe defaults and escape hatches.

#### Phase 2 Notes (Implemented)

- Uses **React Joyride** in controlled mode and mounts it with SSR disabled (dynamic import) to avoid `window`/`document` issues in Next.js.
- Eligibility is guarded by:
  - authenticated + onboarding-complete page state (existing route guards),
  - `user_profiles/{uid}` flags (`workout_details_tour_completed !== true` and `workout_details_tour_dismissed !== true`),
  - a non-null `tourAnchor` and presence of `[data-tour="ai-edit"]` in the DOM.
- Skip/close persists **dismissal** (`workout_details_tour_dismissed*`) via `ProfileService.updateUserProfile`, and emits PostHog events via `workout-details-tour-analytics`.
- **Action-gated step advancement** remains Phase 3 (the director shell is in place).

### Phase 3 - Action Gates

- Implement per-step trigger handlers.
- Ensure event listener lifecycle is clean and idempotent.
- Handle unavailable target fallback (delayed mount, conditional UI).

### Phase 4 - Conflict & UX Hardening

- Resolve z-index/layering with existing Radix/Shadcn tooltip stack.
- Verify keyboard/focus behavior and accessibility semantics.
- Add responsive behavior checks for mobile/tablet/desktop.
- Decide mobile MVP behavior explicitly:
  - support full mobile walkthrough with mobile-optimized tooltip placement (for example bottom-sheet style), or
  - gate walkthrough to desktop-only for MVP and document the follow-up mobile phase.

#### Phase 4 Notes (Implemented)

- **Mobile MVP:** Auto-launch is **desktop-only** (`min-width: 1024px`, Tailwind `lg`). Users who are tour-eligible on phone/tablet are **not** dismissed from the tour; they can complete it on a desktop later. One PostHog event per workout id load: `workout_details_tour_deferred_mobile` (`reason: viewport_below_lg`).
- **Stacking:** While Joyride `run` is true, `document.documentElement` has `data-workout-details-tour-active="true"`. Global CSS in `src/app/globals.css` raises Radix **dialog / alertdialog** content and full-viewport **open** overlays that use `fixed inset-0 z-50` to `z-index: 10100`, so AI editor, image picker, sheets, and similar surfaces sit **above** the Joyride layer (~10000) during action-gated steps.
- **Tooltips:** `WorkoutDetailsContent` passes a longer `TooltipProvider` `delayDuration` while the tour is running (`WorkoutOnboarding` `onRunChange`) to reduce hover tooltip clutter over the walkthrough.
- **Keyboard / a11y:** Joyride `locale` labels for Skip/Close, `dismissKeyAction: "close"` so Escape follows the same close path as the UI close control (wired to existing dismiss persistence), and `disableFocusTrap: true` so focus can move to the highlighted target and page controls.

### Phase 5 - Persistence and Re-entry

- Persist `hasCompletedFirstWorkoutTour` on completion.
- Define re-run behavior (manual restart vs one-time only).
- Ensure no repeated auto-launch once complete.

#### Phase 5 Notes (Implemented)

- **Script version:** `WORKOUT_DETAILS_TOUR_SCRIPT_VERSION` in `src/lib/workout-details-tour-version.ts` (integer, currently **1**). **Bump** it when the tour script materially changes so users who completed or dismissed an **older** script become auto-launch eligible again. Profile fields `workout_details_tour_completed_script_version` and `workout_details_tour_dismissed_script_version` record the last script version for each outcome; legacy profiles without those fields still infer **v1** from `workout_details_tour_completed` / `workout_details_tour_dismissed` booleans.
- **Manual replay:** Profile page card **Replay tour** clears completion/dismissal and script-version fields via `buildWorkoutDetailsTourReplayResetPatch()`; next visit to workout details (desktop) can auto-start the tour. PostHog: `workout_details_tour_replay_requested` with `source: profile_manual`.
- **Analytics:** Completing or dismissing still updates the existing boolean + timestamp fields for backward compatibility; the started analytics effect resets when a new run begins so version bumps and replay get a fresh `workout_details_tour_started` where applicable.

### Phase 6 - QA and Rollout

- Validate script end-to-end across loading/redirect conditions.
- Test guarded states (missing workout ID, errors, unavailable target).
- Roll out behind feature flag if desired; monitor completion/drop-off.

## Technical Design Notes

### Event Handling

- Prefer scoped listeners bound to current step target node.
- Use explicit cleanup in `useEffect` return handlers.
- De-bounce or one-shot step advancement to prevent double transitions.

### Async Rendering & Target Readiness

- Wait for target resolution before rendering the step overlay.
- Retry target query for short windows if target mounts late.
- Fail gracefully with "skip step" if target is absent due to role/state.

### Tooltip/Overlay Interop

- Keep onboarding overlay z-index above Radix tooltip layers.
- Optionally suppress hover tooltips while tour is active if clutter appears.
- Restore normal tooltip behavior immediately after tour close.

### Persistence

- Completion flag should be user-scoped and durable.
- Save completion only after successful final step trigger.
- Track partial progress analytically, but do not auto-mark complete early.
- Persist dismissal/skip state so dismissed users do not get forced re-entry on next visit.

## Risks and Mitigations

- Target drift from UI refactors:
  - Mitigation: stable `data-tour` attributes and QA checks.
- Redirect/unmount during initialization:
  - Mitigation: launch only after auth/profile/workout stable.
- Reorder-step ambiguity:
  - Mitigation: define one concrete reorder event contract (drag start/drop or reorder action callback).
- Visual overlap with existing tooltips/modals:
  - Mitigation: explicit layering and optional tooltip suppression while active.
- Event leakage:
  - Mitigation: strict listener cleanup per step transition/unmount.

## Acceptance Criteria

- Tour auto-starts only for users without completion flag.
- Each step advances only on required user action for the defined target.
- Overlay/spotlight remains visually correct and does not break existing tooltips.
- Tour completes and persists profile flag; revisit does not auto-launch.
- Failure states (missing target, route guard, loading state) do not crash page.

## Team Implementation Disclaimer

This roadmap defines behavioral requirements and recommended architecture.  
Engineering may choose Joyride, Shepherd, or a custom controller based on existing state architecture, performance constraints, and maintainability, as long as action-gated progression and completion persistence are preserved.

