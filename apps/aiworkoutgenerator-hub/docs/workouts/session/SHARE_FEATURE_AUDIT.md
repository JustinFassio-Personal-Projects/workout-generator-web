# Session Report Share Feature - Implementation Audit

## Overview

The Session Report share feature allows users to share their completed workout session reports publicly. Users can choose to share:

1. **Session Report Only** - Just the completion metrics, stats, and notes
2. **Session Report & Workout** - Both the report and the full workout plan

The feature is functional but the public shared view UI does not match the user's own session report view UI.

## Architecture

### Data Flow

```
User completes workout
  ↓
WorkoutSummaryService.saveSummary() creates summary document
  ↓
User clicks Share FAB → ShareModal opens
  ↓
User selects share option (summary_only | summary_and_workout)
  ↓
ShareService.publish() updates visibility to "public"
  ↓
Public URL: /summary/[summaryId]
  ↓
PublicSummaryPage renders shared view
```

### Key Components

1. **ShareModal** (`src/components/share/ShareModal.tsx`)
   - Handles share option selection
   - Manages publish/unpublish actions
   - Shows current share status
   - Generates shareable URL

2. **ShareService** (`src/services/share/ShareService.ts`)
   - `publishSummaryOnly()` - Sets summary visibility to "public"
   - `publishSummaryAndWorkout()` - Sets both summary and workout to "public" (atomic batch)
   - `unpublish()` - Reverts visibility to "private"
   - `getShareStatus()` - Checks current share state

3. **User's Session Report View** (`src/components/session/WorkoutSessionSummary.tsx`)
   - Dark theme UI (slate-900/800 backgrounds)
   - Full-featured display with all data
   - Used at `/workouts/[id]/summary` route

4. **Public Shared View** (`src/app/summary/[id]/page.tsx`)
   - Light theme UI (white/stone backgrounds)
   - Simplified display
   - Used at `/summary/[id]` route (public, no auth required)

## Current Implementation Details

### Share Options

The `ShareOption` type supports two modes:

- `"summary_only"` - Only the session report is public
- `"summary_and_workout"` - Both report and workout are public

### Firestore Structure

**Summary Document** (`workout_summaries` collection):

- `visibility`: "private" | "public"
- `published_at`: Timestamp (when made public)
- Contains all session data: stats, sections, exercises, feedback, notes

**Workout Document** (`trainer_workouts` collection):

- `visibility`: "private" | "public" (only set when option 2 is selected)
- `published_at`: Timestamp
- Contains full workout plan with exercises

### URL Generation

- Share URLs use `getPublicSummaryUrl(summaryId)` from `src/lib/share-config.ts`
- Format: `{domain}/summary/{summaryId}`
- Domain resolution:
  - Development: Uses current origin (localhost)
  - Production: Uses `NEXT_PUBLIC_PUBLIC_SHARE_DOMAIN` or defaults to marketing site

## UI Comparison: User View vs Public View

### User's Session Report View (`WorkoutSessionSummary.tsx`)

**Theme & Styling:**

- Dark theme: `bg-slate-900/40`, `bg-slate-800`, `text-white`
- Backdrop blur effects: `backdrop-blur-md`
- Modern card design with rounded corners and borders
- Orange accent color for icons and highlights

**Header:**

- Dark slate background with blur
- "Session Report" title with Zap icon (orange)
- Completion percentage badge (emerald)
- Close button (X icon) to return to Session Reports page
- Difficulty badge

**Sections:**

1. **Share Banner** (when published):
   - Emerald-themed banner showing share status
   - Share URL with copy button
   - Indicates if workout is also shared

2. **Intro Section:**
   - Dark slate card with descriptive text
   - Explains purpose of the report

3. **Session Statistics:**
   - Three stat cards: Total Time, Sets Completed, Strain Score
   - Dark slate cards with white text
   - Icons: Clock, Zap, TrendingUp
   - Subtext explanations

4. **Completed Log:**
   - Phase selector tabs with icons (Flame, Dumbbell, Zap, Wind)
   - Grid layout for phase selection
   - Exercise preview cards with:
     - Exercise name
     - Sets completed/planned
     - Numbered badges
     - Hover effects

5. **Session Feedback:**
   - Large section with "Session Feedback" title
   - Edit button for modifying feedback
   - Autoregulation data display:
     - Session Intensity (RPE) with label
     - Weight Selection
     - Session Feedback options (what impacted workout)
     - Joint Pain Location (if applicable)
     - Notes for Next Time
   - CheckCircle icons for each feedback item
   - Empty state when no feedback exists

