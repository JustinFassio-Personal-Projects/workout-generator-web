# AI Exercise Editor - Design Document

## Overview

The AI Exercise Editor is a component that allows users to use AI-powered prompting to edit, swap, or modify exercises within workouts. This feature leverages natural language instructions to make intelligent changes to exercise data, including descriptions, difficulty levels, injury modifications, and image generation.

## Goals

1. **Intuitive Editing**: Enable users to modify exercises using natural language instead of manual field editing
2. **Contextual Intelligence**: AI understands workout context, athlete level, and exercise relationships
3. **Multi-Modal Updates**: Update text, instructions, parameters, and images in a single operation
4. **Audit Trail**: Track all AI modifications for quality assurance and cost monitoring
5. **Flexible Operations**: Support both subtle edits and complete exercise swaps

---

## Component Architecture

### High-Level Structure

```
AIExerciseEditor (Dialog Component)
├── AIExerciseEditorTrigger (Button on ExerciseCard)
├── AIExerciseEditorDialog
│   ├── ModeSelector (Edit | Swap)
│   ├── EditModePanel
│   │   ├── QuickActionsGrid
│   │   ├── CustomPromptInput
│   │   └── ExercisePreview
│   ├── SwapModePanel
│   │   ├── SwapReason (TextArea)
│   │   ├── ConstraintsChecklist
│   │   └── SuggestedSwaps (if available)
│   └── AIProcessingState
│       ├── LoadingIndicator
│       ├── StreamedResponse
│       └── ApplyChangesButton
```

### File Structure

```
src/
├── components/
│   ├── workout/
│   │   ├── ai-editor/
│   │   │   ├── AIExerciseEditor.tsx          # Main dialog component
│   │   │   ├── AIExerciseEditorTrigger.tsx   # Button trigger
│   │   │   ├── EditModePanel.tsx             # Edit mode UI
│   │   │   ├── SwapModePanel.tsx             # Swap mode UI
│   │   │   ├── QuickActions.tsx              # Pre-built action buttons
│   │   │   ├── ExercisePreview.tsx           # Before/after comparison
│   │   │   ├── AIProcessingState.tsx         # Loading & streaming UI
│   │   │   └── types.ts                      # Component-specific types
│   │   ├── ExerciseCard.tsx                  # [MODIFIED] Add AI editor trigger
│   │   └── WorkoutDisplay.tsx                # [MODIFIED] Manage AI edits state
├── app/
│   └── api/
│       └── workouts/
│           └── ai-exercise-edit/
│               └── route.ts                  # AI edit/swap API endpoint
├── lib/
│   └── genkit/
│       └── flows/
│           ├── edit-exercise.ts              # AI edit flow
│           └── swap-exercise.ts              # AI swap flow
├── services/
│   └── exercise/
│       └── AIExerciseService.ts              # Business logic for AI edits
└── types/
    └── firestore.ts                          # [MODIFIED] Add AI edit types
```

---

## Data Structures

### Exercise Edit History (Firestore)

Add to `TrainerWorkoutExercise`:

```typescript
export interface ExerciseAIEditHistory {
  edit_id: string; // UUID for this edit
  edit_type: "ai_edit" | "ai_swap";
  edit_mode: EditMode; // See below
  user_prompt: string; // The actual user input
  applied_at: Timestamp;

  // Before state
  previous_exercise: Partial<TrainerWorkoutExercise>; // Snapshot before edit

  // AI metadata
  ai_model: string; // e.g., "gemini-2.0-flash-exp"
  generation_tokens: number;
  generation_cost_usd: number;
  genkit_trace_id: string | null;

  // Changes applied
  fields_modified: string[]; // e.g., ["detailedInstructions", "cues", "image_url"]

  // User feedback (optional)
  user_rating: number | null; // 1-5 stars
  user_feedback: string | null;
}

export interface TrainerWorkoutExercise {
  // ... existing fields ...

  // AI editing history
  ai_edit_history?: ExerciseAIEditHistory[];
  last_ai_edited_at?: Timestamp;
  ai_edit_count?: number;
}
```

### Edit Modes

