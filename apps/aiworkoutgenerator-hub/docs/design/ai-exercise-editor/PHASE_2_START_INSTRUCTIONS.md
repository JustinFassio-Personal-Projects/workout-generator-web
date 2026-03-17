# Phase 2 AI Exercise Editor - Getting Started Instructions

## Context for New AI Agent

You are tasked with implementing **Phase 2: API Routes & Services** for the AI Exercise Editor feature. Phase 1 has been completed and merged to main, which includes:

✅ **Completed in Phase 1:**

- Type definitions (`src/types/ai-exercise-editor.ts`)
- Genkit flows (`src/lib/genkit/flows/edit-exercise.ts` and `swap-exercise.ts`)
- Utility functions (token estimation, cost calculation, Firestore helpers)
- All infrastructure and foundational code

## Current Branch Status

- **Current branch**: `feature/phase-2-ai-exercise-editor`
- **Base**: Latest `main` (includes all Phase 1 work)
- **Working directory**: `/Users/justinfassio/Local Sites/aiworkoutgenerator-hub`

## Phase 2 Objectives

Implement the API routes and client services that wrap the Phase 1 Genkit flows:

1. **API Route: Exercise Edit** (`src/app/api/workouts/ai-exercise-edit/route.ts`)
2. **API Route: Exercise Swap** (`src/app/api/workouts/ai-exercise-swap/route.ts`)
3. **API Route: Apply Edit** (`src/app/api/workouts/ai-exercise-apply/route.ts`)
4. **Client Service** (`src/services/ai-exercise-service.ts`)
5. **Subscription Constants** (add AI edit limits to `src/lib/subscription-constants.ts`)

## How to Get Started Using the Plan Tool

### Step 1: Review the Implementation Strategy

Read the detailed Phase 2 implementation plan:

```
docs/design/ai-exercise-editor/AI_EXERCISE_EDITOR_IMPLEMENTATION_STRATEGY_HUB.md
```

**Focus on**: Lines 46-600 (Phase 2 sections)

### Step 2: Use the Plan Tool to Create Implementation Plan

**Command to start planning:**

```
@docs/design/ai-exercise-editor/AI_EXERCISE_EDITOR_IMPLEMENTATION_STRATEGY_HUB.md Create a detailed execution plan for Phase 2 API Routes & Services implementation, breaking it down into actionable tasks with specific file paths, code patterns to follow, and testing requirements.
```

**Or manually break down into tasks:**

1. **Task 1: Add Subscription Constants**
   - File: `src/lib/subscription-constants.ts`
   - Add `AI_EDIT_LIMITS` and helper function
   - Follow pattern from existing `WORKOUT_LIMITS`

2. **Task 2: Implement Exercise Edit API Route**
   - File: `src/app/api/workouts/ai-exercise-edit/route.ts`
   - Follow pattern from `src/app/api/workouts/generate/route.ts`
   - Reference implementation details in strategy doc (lines 51-321)

3. **Task 3: Implement Exercise Swap API Route**
   - File: `src/app/api/workouts/ai-exercise-swap/route.ts`
   - Similar structure to edit route
   - Reference implementation details in strategy doc (lines 322-366)

4. **Task 4: Implement Apply Edit API Route**
   - File: `src/app/api/workouts/ai-exercise-apply/route.ts`
   - Handles applying selected edits to workout
   - Reference implementation details in strategy doc (lines 368-477)

5. **Task 5: Implement Client Service**
   - File: `src/services/ai-exercise-service.ts`
   - Follow pattern from existing services in `src/services/`
   - Reference implementation details in strategy doc (lines 479-598)

### Step 3: Key Reference Files to Study

Before implementing, study these existing files to understand patterns:

1. **API Route Pattern**: `src/app/api/workouts/generate/route.ts`
   - Authentication/authorization pattern
   - Waiver checking
   - Rate limiting with subscription tiers
   - Error handling
   - Cost tracking

2. **Service Pattern**: `src/services/workout-service.ts` (or similar)
   - Client-side API calls
   - Error handling
   - Type safety

3. **Constants Pattern**: `src/lib/subscription-constants.ts`
   - How subscription limits are defined
   - Helper functions

4. **Firebase Admin Pattern**: `src/lib/firebase-admin.ts`
   - Admin SDK usage
   - Firestore operations

5. **Phase 1 Flows** (already implemented):
   - `src/lib/genkit/flows/edit-exercise.ts`
   - `src/lib/genkit/flows/swap-exercise.ts`
   - Import and use these in your API routes

### Step 4: Critical Implementation Requirements

#### Security & Authorization

- ✅ Verify user authentication (Firebase ID token)
- ✅ Verify user owns the workout (check `user_id` field)
- ✅ Check active waiver status
- ✅ Enforce subscription-based rate limits

#### Rate Limiting

- Implement `checkAIEditRateLimit()` function
- Query `ai_usage_logs` collection (create this collection structure)
- Count edits/swaps by user, type, and month
- Return remaining quota in response

#### Cost Tracking

