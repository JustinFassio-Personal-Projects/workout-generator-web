# Timer Components Documentation

## Overview

The workout player system includes three main timer components, each serving different purposes in the workout experience.

## Timer Components

### 1. CompactSectionTimer

**File**: `src/components/workout/player/CompactSectionTimer.tsx`

**Purpose**: Inline timer that appears in overview and active views, providing timer controls without taking over the entire screen.

**Variants**:

- **`inline`** (default): Appears inline in the overview view, below exercise scroll bar
- **`fixed`**: Sticky footer in active view, always visible at bottom

**Features**:

- Circular progress indicator
- Timer controls (play, pause, stop, restart, skip, back)
- Volume control (mute/unmute, slider)
- Auto-scroll toggle
- Mode selection (Interval, Circuit, Interval+Circuit)
- Exercise preview (shows next exercise)
- Position indicator (e.g., "1 of 6 exercises")
- "Open Timer" button to switch to full-screen timer

**Timer Phases**:

- `setup`: Initial countdown before starting
- `active`: Work period
- `rest`: Rest period between sets/exercises
- `cooldown`: Final cooldown period
- `complete`: Section finished

**Timer Modes**:

- **Interval**: Complete all sets of one exercise before moving to next
- **Circuit**: One set of each exercise in a round, then loop
- **Interval + Circuit**: Combines both (first set of each, then second set, etc.)

**Key Props**:

- `config`: SectionTimerConfig - Timer configuration
- `variant`: "inline" | "fixed" - Layout variant
- `onOpenFullScreen`: Opens full-screen SectionTimer
- `autoScrollEnabled`: Whether auto-scroll is active
- `onAutoScrollChange`: Toggle auto-scroll
- `onCurrentExerciseChange`: Callback when timer progresses to next exercise

**Usage Locations**:

1. **Overview Mode**: Inline below exercise scroll bar
2. **Active Mode**: Fixed footer at bottom of screen

**Play Mode Behavior**:

- When started in overview mode, triggers sticky header
- Controls workout progression
- Auto-scrolls to active exercise (if enabled)
- Shows next exercise preview

---

### 2. SectionTimer

**File**: `src/components/workout/player/SectionTimer.tsx`

**Purpose**: Full-screen interval timer for immersive workout execution.

**Layout**:

- Full-screen display
- Large countdown timer
- Current exercise information
- Timer controls
- Progress indicators

**Features**:

- Immersive full-screen experience
- Large, easy-to-read timer
- Audio cues for transitions
- Complete timer controls
- Bilateral/bidirectional exercise support
- Section completion handling

**Timer Phases**:

- `setup`: Initial countdown
- `active`: Work period
- `rest`: Rest period
- `cooldown`: Final cooldown
- `complete`: Section finished

**Key Props**:

- `config`: SectionTimerConfig - Timer configuration
- `safetyMode`: Whether Safety Mode is enabled
- `onSectionComplete`: Callback when section finishes
- `onExerciseComplete`: Optional callback per exercise

**Usage**:

- Accessed via "Open Timer" button in CompactSectionTimer
- Automatically opens when starting timer from SectionTimerModal
- Full-screen view mode (`viewMode === "section-timer"`)

**Differences from CompactSectionTimer**:

- Full-screen (not inline)
- Larger timer display
- More immersive experience
- No lateral navigation (focuses on current exercise)
- No mode selection (uses configured mode)

---

### 3. RestTimer

**File**: `src/components/workout/player/RestTimer.tsx`

**Purpose**: Countdown timer for rest periods between workout sections.

**Layout**:

- Centered timer display
- Next section preview
- Rest instructions

**Features**:

- Simple countdown
- Next section information
- Safety Mode support

**Key Props**:

- `durationSeconds`: Rest duration
- `safetyMode`: Whether Safety Mode is enabled
- `explanation`: Rest instructions
- `nextExercise`: Preview of next section

**Usage**:

- **Note**: This component appears to be legacy/unused in the current implementation
- Cooldowns are now rendered via `RoundCooldownDisplay` when `timerPhase === "cooldown"` (not via `RestTimer`)
- Cooldown display is driven by timer phase state, not a separate view mode

---

## Timer Configuration

### SectionTimerConfig

All timers use the `SectionTimerConfig` type:

```typescript
interface SectionTimerConfig {
  sectionIndex: number;
  sectionType: string;
  exercises: ExerciseTimerConfig[];
  setupDuration: number;
  cooldownDuration: number;
  timerMode: TimerMode; // "interval" | "circuit" | "interval-circuit"
}
```

### ExerciseTimerConfig

Individual exercise timer settings:

```typescript
interface ExerciseTimerConfig {
  exerciseIndex: number;
  exerciseName: string;
  workDuration: number; // seconds
  restDuration: number; // seconds
  sets: number;
  isBilateral?: boolean;
  isBidirectional?: boolean;
}
```

## Timer State Management

### Compact Timer State (in WorkoutPlayer)

- `shouldStartCompactTimer`: Trigger to start timer
- `isCompactTimerRunning`: Whether timer is currently running
- `shouldPauseCompactTimer`: Trigger to pause timer
- `autoScrollEnabled`: Whether auto-scroll is active
- `currentTimerExerciseIndex`: Current exercise index from timer

### Timer Synchronization

The compact timer and full-screen timer share the same configuration but maintain separate state. When switching between them:

- Configuration is shared
- Timer state is preserved where possible
- Current exercise index is synchronized

## Timer Modes Explained

### Interval Mode

- Completes all sets of one exercise before moving to next
- Example: 3 sets of Push-ups, then 3 sets of Squats
- Display: "Set 1 of 3", "Set 2 of 3", etc.
- Preview: Shows same exercise (next set) or next exercise if last set

### Circuit Mode

- One set of each exercise in a round, then loops
- Uses stopwatch (counts up) for work periods
- Manual rest (user presses start when ready)
- Example: Push-ups (set 1) → Squats (set 1) → Lunges (set 1) → repeat
- Display: "1 of 6 exercises"
- Preview: Always shows next exercise

### Interval + Circuit Mode

- Combines countdown timer with circuit progression
- First set of each exercise, then second set of each, etc.
- Example: Push-ups (set 1) → Squats (set 1) → Push-ups (set 2) → Squats (set 2)
- Display: "1 of 6 exercises"
- Preview: Always shows next exercise

## Best Practices

1. **Always provide a default config** if none exists (for active view)
2. **Synchronize timer state** between compact and full-screen timers
3. **Handle timer completion** gracefully (transition to next section or completion screen)
4. **Support all timer modes** consistently across components
5. **Provide clear visual feedback** for timer phases and transitions