```typescript
export type EditMode =
  | "add_detail" // Add more detailed instructions
  | "update_images" // Regenerate images with specific style
  | "adjust_difficulty" // Make easier/harder
  | "modify_for_injury" // Adapt for specific injury
  | "change_intensity" // Increase/decrease intensity
  | "create_complex" // Combine multiple exercises
  | "simplify" // Break down complex movement
  | "adjust_equipment" // Change equipment requirements
  | "rewrite_cues" // Improve form cues for level
  | "custom"; // Custom user prompt

export interface AIEditRequest {
  mode: EditMode;
  user_prompt: string;

  // Context (from workout and user profile)
  context: {
    exercise: TrainerWorkoutExercise;
    section_type: WorkoutSectionType;
    workout_focus: string | null;
    user_fitness_level: string;
    user_injuries: string[];
    available_equipment: string[];
    workout_difficulty: string;
  };

  // Options
  options: {
    regenerate_image: boolean;
    preserve_sets_reps: boolean; // For edits that should keep volume
    maintain_muscle_target: boolean;
  };
}

export interface AISwapRequest {
  reason: string; // Why swapping (injury, equipment, preference)
  constraints: {
    same_muscle_group: boolean;
    same_equipment: boolean;
    same_difficulty: boolean;
    similar_movement_pattern: boolean;
  };

  // Context
  context: {
    exercise: TrainerWorkoutExercise;
    section_type: WorkoutSectionType;
    workout_focus: string | null;
    user_fitness_level: string;
    user_injuries: string[];
    available_equipment: string[];
    adjacent_exercises: string[]; // To avoid duplicates
  };
}

export interface AIEditResponse {
  success: boolean;
  modified_exercise: TrainerWorkoutExercise;
  explanation: string; // What was changed and why
  fields_modified: string[];
  metadata: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
}
```

---

## User Flows

### Flow 1: Edit Mode (Modify Existing Exercise)

1. **User clicks "AI Edit" button** on ExerciseCard
   - Button appears on hover or as permanent icon (mobile)
   - Opens AIExerciseEditor dialog with Edit mode selected

2. **Choose Quick Action or Custom Prompt**

   **Quick Actions Grid:**

   ```typescript
   const QUICK_ACTIONS = [
     {
       id: "add_detail",
       label: "Add More Detail",
       icon: FileText,
       description: "Expand instructions with more step-by-step guidance",
     },
     {
       id: "adjust_difficulty",
       label: "Make Easier",
       icon: TrendingDown,
       description: "Reduce difficulty for beginners",
     },
     {
       id: "adjust_difficulty",
       label: "Make Harder",
       icon: TrendingUp,
       description: "Increase challenge for advanced athletes",
     },
     {
       id: "modify_for_injury",
       label: "Modify for Injury",
       icon: AlertCircle,
       description: "Adapt exercise to work around specific limitation",
     },
     {
       id: "rewrite_cues",
       label: "Improve Form Cues",
       icon: Target,
       description: "Rewrite technique cues for your level",
     },
     {
       id: "create_complex",
       label: "Create Complex",
       icon: Combine,
       description: "Combine with another movement",
     },
     {
       id: "adjust_equipment",
       label: "Change Equipment",
       icon: Dumbbell,
       description: "Modify to use different equipment",
     },
     {
       id: "update_images",
       label: "Better Images",
       icon: Image,
       description: "Regenerate images with specific angle/style",
     },
   ];
   ```

3. **User provides prompt** (if quick action needs context)
   - For "Modify for Injury": "I have a sore right shoulder"
   - For "Create Complex": "Combine with a push-up"
   - For "Better Images": "Show the exercise from the side angle"

4. **Options Panel** (Checkboxes)

   ```
   ☑ Preserve sets and reps (keep volume the same)
   ☑ Maintain primary muscle target
   ☐ Regenerate exercise image
   ```

5. **AI Processing**
   - Show loading state with spinner
   - Stream response showing real-time changes
   - Display "Before" vs "After" comparison

6. **Review & Apply**
   - User sees explanation of changes
   - Can approve or reject
   - Can iterate with follow-up prompt

### Flow 2: Swap Mode (Replace Exercise Entirely)

1. **User selects "Swap" tab** in AIExerciseEditor

