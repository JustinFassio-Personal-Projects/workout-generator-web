# Interval & Safety Timer State Machine Cleanup (Future PR)

This document tracks planned cleanup work for the workout player timers that is **out of scope for the current feature branch**, but should be addressed in a dedicated refactor PR.

## Scope

- `src/components/workout/player/ActiveTimer.tsx`
- `src/components/workout/player/SectionTimer.tsx`
- `src/components/workout/player/ConflictResolution.tsx`
- `src/components/workout/player/SafetyToggle.tsx`

## Current State

- Timer logic is implemented using:
  - A single `useEffect` in `ActiveTimer` that:
    - Manages countdown
    - Handles bilateral side switching
    - Fires completion callbacks and vibrations
  - A similar effect in `SectionTimer` that:
    - Drives the section-level state machine (`setup` → `active` → `rest` / `transition` → `complete`)
  - One-shot UI animation effects in `ConflictResolution` and preference bootstrapping in `SafetyToggle`.
- For correctness, we intentionally suppress `react-hooks/set-state-in-effect` in a few places with comments explaining why:
  - Local state is being synchronized with derived timer state (no external side effects).
  - Effects are used as the central state machine for time-based transitions.

## Pain Points / Tech Debt

- **Lint suppressions**:
  - Multiple `// eslint-disable-next-line react-hooks/set-state-in-effect` blocks are required to keep the timer logic readable, which can mask future misuses.
- **Monolithic effects**:
  - `ActiveTimer`'s effect handles countdown, bilateral switching, and completion in one block, which is correct but dense.
  - `SectionTimer` combines multiple phase transitions (`setup`, `active`, `rest`, `transition`, `complete`) in one path, making it harder to reason about edge cases.
- **Implicit state machine**:
  - Timer phases are encoded as a combination of `phase` + several booleans (`isPaused`, `showSwitchOverlay`, `bilateralSide`), instead of a single explicit state machine.

## Goals for Cleanup PR

1. **Make the timer state machines explicit**
   - Consider introducing a small internal reducer or state-machine helper _local to the timer components_ (no cross-module abstraction) for:
     - `ActiveTimer` work/rest + bilateral logic.
     - `SectionTimer` phase transitions.
   - Preserve existing public props and behavior to avoid regressions.

2. **Reduce or localize eslint disables**
   - Where feasible, restructure effects so that:
     - `setState` calls happen in callbacks (e.g., `setInterval` handlers) instead of synchronously in the effect body.
     - We can remove or narrow `react-hooks/set-state-in-effect` disables.
   - If a disable is still required (e.g., one-shot animation trigger), keep it tightly scoped with an explicit rationale comment.

3. **Improve testability**
   - Extract pure helpers for:
     - Computing next phase given current phase, `timeRemaining`, and bilateral state.
     - Mapping `workDuration` to per-side work for bilateral exercises.
   - Add unit tests around these pure helpers to lock in behavior before altering effects.

4. **Preserve UX semantics**
   - Ensure the cleanup preserves:
     - Existing vibration patterns (warnings, switches, completions).
     - Existing visual states:
       - "Switch direction" banner timing (2–3s before and after side changes).
       - Section-complete and conflict-resolution animations.
     - Safety-First Mode behavior (styling + messaging).

## Non-Goals

- No changes to API contracts (`ai-interval-timer` endpoint, `WorkoutPlayer` props).
- No changes to Firestore schemas or timer persistence types.
- No new global timer utilities; keep all abstractions local to the `player` directory.

## Suggested Implementation Steps (for future PR)

1. **Guardrails**
   - Add basic tests for existing timer behavior (happy path + bilateral + multi-set).
2. **Refactor `ActiveTimer`**
   - Introduce a small internal reducer for `TimerState` (running/paused/switching) and side tracking.
   - Keep the main countdown effect, but move as much branching as possible into pure helper functions.
3. **Refactor `SectionTimer`**
   - Extract a pure function `getNextSectionPhase(currentState)` that returns the next phase and derived counters.
   - Use that function from the effect instead of spreading the transition logic across the effect body.
4. **Review lint disables**
   - After refactor, remove or further localize `react-hooks/set-state-in-effect` disables where safe.

> **Note:** This document is a planning artifact only. The actual refactor should be done in a separate branch/PR with focused reviews and regression testing on the workout player UI.
