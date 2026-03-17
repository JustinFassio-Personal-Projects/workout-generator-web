# AI Exercise Editor Implementation Strategy for Hub Rep

## Overview

Implement AI-powered exercise editing and swapping functionality that allows users to modify exercises within workouts using natural language prompts. The feature leverages the existing Genkit/Gemini infrastructure and follows established codebase patterns.

## Key Adaptations from Design Document

### Architecture Deviations

1. **API Routes Instead of Server Actions**: The codebase uses Next.js API routes (`src/app/api/`) with Firebase Admin SDK, not server actions. AI operations will be implemented as API routes.

2. **Genkit Flows Location**: Flows are in `src/lib/genkit/flows/` (not Firebase Functions). New flows will be created here.

3. **Client Service Pattern**: Client-side services in `src/services/` call API routes. A new `AIExerciseService` will follow this pattern.

4. **No Admin UI**: Per requirements, admin functionality lives in a separate repository. This repo will collect analytics data but not implement admin dashboards.

5. **Existing Update Pattern**: Exercise updates use `TrainerService.updateWorkoutSections()` which updates entire sections array. AI edits will integrate with this existing method.

## Implementation Phases

### Phase 1: Infrastructure & Types (Week 1)

#### 1.1 Type Definitions

- **File**: `src/types/ai-exercise-editor.ts`
- Define types for AI edit requests, responses, and history
- Extend `TrainerWorkoutExercise` interface with optional AI edit history fields
- Follow existing Firestore type patterns from `src/types/firestore.ts`

#### 1.2 Prompt Templates

- **File**: `src/lib/genkit/prompts/ai-exercise-editor.prompt`
- Create prompt templates for edit and swap operations
- Follow pattern from `src/lib/genkit/prompts/workout-generator.prompt`

#### 1.3 Genkit Flows

- **File**: `src/lib/genkit/flows/edit-exercise.ts`
- **File**: `src/lib/genkit/flows/swap-exercise.ts`
- Create Genkit flows using `ai.defineFlow()` pattern from `generate-workout.ts`
- Use Zod schemas for input/output validation
- Return structured exercise data matching `TrainerWorkoutExercise` interface

### Phase 2: API Routes & Services (Week 2)

**Status**: Ready to implement based on Phase 1 completion  
**Phase 1 Dependencies**: All type definitions, Genkit flows, and helper functions are complete and verified.

#### 2.1 API Route: Exercise Edit

**File**: `src/app/api/workouts/ai-exercise-edit/route.ts`

**Implementation Pattern** (following `generate/route.ts`):

```typescript
// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb, verifyIdToken, getUserClaims } from "@/lib/firebase-admin";
import { getActiveWaiver } from "@/lib/waiver/getActiveWaiver";
import { getWorkoutLimit, type SubscriptionTier } from "@/lib/stripe";
import { AI_EDIT_LIMITS } from "@/lib/subscription-constants"; // NEW: Add to constants file
import {
  editExerciseFlow,
  transformEditOutputToFirestore,
  AIEditRequestSchema,
  estimateTokenUsage,
  estimateCostUsd,
} from "@/lib/genkit/flows/edit-exercise";
import type { TrainerWorkout, TrainerWorkoutExercise } from "@/types/firestore";
import type { AIEditRequest } from "@/types/ai-exercise-editor";
```

**Key Implementation Steps**:

1. **Authentication & Authorization**:

   ```typescript
   // 1. Extract and verify Firebase ID token
   const token = extractBearerToken(request);
   const decodedToken = await verifyIdToken(token);
   const uid = decodedToken.uid;

   // 2. Verify user owns the workout
   const workoutDoc = await adminDb
     .collection("trainer_workouts")
     .doc(workoutId)
     .get();
   if (!workoutDoc.exists || workoutDoc.data()?.user_id !== uid) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
   }
   ```

