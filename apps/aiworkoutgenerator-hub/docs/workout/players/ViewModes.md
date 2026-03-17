# View Modes Documentation

## Overview

The workout player supports five distinct view modes, each optimized for different stages of the workout experience.

## View Mode Types

### 1. Overview Mode (`viewMode === "overview"`)

**Purpose**: List-based view showing all exercises in the current section.

**Layout**:

- Phase navigation tabs at top
- Timer setup/start buttons
- Horizontal exercise scroll bar
- Compact timer (when configured)
- Scrollable list of exercise cards

**Features**:

- See all exercises at once
- Quick navigation via scroll bar
- Start timer to enter Play Mode
- Auto-scroll to active exercise (when timer running)
- Sticky header when Play Mode active

**Key Components**:

- `ExerciseCardPlayer` (rendered in list)
- `CompactSectionTimer` (inline variant)
- Phase navigation
- Exercise scroll bar

**When to Use**:

- Initial workout view
- Browsing exercises
- Setting up timer
- General workout navigation

---

### 2. Active Mode (`viewMode === "active"`)

**Purpose**: Full-screen view of a single exercise with detailed information.

**Layout**:

- Full-screen exercise display
- Single large exercise image
- Lateral navigation arrows
- Back button to return to overview
- Compact timer in fixed footer
- Sticky header with navigation controls

**Features**:

- Large exercise image
- Full exercise details visible without scrolling (tablet+ screens)
- Lateral navigation between exercises
- Compact timer always visible (uses default config if none set)
- Auto-scroll lateral navigation (when timer active)
- Responsive layout: No scrolling required on tablet+ screens, scrollable on mobile with proper footer spacing

**Key Components**:

- `ExerciseCardPlayer` (full-screen, `isActive={true}`)
- `CompactSectionTimer` (fixed footer variant)
- Lateral navigation controls
- Sticky header with back button and exercise navigation

**Layout Behavior**:

- **Tablet and Larger (≥768px)**:
  - Flexbox layout ensures all content (header, exercise card, footer) fits in viewport
  - No scrolling required - all content visible simultaneously
  - Exercise card content fits naturally between sticky header and fixed footer
- **Mobile (<768px)**:
  - Scrollable layout with proper bottom padding (192px) to account for fixed footer
  - Sticky header remains visible at top
  - Fixed footer remains visible at bottom
  - All exercise card content accessible via scrolling

**When to Use**:

- Need detailed exercise instructions
- Want to see large exercise image
- Focused exercise execution
- Better for laptop/desktop viewing (optimal experience)
- Full screen mode for workouts

**Navigation**:

- **Back Button**: Returns to overview mode
- **Left/Right Arrows**: Navigate to previous/next exercise in section
- **Auto-scroll**: Automatically navigates when timer progresses (if enabled)

---

### 3. Section Timer Mode (`viewMode === "section-timer"`)

**Purpose**: Full-screen interval timer for structured workout execution.

**Layout**:

- Full-screen timer display
- Large countdown timer
- Current exercise information
- Timer controls (play, pause, skip, restart)
- Progress indicators

**Features**:

- Immersive timer experience
- Clear visual feedback
- Audio cues for transitions
- Complete timer controls
- Section completion handling

**Key Components**:

- `SectionTimer` (full-screen)

**When to Use**:

- Following structured interval workout
- Need full-screen timer focus
- Want maximum timer visibility

**Access**:

- Click "Open Timer" button in CompactSectionTimer
- Automatically opens when starting timer from modal

---

### 4. Section Results Mode (`viewMode === "section-results"`)

**Purpose**: Completion summary and results display after finishing a section.

**Layout**:

- Completion statistics
- Exercise completion list
- Next section preview
- Action buttons (Continue to Next Section, Return to Overview, Finish Workout)

**Features**:

- Shows completed exercises and sets
- Displays workout progress
- Provides navigation options
- Can show section cooldown timer (via RoundCooldownDisplay when timerPhase === "cooldown")

**Key Components**:

- `SectionResults`
- `RoundCooldownDisplay` (when showing final section cooldown)

**When to Use**:

- Automatically shown after section timer completes
- Displays completion summary and allows navigation to next section

**Note**: Cooldowns are no longer a separate view mode. They are rendered via `RoundCooldownDisplay` when `timerPhase === "cooldown"`, which can appear within section-results mode for the final section cooldown.

---

### 5. Section Complete Mode (`viewMode === "section-complete"`)

**Purpose**: Completion screen after finishing a section.

**Layout**:

- Completion message
- Next section prompt
- Continue button

**Features**:

- Acknowledges section completion
- Prompts for next section
- Smooth transition to next phase

**Key Components**:

- `NextSectionPrompt`

**When to Use**:

- Automatically shown after section timer completes
- After all exercises in section are done

---

## View Mode Transitions

### Overview ↔ Active

- **To Active**: Click exercise in scroll bar or list
- **To Overview**: Click back button in active view

### Overview/Active → Section Timer

- **To Section Timer**: Click "Open Timer" in CompactSectionTimer

### Section Timer → Overview

- **To Overview**: Timer completes or user exits

### Section Timer → Section Results

- **To Section Results**: Section timer completes, shows completion summary

### Section Results → Overview/Next Section

- **To Overview**: User clicks "Return to Overview"
- **To Next Section**: User clicks "Continue to Next Section" (opens timer modal for next section)

## View Mode State Management

View modes are managed by the `viewMode` state variable in `WorkoutPlayer`:

```typescript
type ViewMode =
  | "overview"
  | "active"
  | "section-timer"
  | "section-results"
  | "section-complete";

const [viewMode, setViewMode] = useState<ViewMode>("overview");
```

Transitions are handled by specific handler functions:

- `handleExerciseSelect()` - Sets to "active"
- `handleBackFromActive()` - Sets to "overview"
- `handleOpenFullScreenTimer()` - Sets to "section-timer"
- `handleSectionComplete()` - Sets to "section-results"

## Conditional Rendering

Each view mode conditionally renders its specific content:

```typescript
{viewMode === "overview" && (
  // Overview content
)}

{viewMode === "active" && activeExercise && (
  // Active content
)}

{viewMode === "section-timer" && activeSectionTimerConfig && (
  // Section timer content
)}

{viewMode === "section-results" && completedSectionIndex !== null && (
  // Section results content
)}

{viewMode === "section-complete" && completedSectionIndex !== null && (
  // Section complete prompt
)}
```

**Note**: Cooldowns are not a separate view mode. They are rendered via `RoundCooldownDisplay` when `timerPhase === "cooldown"`, which can appear within section-results mode for final section cooldowns.

## Best Practices

1. **Always check viewMode before rendering view-specific components**
2. **Preserve activeExercise state when transitioning between overview and active**
3. **Reset viewMode to "overview" when changing phases**
4. **Handle timer state consistently across view modes**
5. **Maintain sticky header state in Play Mode**