2. **User enters swap reason**

   ```
   Textarea placeholder:
   "Why do you want to swap this exercise?
   (e.g., 'I don't have a kettlebell',
   'Barbell squats hurt my knees',
   'I want more variety')"
   ```

3. **Constraint selection** (checkboxes)

   ```
   ☑ Target same muscle group (Quadriceps)
   ☑ Use available equipment only
   ☑ Keep similar difficulty level
   ☐ Similar movement pattern (compound lower body)
   ```

4. **AI suggests 2-3 alternatives**

   ```
   Suggestion 1: Bulgarian Split Squat
   - Targets: Quadriceps, Glutes
   - Equipment: Dumbbells, Bench
   - Why: Single-leg variation reduces knee stress

   Suggestion 2: Goblet Squat
   - Targets: Quadriceps, Glutes
   - Equipment: Kettlebell or Dumbbell
   - Why: Front-loaded position easier on knees

   Suggestion 3: Leg Press (if gym available)
   - Targets: Quadriceps, Glutes
   - Equipment: Leg Press Machine
   - Why: Fixed path reduces knee strain
   ```

5. **User selects swap**
   - Full exercise details generated
   - Sets/reps adjusted to match workout flow
   - Image generated automatically

6. **Apply to workout**
   - Exercise replaced in section
   - Edit history recorded

---

## AI Prompting Strategy

### Edit Mode Prompt Template

```typescript
const EDIT_PROMPT_TEMPLATE = `
You are an expert personal trainer editing an exercise within a workout program.

CURRENT EXERCISE:
{exercise_json}

WORKOUT CONTEXT:
- Section: {section_type} (Warmup | Main Workout | Cooldown | Finisher)
- Workout Focus: {workout_focus}
- Workout Difficulty: {workout_difficulty}

USER PROFILE:
- Fitness Level: {user_fitness_level}
- Injuries: {user_injuries}
- Available Equipment: {available_equipment}

USER REQUEST:
Edit Mode: {edit_mode}
User Prompt: "{user_prompt}"

CONSTRAINTS:
- Preserve sets and reps: {preserve_sets_reps}
- Maintain muscle target: {maintain_muscle_target}

TASK:
Modify the exercise according to the user's request while maintaining workout flow and safety.
Return the complete modified exercise with all fields populated.

Pay special attention to:
1. Safety considerations given user's injuries
2. Equipment availability
3. Maintaining appropriate difficulty progression
4. Clear, actionable technique cues
5. Detailed instructions suitable for user's fitness level

Provide a brief explanation (2-3 sentences) of what you changed and why.
`;
```

### Swap Mode Prompt Template

```typescript
const SWAP_PROMPT_TEMPLATE = `
You are an expert personal trainer replacing an exercise in a workout program.

EXERCISE TO REPLACE:
{exercise_json}

REASON FOR SWAP:
{swap_reason}

WORKOUT CONTEXT:
- Section: {section_type}
- Workout Focus: {workout_focus}
- Adjacent Exercises: {adjacent_exercises} (avoid duplicates)

USER PROFILE:
- Fitness Level: {user_fitness_level}
- Injuries: {user_injuries}
- Available Equipment: {available_equipment}

CONSTRAINTS:
- Same muscle group: {same_muscle_group}
- Same equipment: {same_equipment}
- Same difficulty: {same_difficulty}
- Similar movement pattern: {similar_movement_pattern}

TASK:
Suggest 3 alternative exercises that meet the constraints and address the swap reason.
For each suggestion, provide:
1. Complete exercise details (name, sets, reps, cues, instructions)
2. Brief explanation of why it's a good swap (2-3 sentences)
3. Muscle groups targeted
4. Equipment needed

Rank suggestions by best fit (1 = best match).
`;
```

---

## API Design

### Endpoint: `POST /api/workouts/ai-exercise-edit`

**Request:**

```typescript
{
  workout_id: string;
  section_index: number;
  exercise_index: number;
  operation: "edit" | "swap";

  // For edit operations
  edit_request?: AIEditRequest;

  // For swap operations
  swap_request?: AISwapRequest;
}
```

**Response:**

