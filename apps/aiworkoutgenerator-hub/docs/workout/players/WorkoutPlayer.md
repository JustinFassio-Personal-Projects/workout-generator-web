# WorkoutPlayer Component

**File**: `src/components/workout/player/WorkoutPlayer.tsx`

## Overview

The `WorkoutPlayer` is the main orchestrator component for the entire workout player experience. It manages phase navigation, exercise selection, view mode transitions, Safety Mode, section-based timers, and all user interactions.

## Responsibilities

1. **Phase Management**:
   - Maps workout sections to phases (warmup, main, finisher)
   - Handles phase navigation
   - Tracks current active phase

2. **View Mode Management**:
   - Controls transitions between different view modes
   - Manages active exercise state
   - Handles view-specific UI rendering

3. **Timer Orchestration**:
   - Manages section timer configurations
   - Coordinates between compact and full-screen timers
   - Handles timer state synchronization

4. **Exercise Navigation**:
   - Manages exercise selection in overview mode
   - Handles lateral navigation in active mode
   - Tracks active exercise across views

5. **State Management**:
   - Maintains workout state
   - Manages Safety Mode toggle
   - Handles AI exercise editor state

## Key State Variables

### View Modes

```typescript
type ViewMode =
  | "overview" // List view of exercises
  | "active" // Full-screen single exercise view
  | "section-timer" // Full-screen interval timer
  | "section-results" // Section results and cooldown view
  | "section-complete"; // Completion screen
```

### Phases

```typescript
type PhaseType = "warmup" | "main" | "finisher";
```

### Key State

- `viewMode`: Current view mode
- `currentPhase`: Current workout phase
- `activeExercise`: Currently selected exercise (sectionIdx, exerciseIdx)
- `safetyMode`: Whether Safety Mode is enabled
- `isCompactTimerRunning`: Whether the compact timer is active
- `autoScrollEnabled`: Whether auto-scroll is enabled

## View Mode Transitions

### Overview → Active

- Triggered by: User clicks an exercise in the scroll bar
- Action: Sets `viewMode` to `"active"` and `activeExercise` to selected exercise

### Active → Overview

- Triggered by: User clicks back button in active view
- Action: Sets `viewMode` to `"overview"` and clears `activeExercise`

### Overview/Active → Section Timer

- Triggered by: User clicks "Open Timer" button in CompactSectionTimer
- Action: Sets `viewMode` to `"section-timer"` and loads timer config

### Section Timer → Overview

- Triggered by: Timer completes or user exits
- Action: Sets `viewMode` to `"overview"`

### Cooldown Display

- **Not a separate view mode**: Cooldowns are displayed when `timerPhase === "cooldown"`
- Shown during round cooldowns (interval-circuit mode) or final section cooldowns
- Displays `RoundCooldownDisplay` component with timer and summary
- Can appear in any view mode when the timer enters cooldown phase

## Play Mode

When the compact timer is started in overview mode, the system enters "Play Mode":

1. The header (phase nav, timer buttons, exercise scroll bar, compact timer) becomes sticky
2. Auto-scroll can be enabled to automatically scroll to the active exercise
3. The compact timer controls the workout progression
4. Users can scroll through exercises while the timer runs

## Component Structure

```
WorkoutPlayer
├── Header (sticky when Play Mode active)
│   ├── Safety Toggle
│   ├── Conflict Resolution
│   ├── Phase Navigation
│   ├── Timer Buttons (Start/Edit)
│   ├── Exercise Scroll Bar
│   └── CompactSectionTimer (inline)
├── Main Content Area
│   ├── Overview Mode Content
│   │   └── ExerciseCardPlayer (list)
│   ├── Active Mode Content
│   │   ├── ExerciseCardPlayer (full-screen)
│   │   └── CompactSectionTimer (fixed footer)
│   ├── Section Timer Mode
│   │   └── SectionTimer (full-screen)
│   ├── Section Results Mode
│   │   └── SectionResults (completion summary)
│   └── Cooldown Display (when timerPhase === "cooldown")
│       └── RoundCooldownDisplay (round or section cooldown)
└── Modals
    ├── SectionTimerModal
    └── AIExerciseEditor
```

## Key Functions

### `handlePhaseChange(phase: PhaseType)`

Switches to a different workout phase and resets view to overview.

### `handleExerciseSelect(sectionIdx: number, exerciseIdx: number)`

Selects an exercise and switches to active view mode.

### `handleStartCompactTimer()`

Starts or pauses the compact timer, entering/exiting Play Mode.

### `handleOpenFullScreenTimer()`

Opens the full-screen SectionTimer view.

### `handleSaveSectionTimerConfig(config: SectionTimerConfig)`

Saves timer configuration to the workout and updates local state.

## Integration Points

- **ExerciseCardPlayer**: Renders individual exercises in both overview and active modes
- **CompactSectionTimer**: Provides inline timer controls in overview and active views
- **SectionTimer**: Full-screen interval timer experience
- **SectionTimerModal**: Configuration UI for setting up timers
- **AIExerciseEditor**: Allows editing exercises during workout
