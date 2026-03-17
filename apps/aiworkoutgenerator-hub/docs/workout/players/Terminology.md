# Workout Player Terminology

This document provides a glossary of terms and concepts used in the workout player system to ensure consistent communication during development.

## Core Concepts

### Workout Player

The main workout execution interface, accessible via `/workouts/[id]/player`. The `WorkoutPlayer` component orchestrates all views and interactions.

### View Mode

The current display mode of the workout player. Five distinct modes:

- **Overview Mode**: List view of exercises
- **Active Mode**: Full-screen single exercise view
- **Section Timer Mode**: Full-screen interval timer
- **Cooldown Mode**: Rest timer between sections
- **Section Complete Mode**: Completion screen

### Phase

A workout section category. Three phases:

- **Warmup**: Initial warm-up section
- **Main**: Main workout section
- **Finisher**: High-intensity final section (only applicable in specific workout types, not a cooldown/stretching phase)

### Section

A group of exercises within a workout. Each workout can have multiple sections, each mapped to a phase (warmup, main, finisher).

### Exercise

An individual movement or activity within a section. Each exercise has:

- Name
- Sets and reps
- Instructions
- Images
- Muscle targets
- Cues

## Timer Terminology

### Compact Timer

The inline timer component (`CompactSectionTimer`) that appears in overview and active views. Provides timer controls without taking over the screen.

### Full-Screen Timer

The immersive timer component (`SectionTimer`) that takes over the entire screen for focused workout execution.

### Section Timer

A timer configured for a specific workout section. Includes setup, work periods, rest periods, and cooldown.

### Timer Mode

The progression pattern for exercises:

- **Interval**: Complete all sets of one exercise before moving to next
- **Circuit**: One set of each exercise in a round, then loop
- **Interval + Circuit**: Combines both approaches

### Timer Phase

The current stage of the timer:

- **Setup**: Initial countdown before starting
- **Active**: Work period (exercise execution)
- **Rest**: Rest period between sets/exercises
- **Cooldown**: Final cooldown period
- **Complete**: Section finished

### Play Mode

When the compact timer is started in overview mode, the system enters "Play Mode":

- Header becomes sticky
- Timer controls workout progression
- Auto-scroll can be enabled
- User can scroll through exercises while timer runs

## Navigation Terminology

### Overview Navigation

Navigation within the overview mode:

- **Phase Navigation**: Switching between warmup/main/finisher
- **Exercise Scroll Bar**: Horizontal tabs for quick exercise selection
- **Exercise List**: Vertical scrollable list of exercise cards

### Active Navigation

Navigation within the active (full-screen) view:

- **Lateral Navigation**: Left/right arrows to move between exercises
- **Back Navigation**: Return to overview mode
- **Auto-scroll Lateral**: Automatic navigation when timer progresses

### Exercise Selection

The act of choosing an exercise to view:

- **In Overview**: Clicking exercise in scroll bar or list
- **In Active**: Using lateral navigation arrows
- **Result**: Sets `activeExercise` state and switches to active view

## Component Terminology

### ExerciseCardPlayer

The component that renders individual exercises. Used in both overview (list) and active (full-screen) modes.

### CompactSectionTimer

The inline timer component with compact controls. Has two variants:

- **Inline Variant**: Appears in overview mode, below exercise scroll bar
- **Fixed Variant**: Sticky footer in active mode

### SectionTimer

The full-screen interval timer component for immersive workout execution.

### Sticky Header

The header section (phase nav, timer buttons, exercise scroll bar, compact timer) that becomes fixed at the top when Play Mode is active.

## State Terminology

### Active Exercise

The currently selected exercise, represented as:

```typescript
{
  sectionIdx: number;
  exerciseIdx: number;
}
```

### Timer State

Various states related to timer operation:

- **isCompactTimerRunning**: Whether compact timer is active
- **shouldStartCompactTimer**: Trigger to start timer
- **shouldPauseCompactTimer**: Trigger to pause timer
- **autoScrollEnabled**: Whether auto-scroll is active
- **currentTimerExerciseIndex**: Current exercise index from timer

### View State

States related to view management:

- **viewMode**: Current view mode
- **currentPhase**: Current workout phase
- **safetyMode**: Whether Safety Mode is enabled

## Interaction Terminology

### Start Timer

Initiating the compact timer, which:

- Enters Play Mode (if in overview)
- Begins timer countdown
- Enables workout progression

### Pause Timer

Temporarily stopping the timer while remaining in Play Mode.

### Stop Timer

Stopping the timer and exiting Play Mode, returning to normal view.

### Open Timer

Switching from compact timer to full-screen SectionTimer view.

### Auto-Scroll

Automatic scrolling/navigation to the active exercise when timer progresses. Can be:

- **Vertical**: In overview mode, scrolls to exercise in list
- **Lateral**: In active mode, navigates to next/previous exercise

## Display Terminology

### Safety Mode

A simplified view that shows only essential exercise information, hiding detailed instructions and cues.

### Exercise Images

Images displayed for exercises:

- **Primary Image**: Main exercise image
- **4-Image Grid**: Full-screen view shows 4 images (positions 1-4)
- **Certified Images**: Images that have been reviewed and approved

### Exercise Details

Information shown for each exercise:

- **Form Cues**: Key movement instructions
- **Set Details**: Sets, reps, rest periods
- **Muscle Targets**: Primary muscles worked
- **Clinical Basis**: Scientific rationale

## Development Terminology

### IIFE Pattern

Immediately Invoked Function Expression pattern used for conditional rendering with null checks:

```typescript
{condition && (() => {
  const config = getConfig();
  if (!config) return null;
  return <Component config={config} />;
})()}
```

### Sticky Positioning

CSS positioning that makes an element stick to the viewport when scrolling. Used for header in Play Mode.

### Variant Prop

A prop that controls component layout/behavior:

- `variant="inline"`: Normal flow positioning
- `variant="fixed"`: Fixed/sticky positioning

## Common Phrases

- **"In overview mode"**: Referring to the list view
- **"In active view"**: Referring to the full-screen exercise view
- **"Play Mode"**: When timer is running and header is sticky
- **"Compact timer"**: The inline timer component
- **"Full-screen timer"**: The SectionTimer component
- **"Lateral navigation"**: Left/right navigation in active view
- **"Exercise scroll bar"**: Horizontal tabs in overview mode