```typescript
{
  success: boolean;

  // For edit
  modified_exercise?: TrainerWorkoutExercise;
  explanation?: string;
  fields_modified?: string[];

  // For swap
  swap_suggestions?: Array<{
    rank: number;
    exercise: TrainerWorkoutExercise;
    explanation: string;
    match_score: number; // 0-100
  }>;

  // Metadata
  metadata: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
}
```

### Endpoint: `POST /api/workouts/ai-exercise-apply`

Applies the selected edit/swap and updates Firestore.

**Request:**

```typescript
{
  workout_id: string;
  section_index: number;
  exercise_index: number;
  modified_exercise: TrainerWorkoutExercise;
  edit_history: ExerciseAIEditHistory;
}
```

**Response:**

```typescript
{
  success: boolean;
  updated_workout: TrainerWorkout;
}
```

---

## Genkit Flows

### Flow 1: `editExerciseFlow`

```typescript
// src/lib/genkit/flows/edit-exercise.ts

export const editExerciseFlow = ai.defineFlow(
  {
    name: "editExercise",
    inputSchema: AIEditRequestSchema,
    outputSchema: AIEditResponseSchema,
  },
  async (input) => {
    // Build context-aware prompt
    const prompt = buildEditPrompt(input);

    // Generate with structured output
    const { output } = await ai.generate({
      model: DEFAULT_MODEL,
      prompt,
      output: {
        schema: ExerciseSchema, // Reuse from generate-workout.ts
      },
    });

    // Optionally regenerate image if requested
    let imageUrl = input.context.exercise.image_url;
    if (input.options.regenerate_image) {
      imageUrl = await generateExerciseImage(output, input.user_prompt);
    }

    return {
      success: true,
      modified_exercise: {
        ...output,
        image_url: imageUrl,
        image_source: input.options.regenerate_image ? "generated" : undefined,
      },
      explanation: generateExplanation(input.context.exercise, output),
      fields_modified: detectModifiedFields(input.context.exercise, output),
      metadata: {
        ai_model: DEFAULT_MODEL,
        generation_tokens: response.usage.totalTokens,
        generation_cost_usd: calculateCost(response.usage),
        genkit_trace_id: context.traceId,
      },
    };
  }
);
```

### Flow 2: `swapExerciseFlow`

```typescript
// src/lib/genkit/flows/swap-exercise.ts

export const swapExerciseFlow = ai.defineFlow(
  {
    name: "swapExercise",
    inputSchema: AISwapRequestSchema,
    outputSchema: z.object({
      suggestions: z.array(
        z.object({
          rank: z.number(),
          exercise: ExerciseSchema,
          explanation: z.string(),
          match_score: z.number(),
        })
      ),
    }),
  },
  async (input) => {
    const prompt = buildSwapPrompt(input);

    const { output } = await ai.generate({
      model: DEFAULT_MODEL,
      prompt,
      output: {
        schema: SwapSuggestionsSchema,
      },
    });

    return output;
  }
);
```

---

## UI Components

### AIExerciseEditor.tsx