2. **Waiver Check** (if required):

   ```typescript
   // 3. Check if user has agreed to active waiver
   const waiverCheck = await getActiveWaiver(uid);
   if (!waiverCheck.hasAgreed) {
     return NextResponse.json(
       { error: "Waiver required", waiverUrl: waiverCheck.url },
       { status: 403 }
     );
   }
   ```

3. **Rate Limiting** (NEW: Add to `src/lib/subscription-constants.ts`):

   ```typescript
   // Define AI edit limits by tier (similar to WORKOUT_LIMITS)
   export const AI_EDIT_LIMITS: Record<SubscriptionTier, number | null> = {
     free: 0, // No access for free tier
     basic: 5, // 5 edits/month
     pro: 20, // 20 edits/month
     elite: 50, // 50 edits/month
     coach: null, // Unlimited for coach tiers
     coach_pro: null,
   };

   // Add helper function
   export function getAIEditLimit(tier: SubscriptionTier): number | null {
     return AI_EDIT_LIMITS[tier];
   }

   // In route.ts:
   async function checkAIEditRateLimit(uid: string): Promise<{
     allowed: boolean;
     tier: SubscriptionTier;
     remaining: number | null;
   }> {
     const tier = await getUserTier(uid); // Reuse from generate route
     const limit = getAIEditLimit(tier);

     if (limit === null) {
       return { allowed: true, tier, remaining: null }; // Unlimited
     }

     if (limit === 0) {
       return { allowed: false, tier, remaining: 0 }; // No access
     }

     // Count edits this month (similar to getWorkoutCount pattern)
     const now = new Date();
     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
     const countSnapshot = await adminDb
       .collection("ai_usage_logs")
       .where("user_id", "==", uid)
       .where("edit_type", "==", "ai_edit")
       .where("created_at", ">=", Timestamp.fromDate(startOfMonth))
       .count()
       .get();

     const count = countSnapshot.data().count;
     const remaining = Math.max(0, limit - count);

     return {
       allowed: count < limit,
       tier,
       remaining,
     };
   }
   ```

4. **Input Validation**:

   ```typescript
   // Use Zod schema from Phase 1
   const RequestBodySchema = z.object({
     workout_id: z.string().min(1),
     section_index: z.number().min(0),
     exercise_index: z.number().min(0),
     edit_request: AIEditRequestSchema, // From Phase 1
   });

   const parseResult = RequestBodySchema.safeParse(body);
   if (!parseResult.success) {
     return NextResponse.json(
       { error: "Invalid request", details: parseResult.error.flatten() },
       { status: 400 }
     );
   }
   ```

5. **Extract Context from Workout**:

   ```typescript
   // Extract exercise and workout context
   const workout = workoutDoc.data() as TrainerWorkout;
   const section = workout.sections[sectionIndex];
   const exercise = section.exercises[exerciseIndex];

   // Build AIEditContext from workout data
   const context: AIEditContext = {
     exercise,
     section_type: section.type,
     workout_focus: workout.focus,
     workout_difficulty: workout.difficulty,
     user_fitness_level:
       workout.generation_context?.profile_snapshot?.fitness_level ??
       "beginner",
     user_injuries:
       workout.generation_context?.profile_snapshot?.injuries ?? [],
     available_equipment:
       workout.generation_context?.profile_snapshot?.available_equipment ?? [],
     adjacent_exercises: section.exercises
       .map((e, idx) => (idx !== exerciseIndex ? e.name : null))
       .filter((n): n is string => n !== null),
   };
   ```

6. **Call Genkit Flow**:

   ```typescript
   // Build input matching AIEditRequestInput from Phase 1
   const flowInput: AIEditRequestInput = {
     mode: parseResult.data.edit_request.mode,
     user_prompt: parseResult.data.edit_request.user_prompt,
     context,
     options: parseResult.data.edit_request.options,
   };

   // Call Phase 1 flow
   const aiOutput = await editExerciseFlow(flowInput);

   // Transform using Phase 1 helper
   const transformed = transformEditOutputToFirestore(aiOutput);
   ```

