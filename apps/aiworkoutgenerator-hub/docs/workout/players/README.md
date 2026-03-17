# Workout Player System Documentation

This directory contains documentation for the workout player system, which provides multiple views and modes for users to interact with their workouts.

## Overview

The workout player system is built around a single orchestrator component (`WorkoutPlayer`) that manages multiple view modes, phases, and timer states. The system supports both list-based and full-screen exercise views, with integrated interval timers for structured workout execution.

## Quick Reference

### Main Player Component

- **Component**: `WorkoutPlayer` (`src/components/workout/player/WorkoutPlayer.tsx`)
- **Purpose**: Main orchestrator that manages all player views, phases, and timer states
- **Entry Point**: Accessed via `/workouts/[id]/player` route

### View Modes

1. **Overview Mode** (`viewMode === "overview"`) - List view of exercises
2. **Active Mode** (`viewMode === "active"`) - Full-screen single exercise view
3. **Section Timer Mode** (`viewMode === "section-timer"`) - Full-screen interval timer
4. **Section Results Mode** (`viewMode === "section-results"`) - Completion summary and results display
5. **Section Complete Mode** (`viewMode === "section-complete"`) - Completion screen with next section prompt

**Note**: Cooldowns are no longer a separate view mode. They are rendered via `RoundCooldownDisplay` when `timerPhase === "cooldown"`, which can appear within section-results mode for final section cooldowns.

### Phases

- **Warmup** (`currentPhase === "warmup"`) - Initial warm-up section
- **Main** (`currentPhase === "main"`) - Main workout section
- **Finisher** (`currentPhase === "finisher"`) - High-intensity final section (only applicable in specific workout types)

### Timer Components

- **CompactSectionTimer** - Inline timer in overview/active views
- **SectionTimer** - Full-screen interval timer
- **RoundCooldownDisplay** - Cooldown timer display (rendered when `timerPhase === "cooldown"`)
- **SectionResults** - Section completion summary and results display

## Documentation Files

- [WorkoutPlayer.md](./WorkoutPlayer.md) - Main orchestrator component
- [ViewModes.md](./ViewModes.md) - Detailed view mode documentation
- [TimerComponents.md](./TimerComponents.md) - Timer component documentation
- [Terminology.md](./Terminology.md) - Glossary of terms and concepts

## Architecture

```
WorkoutPlayer (Orchestrator)
├── Overview Mode
│   ├── Phase Navigation
│   ├── Exercise Scroll Bar
│   └── CompactSectionTimer (inline)
├── Active Mode
│   ├── Full-Screen Exercise View
│   ├── Lateral Navigation
│   └── CompactSectionTimer (fixed footer)
├── Section Timer Mode
│   └── SectionTimer (full-screen)
├── Section Results Mode
│   ├── SectionResults (completion summary)
│   └── RoundCooldownDisplay (when timerPhase === "cooldown")
└── Section Complete Mode
    └── NextSectionPrompt
```

## Key Concepts

### Play Mode

When the compact timer is started in overview mode, the header becomes "sticky" and the view enters "Play Mode". This allows users to scroll through exercises while the timer runs.

### Timer Modes

- **Interval**: Complete all sets of one exercise before moving to next
- **Circuit**: One set of each exercise in a round, then loop
- **Interval + Circuit**: Combines both approaches

### Safety Mode

A simplified view that shows only essential exercise information, hiding detailed instructions and cues.