```typescript
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditModePanel } from "./EditModePanel";
import { SwapModePanel } from "./SwapModePanel";
import type { TrainerWorkoutExercise, WorkoutSectionType } from "@/types/firestore";

interface AIExerciseEditorProps {
  exercise: TrainerWorkoutExercise;
  sectionType: WorkoutSectionType;
  sectionIndex: number;
  exerciseIndex: number;
  workoutId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyEdit: (modifiedExercise: TrainerWorkoutExercise) => void;
}

export function AIExerciseEditor({
  exercise,
  sectionType,
  sectionIndex,
  exerciseIndex,
  workoutId,
  open,
  onOpenChange,
  onApplyEdit,
}: AIExerciseEditorProps) {
  const [mode, setMode] = useState<"edit" | "swap">("edit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Exercise Editor: {exercise.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "edit" | "swap")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">
              Edit Exercise
            </TabsTrigger>
            <TabsTrigger value="swap">
              Swap Exercise
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <EditModePanel
              exercise={exercise}
              sectionType={sectionType}
              workoutId={workoutId}
              sectionIndex={sectionIndex}
              exerciseIndex={exerciseIndex}
              onApply={onApplyEdit}
            />
          </TabsContent>

          <TabsContent value="swap">
            <SwapModePanel
              exercise={exercise}
              sectionType={sectionType}
              workoutId={workoutId}
              sectionIndex={sectionIndex}
              exerciseIndex={exerciseIndex}
              onApply={onApplyEdit}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### Quick Actions Grid

```typescript
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "add_detail",
    label: "Add Detail",
    icon: FileText,
    description: "Expand with step-by-step instructions",
    defaultPrompt:
      "Add more detailed step-by-step instructions suitable for my fitness level",
  },
  {
    id: "make_easier",
    label: "Make Easier",
    icon: TrendingDown,
    description: "Reduce difficulty",
    defaultPrompt: "Make this exercise easier for a beginner",
    mode: "adjust_difficulty",
  },
  {
    id: "make_harder",
    label: "Make Harder",
    icon: TrendingUp,
    description: "Increase challenge",
    defaultPrompt:
      "Make this exercise more challenging for an advanced athlete",
    mode: "adjust_difficulty",
  },
  {
    id: "modify_injury",
    label: "Injury Modification",
    icon: AlertCircle,
    description: "Adapt for injury",
    requiresInput: true,
    inputPlaceholder:
      "Which injury or limitation? (e.g., 'sore right shoulder')",
    mode: "modify_for_injury",
  },
  {
    id: "improve_cues",
    label: "Better Cues",
    icon: Target,
    description: "Rewrite form cues",
    defaultPrompt:
      "Rewrite the technique cues to be clearer and more actionable for my fitness level",
    mode: "rewrite_cues",
  },
  {
    id: "create_complex",
    label: "Create Complex",
    icon: Combine,
    description: "Combine exercises",
    requiresInput: true,
    inputPlaceholder: "Combine with which movement? (e.g., 'push-up')",
    mode: "create_complex",
  },
  {
    id: "change_equipment",
    label: "Change Equipment",
    icon: Dumbbell,
    description: "Use different equipment",
    requiresInput: true,
    inputPlaceholder: "What equipment to use instead?",
    mode: "adjust_equipment",
  },
  {
    id: "better_images",
    label: "Better Images",
    icon: Image,
    description: "Regenerate images",
    requiresInput: true,
    inputPlaceholder: "Image requirements (e.g., 'side angle view')",
    mode: "update_images",
    forceImageRegeneration: true,
  },
];
```

---

## Integration with Existing Components

### ExerciseCard.tsx (Modified)

Add AI Edit trigger button:

```typescript
// Add to ExerciseCard component
import { Wand2 } from "lucide-react";

// Inside ExerciseCard JSX, add near the complete button:
{onOpenAIEditor && (
  <Button
    variant="outline"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      onOpenAIEditor(sectionIdx, exerciseIdx);
    }}
    className="shrink-0"
    aria-label="Edit with AI"
  >
    <Wand2 className="w-4 h-4 mr-1" />
    <span className="text-xs">AI Edit</span>
  </Button>
)}
```

### WorkoutDisplay.tsx (Modified)

Add AI editor state management:

```typescript
const [aiEditorState, setAIEditorState] = useState<{
  open: boolean;
  sectionIdx: number | null;
  exerciseIdx: number | null;
}>({ open: false, sectionIdx: null, exerciseIdx: null });

const handleOpenAIEditor = useCallback((sIdx: number, eIdx: number) => {
  setAIEditorState({ open: true, sectionIdx: sIdx, exerciseIdx: eIdx });
}, []);

const handleApplyAIEdit = useCallback(
  async (modifiedExercise: TrainerWorkoutExercise) => {
    if (aiEditorState.sectionIdx === null || aiEditorState.exerciseIdx === null) return;

    // Update workout state
    setWorkout((prev) => {
      const newSections = structuredClone(prev.sections);
      newSections[aiEditorState.sectionIdx].exercises[aiEditorState.exerciseIdx] =
        modifiedExercise;
      return { ...prev, sections: newSections };
    });

    // Persist to Firestore via API
    await TrainerService.updateWorkoutSections(workout.id, workout.sections);

    toast.success("Exercise updated with AI!");
    setAIEditorState({ open: false, sectionIdx: null, exerciseIdx: null });
  },
  [aiEditorState, workout.id]
);