### Public Shared View (`PublicSummaryPage.tsx`)

**Theme & Styling:**

- Light theme: `bg-white`, `bg-stone-50`, `text-stone-800`
- No backdrop blur
- Simple card design
- Orange accent for highlights

**Header:**

- White background with stone border
- "Session Report" title with emoji (⚡)
- Completion percentage badge (emerald)
- Difficulty badge
- No close button (public page)

**Sections:**

1. **Intro Section:**
   - White card with stone border
   - Basic description text

2. **Session Statistics:**
   - Three stat cards: Total Time, Sets Completed, Strain Score
   - Light stone cards with dark text
   - Icons: Clock, Zap, TrendingUp
   - Similar layout but different styling

3. **Completed Log:**
   - Simple text-based phase tabs (no icons)
   - Basic border-bottom tabs
   - Exercise list with:
     - Checkmark (✓) instead of numbered badges
     - Exercise name and sets
     - Simple list layout (no cards)
   - Scrollable container

4. **User Notes** (if exists):
   - Simple white card
   - Shows `user_notes` field

5. **User Ratings** (if exists):
   - Shows difficulty_rating and enjoyment_rating
   - Simple number display

6. **Missing Sections:**
   - ❌ No Session Feedback section
   - ❌ No autoregulation data (RPE, weight selection, session feedback options)
   - ❌ No joint pain location
   - ❌ No "Notes for Next Time" (only shows `user_notes` which is different)

7. **CTA Section:**
   - Orange gradient banner
   - "Start Your Fitness Journey" call-to-action
   - Link to homepage

## Key Differences Summary

| Feature             | User View               | Public View          | Status      |
| ------------------- | ----------------------- | -------------------- | ----------- |
| Theme               | Dark (slate)            | Light (stone/white)  | ❌ Mismatch |
| Header Style        | Dark with blur          | White with border    | ❌ Mismatch |
| Phase Selector      | Icons + grid            | Text tabs only       | ❌ Mismatch |
| Exercise Display    | Card-based with numbers | List with checkmarks | ❌ Mismatch |
| Session Feedback    | Full section with edit  | Missing entirely     | ❌ Missing  |
| Autoregulation Data | RPE, weight, feedback   | Missing              | ❌ Missing  |
| Notes Display       | "Notes for Next Time"   | Only `user_notes`    | ⚠️ Partial  |
| Share Banner        | Emerald banner          | N/A (public page)    | ✅ N/A      |

## Data Availability

The `WorkoutSummary` type includes all necessary data for the public view:

- `session_rpe?: number | null`
- `weight_selection?: WeightSelection | null`
- `session_feedback?: string[]`
- `joint_pain_location?: string | null`
- `user_notes?: string | null`

All this data is stored in Firestore and accessible in the public view, but is not currently displayed.

## Security & Access Control

### Firestore Security Rules

The public view relies on Firestore security rules to:

1. Allow read access to summaries with `visibility === "public"`
2. Prevent access to private summaries
3. The route `/summary/[id]` does not require authentication

### Current Access Pattern

```typescript
// PublicSummaryPage checks visibility
if (data.visibility !== "public") {
  setError("This summary is private");
  return;
}
```

## Issues Identified

1. **UI Inconsistency**: Public view uses completely different theme and styling
2. **Missing Features**: Session Feedback section is not displayed in public view
3. **Incomplete Data**: Autoregulation data (RPE, weight selection, session feedback) is not shown
4. **Different Layout**: Phase selector and exercise display are simplified
5. **Notes Confusion**: Public view shows `user_notes` but user view shows it as "Notes for Next Time" in Session Feedback section

## Next Steps (Update 2)

The second update should:

1. Align public view UI with user view UI (dark theme, same components)
2. Add Session Feedback section to public view
3. Display all autoregulation data
4. Match phase selector and exercise display styling
5. Ensure consistent data presentation

## Files Involved

### Core Share Feature

- `src/components/share/ShareModal.tsx` - Share UI
- `src/services/share/ShareService.ts` - Share logic
- `src/lib/share-config.ts` - URL generation

### User View

- `src/components/session/WorkoutSessionSummary.tsx` - User's session report view
- `src/app/workouts/[id]/summary/page.tsx` - User view route

### Public View

- `src/app/summary/[id]/page.tsx` - Public shared view (needs update)

### Supporting

- `src/types/workoutSummary.ts` - Data types
- `src/lib/autoregulation.ts` - Feedback labels and utilities