7. **Cost Tracking**:

   ```typescript
   // Estimate tokens (using Phase 1 helper)
   const promptContent = JSON.stringify(flowInput);
   const outputContent = JSON.stringify(aiOutput);
   const estimatedTokens = estimateTokenUsage(promptContent, outputContent);
   const estimatedCost = estimateCostUsd(estimatedTokens);

   // Log usage for admin repo (create ai_usage_logs document)
   const usageLogRef = adminDb.collection("ai_usage_logs").doc();
   await usageLogRef.set({
     id: usageLogRef.id,
     user_id: uid,
     workout_id: workoutId,
     section_index: sectionIndex,
     exercise_index: exerciseIndex,
     edit_type: "ai_edit",
     edit_mode: flowInput.mode,
     user_prompt: flowInput.user_prompt.substring(0, 500), // Truncate for logs
     ai_model: "googleai/gemini-2.0-flash",
     generation_tokens: estimatedTokens,
     generation_cost_usd: estimatedCost,
     genkit_trace_id: null, // TODO: Extract from flow response if available
     created_at: Timestamp.now(),
   });
   ```

8. **Error Handling** (Critical):

   ```typescript
   // Comprehensive error handling matching generate route pattern
   try {
     // ... main logic
   } catch (error) {
     // Check for rate limit errors
     if (
       error &&
       typeof error === "object" &&
       "status" in error &&
       error.status === 429
     ) {
       return NextResponse.json(
         {
           error: "AI service rate limit exceeded",
           message: "Please try again later",
         },
         { status: 429 }
       );
     }

     // Check for validation errors from Genkit flow
     if (error instanceof z.ZodError) {
       return NextResponse.json(
         { error: "Invalid AI response", details: error.flatten() },
         { status: 500 }
       );
     }

     // Generic error
     console.error("AI exercise edit error:", error);
     return NextResponse.json(
       { error: "Failed to edit exercise", message: "Please try again" },
       { status: 500 }
     );
   }
   ```

**Response Format**:

```typescript
{
  success: true,
  modified_exercise: TrainerWorkoutExercise,
  explanation: string,
  fields_modified: string[],
  metadata: {
    ai_model: string,
    generation_tokens: number,
    generation_cost_usd: number,
    genkit_trace_id: string | null,
  },
  usage: {
    remaining: number | null, // Edits remaining this month
    tier: SubscriptionTier,
  },
}
```

#### 2.2 API Route: Exercise Swap

**File**: `src/app/api/workouts/ai-exercise-swap/route.ts`

**Similar structure to edit route, but**:

- Calls `swapExerciseFlow()` from Phase 1
- Returns array of 3 suggestions (not single exercise)
- Rate limiting checks `edit_type: "ai_swap"` in usage logs
- Uses `transformSwapOutputToFirestore()` from Phase 1

**Request Body**:

```typescript
{
  workout_id: string,
  section_index: number,
  exercise_index: number,
  swap_request: AISwapRequest, // From Phase 1 types
}
```

**Response Format**:

```typescript
{
  success: true,
  suggestions: Array<{
    rank: number,
    exercise: TrainerWorkoutExercise,
    explanation: string,
    match_score: number,
  }>,
  metadata: {
    ai_model: string,
    generation_tokens: number,
    generation_cost_usd: number,
    genkit_trace_id: string | null,
  },
  usage: {
    remaining: number | null,
    tier: SubscriptionTier,
  },
}
```

#### 2.3 API Route: Apply Edit

**File**: `src/app/api/workouts/ai-exercise-apply/route.ts`

**Purpose**: Applies the selected edit/swap to the workout and records history.

**Implementation**:

