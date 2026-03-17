# Session Report vs Summary Terminology

## Overview

This document explains the intentional terminology mismatch between user-facing UI text and internal code naming conventions for session reports/summaries.

## User-Facing Terminology: "Session Report"

Throughout the user interface, we consistently use **"Session Report"** (or "Session Reports" for plural) to refer to the saved snapshots of completed workouts. This terminology is used in:

- Page titles (e.g., "Session Reports" page)
- Button labels (e.g., "View Report")
- Modal titles and descriptions
- Analytics labels (e.g., "Total Reports")
- Empty states and messages
- Aria labels for accessibility
- Share functionality (e.g., "Share Session Report")

## Internal Code Terminology: "Summary"

Internally, the codebase uses **"Summary"** terminology for:

- Service class names: `WorkoutSummaryService`
- Type names: `WorkoutSummary`, `SummaryAnalytics`
- Variable names: `summary`, `summaries`, `summaryId`
- Method names: `getSummary()`, `saveSummary()`, `getUserSummaries()`
- Firestore collection: `workout_summaries`
- Route paths: `/summaries` (URLs don't need to match UI labels)

## Why This Mismatch Exists

1. **Code Stability**: Internal code names (services, types, variables) remain unchanged to maintain stability and avoid breaking changes across the codebase.

2. **User Experience**: User-facing text uses "Session Report" for clarity and consistency with the actual document type (a report of a completed session).

3. **Historical Context**: The codebase originally used "summary" terminology, and we've updated the UI to use "report" while keeping internal code names for stability.

## Key Files and Their Terminology

### User-Facing (Uses "Session Report")

- `src/app/summaries/page.tsx` - Page title, labels, empty states
- `src/components/session/WorkoutSessionSummary.tsx` - Header, aria labels
- `src/components/share/ShareModal.tsx` - Share options
- `src/components/share/ShareFAB.tsx` - Share button labels
- `src/app/summary/[id]/page.tsx` - Public summary page

### Internal Code (Uses "Summary")

- `src/services/summaries/WorkoutSummaryService.ts` - Service class and methods
- `src/types/workoutSummary.ts` - Type definitions
- `src/services/session/SessionSummaryService.ts` - Service for generating reports
- Firestore collection: `workout_summaries`

## Code Comments

Code comments have been updated to use "Session Report" terminology when describing user-facing concepts, while maintaining "summary" in internal implementation details. For example:

```typescript
/**
 * Save a session report to Firestore
 *
 * @param summary - The session report data
 * @returns The document ID of the saved report
 */
static async saveSummary(...)
```

## Guidelines for Future Development

1. **UI Text**: Always use "Session Report" or "Session Reports" in user-facing text, labels, and messages.

2. **Code Names**: Continue using "summary" terminology for:
   - Service class names
   - Type names
   - Variable names
   - Method names
   - Collection names

3. **Comments**: Use "Session Report" in comments that describe user-facing concepts, but "summary" is acceptable for internal implementation details.

4. **New Features**: When adding new features related to session reports:
   - Use "Session Report" in UI text
   - Use "summary" in code (variables, methods, types)
   - Update this document if the pattern changes

## Migration Notes

If a future refactor decides to align code names with UI terminology:

1. This would be a significant breaking change affecting:
   - Service class names
   - Type names
   - Variable names throughout the codebase
   - Firestore collection name (would require data migration)

2. Consider the cost vs. benefit:
   - Current approach maintains code stability
   - UI consistency is already achieved
   - Internal naming doesn't affect users

3. If migration is pursued:
   - Update all service classes
   - Update all type definitions
   - Update all variable names
   - Migrate Firestore collection
   - Update all imports and references
   - Update this documentation

## Related Documentation

- See `docs/workouts/session/` for other session-related documentation
- See `docs/WORKOUT_PLAN_BUILDER_APP_IMPLEMENTATION.md` for overall architecture
