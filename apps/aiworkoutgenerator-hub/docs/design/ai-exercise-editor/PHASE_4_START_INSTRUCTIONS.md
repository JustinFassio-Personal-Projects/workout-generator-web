# Phase 4 AI Exercise Editor - Getting Started Instructions

## Context for New AI Agent

You are tasked with implementing **Phase 4: Enhancements & Polish** for the AI Exercise Editor feature. Phases 1-3 have been completed and merged to main, which includes:

✅ **Completed in Phases 1-3:**

**Phase 1:** Type definitions, Genkit flows, utility functions (`buildAIEditContext`, `detectModifiedFields`)
**Phase 2:** API routes (`ai-exercise-edit`, `ai-exercise-swap`, `ai-exercise-apply`), client service, rate limiting, cost tracking
**Phase 3:** Complete UI implementation with Edit/Swap panels, ExercisePreview, AIProcessingState, integration into WorkoutDisplay and ExerciseCard

## Current Branch Status

- **Current branch**: `feature/phase-4-ai-exercise-editor`
- **Base**: Latest `main` (includes all Phases 1-3 work)
- **Working directory**: `/Users/justinfassio/Local Sites/aiworkoutgenerator-hub`

## Phase 4 Objectives (Prioritized)

1. **Edit History UI Display** - Show `ai_edit_history` array from exercises in readable format
2. **User Feedback Collection** - Add feedback mechanism to capture `user_rating` in `ExerciseAIEditHistory`
3. **Image Regeneration Integration** - Offer to regenerate images when exercises are modified
4. **Performance Optimizations** - Optimize auto-scroll, reduce re-renders, add memoization
5. **Additional Enhancements** (lower priority): Batch operations, voice input, admin dashboard

## How to Get Started Using the Plan Tool

### Step 1: Review the Blueprint

Read the Phase 4 section in the blueprint:

```
docs/design/ai-exercise-editor/blueprint.md
```

**Focus on**: Lines 76-109 (Phase 4 section with recommended next steps and considerations)

### Step 2: Use the Plan Tool to Create Implementation Plan

**Command to start planning:**

```
@docs/design/ai-exercise-editor/blueprint.md Review Phase 4 section (lines 76-109) and create a detailed execution plan for Phase 4 Enhancements & Polish, breaking down the prioritized objectives into actionable implementation tasks. Include specific component locations, integration points with existing Phase 3 components, and patterns to follow from previous phases.
```

### Step 3: Key Reference Files to Study

Before implementing, study these existing files to understand patterns:

1. **Phase 3 Components** (already implemented):
   - `src/components/workout/ai-editor/AIExerciseEditor.tsx` - Main dialog component
   - `src/components/workout/ai-editor/EditModePanel.tsx` - Edit mode with quick actions
   - `src/components/workout/ai-editor/ExercisePreview.tsx` - Before/after comparison
   - `src/components/workout/ai-editor/SwapModePanel.tsx` - Swap mode UI
   - `src/components/workout/WorkoutDisplay.tsx` - Workout display with AI editor integration

2. **Data Structures**:
   - `src/types/ai-exercise-editor.ts` - `ExerciseAIEditHistory` type definition
   - `src/types/firestore.ts` - `TrainerWorkoutExercise` with `ai_edit_history` field

3. **Image Generation** (for regeneration integration):
   - `src/services/image/ImageGenerationService.ts`
   - `src/components/workout/ImageGenerationButton.tsx`

4. **Optimistic Updates Pattern**:
   - `src/components/workout/WorkoutDisplay.tsx` - `handleApplyAIEdit` function (lines 257-324)

### Step 4: Key Considerations from Phase 3

- **ExercisePreview component** already handles showing modified fields well - can extend for history display
- **WorkoutDisplay** has optimistic update pattern established - follow same pattern for new features
- **All AI operations** require waiver agreement and respect rate limits (already handled in API routes)
- **Error handling** and loading states follow established patterns - maintain consistency
- **Auto-scrolling** already implemented - consider optimizations for performance

### Step 5: Priority Implementation Guidance

#### 1. Edit History UI Display (Highest Priority)