1. **Verify Ownership** (same as edit route)
2. **Apply Exercise Update**:

   ```typescript
   // Get workout
   const workout = workoutDoc.data() as TrainerWorkout;

   // Create snapshot of previous exercise for history
   const previousExercise = {
     ...workout.sections[sectionIndex].exercises[exerciseIndex],
   };

   // Update exercise in sections array
   const updatedSections = [...workout.sections];
   updatedSections[sectionIndex] = {
     ...updatedSections[sectionIndex],
     exercises: updatedSections[sectionIndex].exercises.map((ex, idx) =>
       idx === exerciseIndex ? modifiedExercise : ex
     ),
   };

   // Use existing TrainerService.updateWorkoutSections() pattern
   // OR update directly via adminDb (if TrainerService doesn't support partial updates)
   await adminDb.collection("trainer_workouts").doc(workoutId).update({
     sections: updatedSections,
     updated_at: FieldValue.serverTimestamp(),
   });
   ```

3. **Record Edit History**:

   ```typescript
   // Add to exercise's ai_edit_history array (if field exists)
   const editHistoryEntry: ExerciseAIEditHistory = {
     edit_id: crypto.randomUUID(),
     edit_type: "ai_edit" | "ai_swap",
     edit_mode: editRequest.mode,
     user_prompt: editRequest.user_prompt,
     applied_at: Timestamp.now(),
     previous_exercise: previousExercise,
     ai_model: metadata.ai_model,
     generation_tokens: metadata.generation_tokens,
     generation_cost_usd: metadata.generation_cost_usd,
     genkit_trace_id: metadata.genkit_trace_id,
     fields_modified: detectModifiedFields(previousExercise, modifiedExercise),
     user_rating: null, // Set later via feedback API
     user_feedback: null,
   };

   // Update exercise with history (use arrayUnion)
   await adminDb
     .collection("trainer_workouts")
     .doc(workoutId)
     .update({
       [`sections.${sectionIndex}.exercises.${exerciseIndex}.ai_edit_history`]:
         FieldValue.arrayUnion(editHistoryEntry),
       [`sections.${sectionIndex}.exercises.${exerciseIndex}.last_ai_edited_at`]:
         Timestamp.now(),
       [`sections.${sectionIndex}.exercises.${exerciseIndex}.ai_edit_count`]:
         FieldValue.increment(1),
     });
   ```

4. **Helper: Detect Modified Fields**:
   ```typescript
   function detectModifiedFields(
     previous: TrainerWorkoutExercise,
     modified: TrainerWorkoutExercise
   ): string[] {
     const modified: string[] = [];
     if (previous.name !== modified.name) modified.push("name");
     if (previous.sets !== modified.sets) modified.push("sets");
     if (
       JSON.stringify(previous.setDetails) !==
       JSON.stringify(modified.setDetails)
     ) {
       modified.push("setDetails");
     }
     if (JSON.stringify(previous.cues) !== JSON.stringify(modified.cues))
       modified.push("cues");
     if (previous.detailedInstructions !== modified.detailedInstructions) {
       modified.push("detailedInstructions");
     }
     if (previous.muscleTarget !== modified.muscleTarget)
       modified.push("muscleTarget");
     if (
       JSON.stringify(previous.equipment_needed) !==
       JSON.stringify(modified.equipment_needed)
     ) {
       modified.push("equipment_needed");
     }
     if (
       JSON.stringify(previous.muscle_groups) !==
       JSON.stringify(modified.muscle_groups)
     ) {
       modified.push("muscle_groups");
     }
     if (previous.tempo !== modified.tempo) modified.push("tempo");
     if (previous.image_url !== modified.image_url) modified.push("image_url");
     return modified;
   }
   ```

#### 2.4 Client Service

**File**: `src/services/ai-exercise/AIExerciseService.ts`

**Implementation Pattern** (following `TrainerService.ts`):