- Use `estimateTokenUsage()` and `estimateCostUsd()` from Phase 1 flows
- Log to `ai_usage_logs` collection for admin repo analytics
- Include cost in response metadata

#### Error Handling

- Handle rate limit errors (429)
- Handle Zod validation errors
- Handle Genkit flow errors
- Handle Firestore errors
- Use consistent error response format

#### Response Format

- Match the response formats specified in strategy doc
- Include metadata (tokens, cost, trace ID)
- Include usage information (remaining quota, tier)
- Include modified exercise or suggestions

### Step 5: Testing Requirements

For each API route, test:

- ✅ Authentication (invalid/missing token)
- ✅ Authorization (user doesn't own workout)
- ✅ Waiver check (no active waiver)
- ✅ Rate limiting (free tier = 0, limits enforced)
- ✅ Input validation (invalid request body)
- ✅ Successful edit/swap operations
- ✅ Error handling (AI failures, network errors)
- ✅ Cost tracking (logs created correctly)
- ✅ History recording (when applying edits)

### Step 6: Important Code Patterns to Follow

#### Dynamic Route Configuration

```typescript
export const dynamic = "force-dynamic"; // Required for Firebase Admin
```

#### Request Validation

```typescript
const parseResult = RequestBodySchema.safeParse(body);
if (!parseResult.success) {
  return NextResponse.json(
    { error: "Invalid request", details: parseResult.error.flatten() },
    { status: 400 }
  );
}
```

#### Genkit Flow Call

```typescript
import {
  editExerciseFlow,
  transformEditOutputToFirestore,
} from "@/lib/genkit/flows/edit-exercise";

const flowInput: AIEditRequestInput = {
  /* ... */
};
const aiOutput = await editExerciseFlow(flowInput);
const transformed = transformEditOutputToFirestore(aiOutput);
```

#### Firestore Timestamp

```typescript
import { Timestamp } from "firebase-admin/firestore";
created_at: Timestamp.now(),
```

#### Workout Update Pattern

```typescript
// Get workout
const workout = workoutDoc.data() as TrainerWorkout;

// Update exercise in sections array
const updatedSections = [...workout.sections];
updatedSections[sectionIndex] = {
  ...updatedSections[sectionIndex],
  exercises: [
    ...updatedSections[sectionIndex].exercises.slice(0, exerciseIndex),
    modifiedExercise,
    ...updatedSections[sectionIndex].exercises.slice(exerciseIndex + 1),
  ],
};

// Save using existing TrainerService pattern (or direct Firestore write)
```

### Step 7: Environment Variables

No new environment variables needed for Phase 2. Use existing:

- `GENKIT_TOKEN_PRICE_PER_M` (or `GENKIT_BLENDED_TOKEN_PRICE_PER_M`)
- Firebase Admin credentials (already configured)

### Step 8: Firestore Schema Considerations

#### New Collection: `ai_usage_logs`

Documents will be created with this structure (see strategy doc lines 835-839):

```typescript
{
  id: string;
  user_id: string;
  workout_id: string;
  section_index: number;
  exercise_index: number;
  edit_type: "ai_edit" | "ai_swap";
  edit_mode?: EditMode; // Only for ai_edit
  user_prompt: string; // Truncated to 500 chars
  ai_model: string;
  generation_tokens: { inputTokens, outputTokens, totalTokens } | number;
  generation_cost_usd: number;
  genkit_trace_id: string | null;
  created_at: Timestamp;
}
```

#### Extended: `trainer_workouts.sections[].exercises[]`

Phase 6 will add history fields, but Phase 2 should prepare for them (optional fields will be added later).

## Recommended Workflow

1. **Start with subscription constants** - simplest task, establishes rate limiting foundation
2. **Implement edit route first** - most complex, establishes patterns
3. **Implement swap route** - similar to edit, can reuse patterns
4. **Implement apply route** - simpler, applies changes to workout
5. **Implement client service** - wraps all API routes for client use
6. **Test each route** - verify functionality before moving to next
7. **Integration testing** - test full flow from client to database

## Questions to Ask if Stuck

- How does the existing `generate` route handle rate limiting? → Study `generate/route.ts`
- How do other services call API routes? → Study `src/services/`
- What's the Firestore structure for workouts? → Study `src/types/firestore.ts`
- How are Genkit flows called? → Study Phase 1 flows or `generate-workout.ts`

## Next Steps After Phase 2

Phase 3 will implement the UI components that use these API routes. Phase 2 must be complete and tested before starting Phase 3.

## Additional Resources

- **Full Design Document**: `docs/design/ai-exercise-editor/AI_EXERCISE_EDITOR_DESIGN.md`
- **Phase 1 Execution Plan**: `docs/design/ai-exercise-editor/PHASE_1_EXECUTION_PLAN.md` (for reference on how Phase 1 was structured)
- **Implementation Strategy**: `docs/design/ai-exercise-editor/AI_EXERCISE_EDITOR_IMPLEMENTATION_STRATEGY_HUB.md` (Phase 2 details)

---

**Ready to start? Use the plan tool with the command above, or begin implementing task by task following the patterns from existing code.**