// Pass to WorkoutSection
<WorkoutSection
  onOpenAIEditor={handleOpenAIEditor}
  // ... other props
/>

// Render AIExerciseEditor
{aiEditorState.open && aiEditorState.sectionIdx !== null && (
  <AIExerciseEditor
    exercise={workout.sections[aiEditorState.sectionIdx].exercises[aiEditorState.exerciseIdx]}
    sectionType={workout.sections[aiEditorState.sectionIdx].type}
    sectionIndex={aiEditorState.sectionIdx}
    exerciseIndex={aiEditorState.exerciseIdx}
    workoutId={workout.id}
    open={aiEditorState.open}
    onOpenChange={(open) => setAIEditorState(prev => ({ ...prev, open }))}
    onApplyEdit={handleApplyAIEdit}
  />
)}
```

---

## Subscription & Rate Limiting

### Feature Access by Tier

| Feature            | Free | Basic   | Pro      | Elite    | Coach        |
| ------------------ | ---- | ------- | -------- | -------- | ------------ |
| AI Edit Exercise   | ❌   | ✅ 5/mo | ✅ 20/mo | ✅ 50/mo | ✅ Unlimited |
| AI Swap Exercise   | ❌   | ✅ 5/mo | ✅ 20/mo | ✅ 50/mo | ✅ Unlimited |
| Image Regeneration | ❌   | ❌      | ✅       | ✅       | ✅           |

### Usage Tracking

Add to `users` collection:

```typescript
interface UserAIEditUsage {
  ai_edits_this_month: number;
  ai_edits_last_reset: Timestamp;
  ai_edit_limit: number; // Based on tier
}
```

---

## Quality Assurance

### Edit History Analytics

Track in admin dashboard:

- Most common edit modes
- Average cost per edit
- User satisfaction ratings
- Failed edit attempts (parse errors, timeouts)

### Monitoring Alerts

- High token usage (>1000 tokens/edit)
- Low user ratings (<3 stars)
- High rejection rate (>50% of edits not applied)
- Expensive edits (>$0.05 per edit)

---

## Future Enhancements

1. **Batch Edit Mode**: Apply same edit to multiple exercises
2. **Voice Input**: Speak edit instructions instead of typing
3. **Edit Templates**: Save frequently used prompts as templates
4. **Undo/Redo Stack**: Allow users to revert edits
5. **Collaborative Editing**: Share edited exercises with community
6. **Smart Suggestions**: Proactively suggest edits based on user profile
7. **Exercise Library Integration**: Save edited exercises to personal library
8. **A/B Testing**: Show multiple edit variations and let user choose

---

## Cost Estimation

### Per-Edit Cost Breakdown

Assuming Gemini 2.0 Flash pricing:

- Input: ~800 tokens (exercise + context) × $0.075 / 1M = $0.00006
- Output: ~500 tokens (modified exercise) × $0.30 / 1M = $0.00015
- **Total per edit: ~$0.00021**

With image regeneration (if requested):

- Imagen 3 Fast: $0.04 per image
- **Total with image: ~$0.04021**

### Monthly Cost Projection

Assuming:

- 10,000 active Pro users
- Average 3 edits/user/month
- 20% include image regeneration

**Total monthly cost:**

- Text edits: 10,000 × 3 × 0.8 × $0.00021 = $5.04
- Image edits: 10,000 × 3 × 0.2 × $0.04021 = $241.26
- **Total: ~$246/month**

**Revenue impact:**

- Pro tier: $19/mo × 10,000 = $190,000/mo
- **AI feature cost: 0.13% of revenue**

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)

- [ ] Basic AI edit flow (Edit mode only)
- [ ] 3-4 quick actions (Add Detail, Make Easier, Make Harder, Modify Injury)
- [ ] Simple prompt input
- [ ] Basic UI (dialog with tabs)
- [ ] API endpoint for editing
- [ ] Integration with ExerciseCard

### Phase 2: Swap Mode (Week 3)

- [ ] Swap flow implementation
- [ ] Constraint selection UI
- [ ] Multiple swap suggestions
- [ ] Apply swap to workout

### Phase 3: Polish & Advanced Features (Week 4)

- [ ] Before/after comparison
- [ ] Edit history tracking
- [ ] User feedback collection
- [ ] Image regeneration
- [ ] All quick actions
- [ ] Streaming response UI
- [ ] Usage tracking & limits

### Phase 4: Analytics & Optimization (Ongoing)

- [ ] Admin dashboard for edit analytics
- [ ] Cost monitoring
- [ ] Quality metrics
- [ ] User satisfaction tracking
- [ ] Prompt engineering improvements

---

## Success Metrics

### User Engagement

- **AI Edit Usage Rate**: % of workouts with at least 1 AI edit
  - Target: >30% of Pro+ users
- **Edits per Workout**: Average number of AI edits per workout
  - Target: 1.5 edits/workout
- **Acceptance Rate**: % of AI edits that are applied (not rejected)
  - Target: >80%

### Quality Metrics

- **User Satisfaction**: Average star rating for AI edits
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

## Technical Considerations

### Error Handling

- **AI Generation Failures**: Retry with exponential backoff (max 3 attempts)
- **Parse Errors**: Validate AI response against schema, show user-friendly error
- **Timeout**: 30s timeout, graceful degradation
- **Rate Limiting**: Client-side check before API call, show upgrade prompt

### Performance

- **Streaming**: Use server-sent events (SSE) for real-time AI response
- **Optimistic Updates**: Show preview immediately, persist in background
- **Caching**: Cache common edit patterns to reduce API calls

### Security

- **Input Validation**: Sanitize user prompts to prevent injection attacks
- **Rate Limiting**: Server-side enforcement of tier limits
- **Audit Logging**: Log all AI edits for compliance

### Accessibility

- **Keyboard Navigation**: Full keyboard support for quick actions
- **Screen Readers**: ARIA labels for all interactive elements
- **Loading States**: Clear indication of AI processing state

---

## Appendix

### Example Edit Scenarios

#### Scenario 1: Beginner Making Exercise Easier

**Original Exercise:**

```json
{
  "name": "Barbell Back Squat",
  "sets": 4,
  "setDetails": [{ "reps": "8", "weight": "Heavy (RPE 8)", "rest": "90s" }],
  "cues": [
    "Break at hips and knees simultaneously",
    "Keep chest up and core braced"
  ]
}
```

**User Action:** Clicks "Make Easier"

**AI Output:**

```json
{
  "name": "Goblet Squat",
  "sets": 3,
  "setDetails": [{ "reps": "10", "weight": "Moderate (RPE 6)", "rest": "60s" }],
  "cues": [
    "Hold kettlebell at chest level",
    "Sit back into heels",
    "Keep elbows inside knees at bottom"
  ],
  "detailedInstructions": "Hold a kettlebell with both hands at chest height..."
}
```

**Explanation:** "Changed to Goblet Squat which is more beginner-friendly. The front-loaded weight helps maintain upright posture and reduces lower back strain. Reduced sets from 4 to 3 and intensity from RPE 8 to RPE 6."

#### Scenario 2: Injury Modification

**User Prompt:** "I have a sore right shoulder"

**Original:** "Barbell Overhead Press"

**AI Output:** "Landmine Press" with one-arm variation options and detailed shoulder-safe cues

#### Scenario 3: Create Complex

**User Prompt:** "Combine with a reverse lunge"

**Original:** "Dumbbell Curl"

**AI Output:** "Curl to Reverse Lunge Complex" with integrated movement pattern

---

## Glossary

- **Edit Mode**: AI-powered modification of existing exercise while preserving core structure
- **Swap Mode**: Complete replacement of exercise with alternative movement
- **Quick Action**: Pre-configured edit template requiring minimal user input
- **Complex**: Single exercise combining multiple movement patterns (e.g., "Thruster" = Front Squat + Press)
- **Exercise Preview**: Side-by-side comparison of original vs. AI-modified exercise
- **Genkit Flow**: Reusable AI workflow defined in Google Genkit framework
- **Structured Output**: AI response that conforms to predefined TypeScript schema