- Location: Could integrate into `ExercisePreview` or create separate `EditHistoryView` component
- Data Source: `exercise.ai_edit_history` array (type: `ExerciseAIEditHistory[]`)
- Display: Show metadata (timestamp, cost, tokens, user prompt, fields modified)
- Integration: Consider adding history viewer button/panel in `AIExerciseEditor` or `ExerciseCard`

#### 2. User Feedback Collection

- Location: Add to `ExercisePreview` or `AIProcessingState` after edit is applied
- Data: Capture `user_rating` field (number 1-5 or thumbs up/down)
- API: Update existing `ai-exercise-apply` route to accept and store rating
- Pattern: Follow optimistic update pattern from `WorkoutDisplay.handleApplyAIEdit`

#### 3. Image Regeneration Integration

- Location: Show prompt in `ExercisePreview` or after edit is applied
- Trigger: Check if `image_url` or exercise details changed during edit
- Service: Use existing `ImageGenerationService.generateExerciseImage`
- Pattern: Follow existing image generation flow in `WorkoutDisplay`

#### 4. Performance Optimizations

- Review auto-scroll behavior in `EditModePanel` and `ExercisePreview`
- Add `React.memo` where appropriate for large workout objects
- Consider `useMemo` for expensive computations in preview components
- Review dependency arrays in `useCallback` hooks

### Step 6: Important Patterns to Follow

#### Optimistic Update Pattern (from WorkoutDisplay)

```typescript
// Capture original state before optimistic update
const originalState = structuredClone(currentState);

try {
  // Optimistically update UI
  setState(optimisticUpdate);

  // Persist via API
  await apiCall();
} catch (error) {
  // Revert using captured original state
  setState(originalState);
}
```

#### Error Handling Pattern (from Phase 3 components)

```typescript
try {
  // API call
} catch (err: unknown) {
  // Handle waiver redirect
  if (err && typeof err === "object" && "waiver_url" in err) {
    // Redirect to waiver
  }

  // Handle rate limit
  if (err && typeof err === "object" && "remaining" in err) {
    // Show rate limit message
  }

  // Generic error handling
}
```

#### Component Integration Pattern

- Follow shadcn/ui component patterns already established
- Use existing UI components: `Card`, `Badge`, `Button`, `Accordion`, etc.
- Maintain consistent styling and spacing
- Follow accessibility patterns (ARIA labels, keyboard navigation)

### Step 7: Testing Considerations

For each enhancement:

- ✅ Test with exercises that have existing `ai_edit_history`
- ✅ Test with exercises that have no history
- ✅ Test optimistic updates and error reverts
- ✅ Test on mobile devices (responsiveness)
- ✅ Test accessibility (keyboard navigation, screen readers)
- ✅ Test performance with large workout objects

### Step 8: Firestore Schema

No new collections needed. Work with existing:

- `trainer_workouts.sections[].exercises[].ai_edit_history` - Already structured
- `trainer_workouts.sections[].exercises[].ai_edit_count` - Already tracked
- `ai_usage_logs` - Already exists for cost tracking

## Recommended Workflow

1. **Start with Edit History UI** - Highest value, displays existing data
2. **Add User Feedback** - Complements history, improves data quality
3. **Image Regeneration** - Enhances user experience after edits
4. **Performance Optimizations** - Improves existing functionality
5. **Additional Enhancements** - Nice-to-have features

## Questions to Ask if Stuck

- How is `ai_edit_history` currently structured? → Study `src/types/ai-exercise-editor.ts`
- How do Phase 3 components handle state? → Study `EditModePanel.tsx` and `SwapModePanel.tsx`
- What's the pattern for optimistic updates? → Study `WorkoutDisplay.handleApplyAIEdit`
- How are images generated? → Study `ImageGenerationService.ts`
- What UI patterns are established? → Study Phase 3 components for consistency

## Additional Resources

- **Full Blueprint**: `docs/design/ai-exercise-editor/blueprint.md` (comprehensive feature documentation)
- **Phase 3 Components**: `src/components/workout/ai-editor/` (reference implementations)
- **API Routes**: `src/app/api/workouts/ai-exercise-*` (backend patterns)
- **Client Service**: `src/services/ai-exercise-service.ts` (client API patterns)

---

**Ready to start? Use the plan tool with the command above, or review the blueprint and begin implementing the highest priority tasks first.**