```typescript
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type {
  AIEditRequest,
  AIEditResponse,
  AISwapRequest,
  AISwapResponse,
  TrainerWorkoutExercise,
} from "@/types/ai-exercise-editor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export class AIExerciseService {
  /**
   * Generate an edited version of an exercise using AI.
   */
  static async generateExerciseEdit(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    editRequest: AIEditRequest
  ): Promise<AIEditResponse> {
    const token = await getIdToken(auth.currentUser);

    const response = await fetch(`${API_BASE}/api/workouts/ai-exercise-edit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        workout_id: workoutId,
        section_index: sectionIndex,
        exercise_index: exerciseIndex,
        edit_request: editRequest,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to generate exercise edit");
    }

    return response.json();
  }

  /**
   * Generate swap suggestions for an exercise using AI.
   */
  static async generateExerciseSwap(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    swapRequest: AISwapRequest
  ): Promise<AISwapResponse> {
    const token = await getIdToken(auth.currentUser);

    const response = await fetch(`${API_BASE}/api/workouts/ai-exercise-swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        workout_id: workoutId,
        section_index: sectionIndex,
        exercise_index: exerciseIndex,
        swap_request: swapRequest,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to generate swap suggestions");
    }

    return response.json();
  }

  /**
   * Apply a modified exercise to the workout.
   */
  static async applyExerciseEdit(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    modifiedExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIEditHistory
  ): Promise<void> {
    const token = await getIdToken(auth.currentUser);

    const response = await fetch(`${API_BASE}/api/workouts/ai-exercise-apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        workout_id: workoutId,
        section_index: sectionIndex,
        exercise_index: exerciseIndex,
        modified_exercise: modifiedExercise,
        edit_history: editHistory,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to apply exercise edit");
    }
  }
}
```

#### 2.5 Additional Recommendations

**Subscription Constants** (`src/lib/subscription-constants.ts`):

- Add `AI_EDIT_LIMITS` and `AI_SWAP_LIMITS` (same values)
- Add `getAIEditLimit()` helper function
- Consider separate limits for edit vs swap if needed

**Usage Logging**:

- Create `ai_usage_logs` collection schema document
- Index on `user_id`, `created_at`, `edit_type` for efficient queries
- Consider TTL policy for old logs (90 days?)

**Error Handling**:

- Specific error codes for rate limiting (429)
- User-friendly error messages for tier limits
- Retry logic for transient AI API failures (max 3 attempts with exponential backoff)

**Security Enhancements**:

- Sanitize user prompts (remove script tags, limit length)
- Validate exercise indices before array access
- Rate limit per IP for anonymous users (if applicable)

**Performance**:

- Cache workout data if editing multiple exercises
- Batch usage log writes if making multiple edits
- Consider async usage logging (don't block response)

**Testing Recommendations**:

- Unit tests for rate limiting logic
- Integration tests with Firebase emulator
- Mock Genkit flow responses for API route tests
- Test error scenarios (invalid workout, out of bounds indices, rate limits)

### Phase 3: UI Components (Week 3)

#### 3.1 AI Editor Dialog

- **File**: `src/components/workout/ai-editor/AIExerciseEditor.tsx`
- Main dialog component with tabs for Edit/Swap modes
- Uses existing UI components from `src/components/ui/` (Dialog, Tabs)
- Follows styling patterns from `ExerciseCard.tsx`

#### 3.2 Edit Mode Panel

- **File**: `src/components/workout/ai-editor/EditModePanel.tsx`
- Quick actions grid (pre-configured prompts)
- Custom prompt input
- Options checkboxes (preserve sets/reps, regenerate image, etc.)

#### 3.3 Swap Mode Panel

- **File**: `src/components/workout/ai-editor/SwapModePanel.tsx`
- Swap reason textarea
- Constraint checkboxes
- Swap suggestions display

#### 3.4 Preview & Processing

- **File**: `src/components/workout/ai-editor/ExercisePreview.tsx`
- Before/after comparison view
- **File**: `src/components/workout/ai-editor/AIProcessingState.tsx`
- Loading states and streaming response UI

#### 3.5 Integration Points

- **Modify**: `src/components/workout/ExerciseCard.tsx`
  - Add AI Edit button (similar to complete button)
  - Button appears on hover or as permanent icon (mobile)
- **Modify**: `src/components/workout/WorkoutDisplay.tsx`
  - Add state management for AI editor
  - Pass handlers to `WorkoutSection` -> `ExerciseCard`
  - Handle apply edit callback

### Phase 4: Rate Limiting & Usage Tracking (Week 4)

#### 4.1 Usage Tracking

- **File**: `src/lib/ai-exercise/usageTracking.ts`
- Track per-user AI edit usage (similar to workout generation limits)
- Monthly limits based on subscription tier:
  - Free: ❌ No access
  - Basic: 5/month
  - Pro: 20/month
  - Elite: 50/month
  - Coach: Unlimited
- Store in Firestore (extend user_profiles or create ai_usage_logs collection)

#### 4.2 Rate Limiting

- Add rate limit checks in API routes (before Genkit call)
- Reuse pattern from workout generation route
- Return appropriate error responses

#### 4.3 Cost Tracking

- Track AI generation costs per edit
- Store in edit history (like workout generation_context)
- Log to ai_usage_logs collection for admin repo consumption

### Phase 5: Image Regeneration (Week 5 - Optional)

- Integrate with existing `ImageGenerationService`
- Option to regenerate exercise images during edit
- Reuse `/api/image/generate` route
- Follow pattern from `WorkoutDisplay.tsx` image retry logic

### Phase 6: History & Audit Logging (Week 6)

#### 6.1 Edit History

- Store edit history on `TrainerWorkoutExercise` document:
  - Optional `ai_edit_history` array field
  - Each entry includes: edit_id, edit_type, user_prompt, applied_at, fields_modified, AI metadata
- Update type definitions in `src/types/firestore.ts`

#### 6.2 Usage Logs Collection

- **Collection**: `ai_usage_logs` (for admin repo analytics)
- Document structure:
  - user_id, workout_id, exercise_index
  - edit_type, tokens, cost_usd
  - timestamp, genkit_trace_id
- Note: Admin dashboard UI lives in separate repo

### Phase 7: Testing & Refinement (Week 7)

- Unit tests for Genkit flows
- Integration tests for API routes
- Component tests for UI
- E2E tests for complete flows
- Performance testing

### Phase 8: Documentation & Launch (Week 8)

- Update `blueprint.md` with feature documentation
- User-facing documentation
- Beta rollout plan
- Monitoring setup

## File Structure

```
src/
├── app/
│   └── api/
│       └── workouts/
│           ├── ai-exercise-edit/
│           │   └── route.ts          # Edit API route
│           ├── ai-exercise-swap/
│           │   └── route.ts          # Swap API route
│           └── ai-exercise-apply/
│               └── route.ts          # Apply edit API route
├── components/
│   └── workout/
│       ├── ai-editor/
│       │   ├── AIExerciseEditor.tsx
│       │   ├── EditModePanel.tsx
│       │   ├── SwapModePanel.tsx
│       │   ├── ExercisePreview.tsx
│       │   └── AIProcessingState.tsx
│       ├── ExerciseCard.tsx          # [MODIFIED] Add AI button
│       └── WorkoutDisplay.tsx        # [MODIFIED] Add AI editor state
├── lib/
│   ├── genkit/
│   │   ├── flows/
│   │   │   ├── edit-exercise.ts      # Edit flow
│   │   │   └── swap-exercise.ts      # Swap flow
│   │   └── prompts/
│   │       └── ai-exercise-editor.prompt
│   └── ai-exercise/
│       └── usageTracking.ts
├── services/
│   └── ai-exercise/
│       └── AIExerciseService.ts
└── types/
    ├── ai-exercise-editor.ts         # New types
    └── firestore.ts                  # [MODIFIED] Add AI edit history fields
