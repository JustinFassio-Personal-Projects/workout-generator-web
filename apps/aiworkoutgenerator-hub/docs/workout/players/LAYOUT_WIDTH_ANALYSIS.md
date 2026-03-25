# Workout Player Layout Width Analysis

## Problem

The workout player constrains content to a narrow centered box (~672px) instead of utilizing the full screen, despite the user base being 85% desktop/laptop.

## Root Cause (Code, Not Docs)

**There is no documentation or design system mandating a narrow layout.** The constraints are hardcoded in the implementation.

### Constraint Chain

| Location | File | Line | Constraint | Effect |
|----------|------|------|------------|--------|
| 1 | `ManualWorkoutPlayer.tsx` | 305 | `flex flex-col items-center` | Centers all children horizontally |
| 2 | `ManualWorkoutPlayer.tsx` | 307 | `max-w-2xl` | Prev/Next controls limited to 672px |
| 3 | `ManualWorkoutPlayer.tsx` | 350 | `className="w-full max-w-2xl"` | Exercise card capped at 672px |
| 4 | `ManualExerciseCard.tsx` | 125 | `w-[min(100%,400px)] md:w-[min(100%,520px)]` | Card's own internal cap (400px mobile, 520px desktop); parent override takes precedence |

### What Is NOT Constraining

- **WorkoutPlayerShell**: Uses `w-full` with padding only (`px-4 sm:px-6 lg:px-8`). No max-width.
- **Player page**: No layout wrapper; passes through to ManualWorkoutPlayer.
- **Documentation**: `WorkoutPlayer.md` and `README.md` describe view modes and state, not layout width.
- **Design system**: No global rule for workout player width.

### Why It Exists

Likely origins:

1. **Typography convention**: Many UIs cap content width (e.g. `max-w-2xl` / `max-w-5xl`) for readability.
2. **Legacy pattern**: Copied from `WorkoutPlayer` / `ExerciseCardPlayer` or other pages (e.g. workouts page uses `max-w-5xl`, board uses `max-w-6xl`).
3. **Implementation plan**: `ManualWorkoutPlayer` plan did not specify full-width layout.

### Fix Locations

To use the full screen:

1. **ManualWorkoutPlayer.tsx**
   - Remove or raise `max-w-2xl` on the main content wrapper and `ManualExerciseCard`.
   - Replace `items-center` with `items-stretch` (or remove centering) so content can span the width.
2. **ManualExerciseCard.tsx**
   - Remove or raise internal `w-[min(100%,400px)] md:w-[min(100%,520px)]` so the card can grow with the viewport.