```

## Integration with Existing Code

### Exercise Update Pattern

- Reuse `TrainerService.updateWorkoutSections()` for persisting edits
- AI edits update the specific exercise in the sections array
- Maintains compatibility with existing workout display and editing

### Genkit Flow Pattern

- Follow structure from `generate-workout.ts`:
  - Zod input/output schemas
  - Use `ai.generate()` with structured output
  - Error handling and retry logic
  - Token usage estimation

### API Route Pattern

- Follow `generate/route.ts` structure:
  - Authentication via `verifyIdToken()`
  - Rate limiting with tier checks
  - Waiver check (if required for AI features)
  - Comprehensive error handling
  - Cost tracking

### Component Pattern

- Client components use `"use client"` directive
- Follow styling from existing workout components
- Use shadcn/ui components consistently

## Environment Variables

Add to `.env`:

- `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` (already exists for workout generation)
- `AI_EDITOR_DAILY_BUDGET` (optional, for cost monitoring)
- `AI_EDITOR_MONTHLY_BUDGET` (optional, for cost monitoring)

## Firestore Schema Updates

### TrainerWorkoutExercise (extend existing)

```typescript
// Optional fields to add:
ai_edit_history?: ExerciseAIEditHistory[];
last_ai_edited_at?: Timestamp;
ai_edit_count?: number;
```

### New Collection: ai_usage_logs

- For admin repo analytics consumption
- Document structure defined in Phase 6

## Security Considerations

1. **Authentication**: All API routes require valid Firebase ID token
2. **Authorization**: Verify user owns the workout before editing
3. **Rate Limiting**: Enforce tier-based limits server-side
4. **Input Validation**: Sanitize user prompts to prevent injection
5. **Cost Controls**: Monitor and alert on budget overruns

## Deviations Documented

1. **No Server Actions**: Using API routes instead (codebase pattern)
2. **No Admin UI**: Analytics data collected, but dashboard in separate repo
3. **Genkit in Codebase**: Flows in `src/lib/genkit/flows/`, not Firebase Functions
4. **Client Service Layer**: Service classes call API routes, not direct Firestore
5. **Update Pattern**: Uses existing `updateWorkoutSections()` method

## Critical Dependencies

1. **Environment Setup**:
   - `GOOGLE_AI_API_KEY` must be configured (already exists for workout generation)
   - Budget limits configured (`AI_EDITOR_DAILY_BUDGET`, `AI_EDITOR_MONTHLY_BUDGET`) - optional
   - Firestore security rules updated for new operations

2. **Integration Points**:
   - ExerciseCard component needs AI button added
   - WorkoutDisplay component needs AI editor state management
   - Context data must be extracted from workout/questionnaire
   - `TrainerService.updateWorkoutSections()` must be tested with AI-generated data

3. **Validation Requirements**:
   - AI response schema validation (critical for data integrity)
   - Prompt sanitization
   - Rate limiting implementation

## Risk Mitigation

1. **AI API Failures**: Implement retry logic, graceful degradation
2. **Cost Overruns**: Strict budget limits, daily monitoring, alerts (if budget env vars set)
3. **Invalid Responses**: Robust schema validation, fallback to manual editing
4. **Performance**: Optimize prompt length, cache system prompts, monitor latency

## Success Metrics

### User Engagement

- **AI Edit Usage Rate**: % of workouts with at least 1 AI edit
  - Target: >30% of Pro+ users
- **Edits per Workout**: Average number of AI edits per workout
  - Target: 1.5 edits/workout
- **Acceptance Rate**: % of AI edits that are applied (not rejected)
  - Target: >80%

### Quality Metrics

- **User Satisfaction**: Average star rating for AI edits (if feedback collected)
  - Target: >4.0 / 5.0
- **Edit Success Rate**: % of edits that complete without errors
  - Target: >95%
- **Time to Edit**: Average time from opening editor to applying edit
  - Target: <60 seconds

### Business Impact

- **Conversion Rate**: % of users who upgrade to Pro+ for AI editing
  - Target: +5% conversion lift
- **Retention**: % of users who use AI editing monthly
  - Target: >60% monthly retention
- **Cost per Edit**: Average AI cost per edit
  - Target: <$0.001 (text only), <$0.05 (with image)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-09  
**Status**: Plan Complete - Ready for Implementation  
**Repository**: AI Workout Generator Hub
