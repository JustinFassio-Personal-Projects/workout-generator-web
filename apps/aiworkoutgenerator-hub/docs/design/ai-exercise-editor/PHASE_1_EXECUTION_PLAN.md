# Phase 1: Infrastructure & Types - Execution Plan

## Overview

Phase 1 establishes the foundational infrastructure for AI exercise editing: type definitions, prompt templates, and Genkit flows. This phase creates reusable components that will be consumed by API routes in Phase 2.

## Task 1.1: Type Definitions

### File: `src/types/ai-exercise-editor.ts`

Create comprehensive type definitions for AI exercise editing operations.

#### Types to Define

```typescript
import type { Timestamp } from "firebase/firestore";
import type {
  TrainerWorkoutExercise,
  WorkoutSectionType,
  FitnessLevel,
} from "@/types/firestore";

/**
 * Edit mode determines the type of modification to perform.
 */
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

/**
 * Context information needed for AI exercise editing.
 * Extracted from workout and user profile.
 */
export interface AIEditContext {
  exercise: TrainerWorkoutExercise;
  section_type: WorkoutSectionType;
  workout_focus: string | null;
  workout_difficulty: "beginner" | "intermediate" | "advanced";
  user_fitness_level: FitnessLevel;
  user_injuries: string[];
  available_equipment: string[];
  adjacent_exercises?: string[]; // For swap mode to avoid duplicates
}

/**
 * Options for exercise editing operations.
 */
export interface AIEditOptions {
  regenerate_image: boolean;
  preserve_sets_reps: boolean; // For edits that should keep volume
  maintain_muscle_target: boolean;
}

/**
 * Request to edit an existing exercise.
 */
export interface AIEditRequest {
  mode: EditMode;
  user_prompt: string;
  context: AIEditContext;
  options: AIEditOptions;
}

/**
 * Constraints for exercise swapping.
 */
export interface AISwapConstraints {
  same_muscle_group: boolean;
  same_equipment: boolean;
  same_difficulty: boolean;
  similar_movement_pattern: boolean;
}

/**
 * Request to swap an exercise with an alternative.
 */
export interface AISwapRequest {
  reason: string; // Why swapping (injury, equipment, preference)
  constraints: AISwapConstraints;
  context: AIEditContext; // Exercise to replace and workout context
}

/**
 * AI edit history entry stored on exercise document.
 */
export interface ExerciseAIEditHistory {
  edit_id: string; // UUID for this edit
  edit_type: "ai_edit" | "ai_swap";
  edit_mode: EditMode;
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

/**
 * Response from AI edit operation.
 */
export interface AIEditResponse {
  success: boolean;
  modified_exercise: TrainerWorkoutExercise;
  explanation: string; // What was changed and why (2-3 sentences)
  fields_modified: string[];
  metadata: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
}

/**
 * Swap suggestion from AI.
 */
export interface AISwapSuggestion {
  rank: number; // 1 = best match
  exercise: TrainerWorkoutExercise;
  explanation: string; // Why it's a good swap (2-3 sentences)
  match_score: number; // 0-100
}

/**
 * Response from AI swap operation.
 */
export interface AISwapResponse {
  success: boolean;
  suggestions: AISwapSuggestion[];
  metadata: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
}
```

#### Implementation Steps

1. Create file `src/types/ai-exercise-editor.ts`
2. Add imports from `firebase/firestore` and `@/types/firestore`
3. Define all types above
4. Export all types for use in other modules
5. Ensure types align with existing `TrainerWorkoutExercise` interface

#### Testing Checklist

- [ ] TypeScript compilation passes
- [ ] Types are exported correctly
- [ ] Imports from `firestore.ts` work correctly
- [ ] Type definitions match Firestore schema requirements

---

## Task 1.2: Prompt Building Functions

### Files:

- `src/lib/genkit/flows/edit-exercise.ts` (includes `buildSystemPrompt()` and `buildUserPrompt()`)
- `src/lib/genkit/flows/swap-exercise.ts` (includes `buildSystemPrompt()` and `buildUserPrompt()`)

**Note**: Unlike the workout generator which has a `.prompt` file for documentation, prompts for exercise editing will be built programmatically in the flow files. This aligns with the pattern used in `generate-workout.ts` where prompts are constructed using string templates and helper functions.

Create prompt building functions for edit and swap operations following the pattern from `generate-workout.ts` where prompts are built programmatically rather than from template files.

#### Edit Mode Prompt Building Functions

These functions will be implemented in `edit-exercise.ts`:

```typescript
/**
 * Builds the system prompt that defines the AI's role for exercise editing.
 */
function buildSystemPrompt(input: AIEditRequestInput): string {
  const injuryWarning =
    input.context.user_injuries.length > 0
      ? `\n\nCRITICAL SAFETY: User has injuries in these areas - ${input.context.user_injuries.join(", ")}. DO NOT modify exercises in ways that stress these areas. If the edit mode is "modify_for_injury", provide safe alternatives.`
      : "";

  return `You are an expert Personal Trainer editing an exercise within a workout program.
Your goal is to modify exercises according to user requests while maintaining safety, effectiveness, and workout flow.

TONE AND STYLE:
- Be clear and instructional in your explanations
- Maintain the exercise's core purpose while adapting it
- Ensure all modifications are safe for the user's fitness level and injury status
- Be precise with exercise prescriptions (sets, reps, rest, tempo)

CONSTRAINTS:
- ${input.options.preserve_sets_reps ? "PRESERVE sets and reps count - do not change the number of sets or set structure." : "Sets and reps may be modified based on the edit request."}
- ${input.options.maintain_muscle_target ? "MAINTAIN the primary muscle target - keep the same muscle groups." : "Muscle targets may be adjusted if necessary for the modification."}

OUTPUT FORMAT:
- Return valid JSON conforming to the provided schema
- The exercise object must include all required fields
- Provide a clear explanation (2-3 sentences) of what was changed and why
- No markdown formatting outside the JSON structure${injuryWarning}`;
}

/**
 * Builds the user prompt with exercise context and edit request.
 */
function buildUserPrompt(input: AIEditRequestInput): string {
  const parts: string[] = [];
  const { mode, user_prompt, context, options } = input;
  const { exercise } = context;

  // Main request
  parts.push(`Edit the following exercise according to the user's request.`);
  parts.push(`\nEdit Mode: ${mode}`);
  parts.push(`User Request: "${user_prompt}"`);

  // Current exercise details
  parts.push(`\n## CURRENT EXERCISE`);
  parts.push(`Name: ${exercise.name}`);
  parts.push(`Sets: ${exercise.sets}`);
  parts.push(`Muscle Target: ${exercise.muscleTarget}`);
  parts.push(
    `Equipment: ${exercise.equipment_needed.join(", ") || "Bodyweight"}`
  );
  parts.push(`Cues: ${exercise.cues.join(" | ")}`);
  if (exercise.detailedInstructions) {
    parts.push(
      `Instructions: ${exercise.detailedInstructions.substring(0, 200)}...`
    );
  }

  // Workout context
  parts.push(`\n## WORKOUT CONTEXT`);
  parts.push(`Section Type: ${context.section_type}`);
  parts.push(`Workout Focus: ${context.workout_focus || "General"}`);
  parts.push(`Workout Difficulty: ${context.workout_difficulty}`);

  // User profile
  parts.push(`\n## USER PROFILE`);
  parts.push(`Fitness Level: ${context.user_fitness_level}`);
  if (context.user_injuries.length > 0) {
    parts.push(`Injuries: ${context.user_injuries.join(", ")}`);
  } else {
    parts.push(`Injuries: None`);
  }
  if (context.available_equipment.length > 0) {
    parts.push(
      `Available Equipment: ${context.available_equipment.join(", ")}`
    );
  } else {
    parts.push(`Available Equipment: Bodyweight only`);
  }

  // Mode-specific guidance
  parts.push(`\n## EDIT MODE GUIDANCE`);
  const modeGuidance = getModeGuidance(mode);
  parts.push(modeGuidance);

  // Constraints reminder
  parts.push(`\n## CONSTRAINTS TO RESPECT`);
  if (options.preserve_sets_reps) {
    parts.push(`- Maintain the same number of sets (${exercise.sets})`);
    parts.push(
      `- Keep the set structure (reps, rest, weight/intensity markers)`
    );
  }
  if (options.maintain_muscle_target) {
    parts.push(`- Keep primary muscle target: ${exercise.muscleTarget}`);
    parts.push(
      `- Maintain similar muscle groups: ${exercise.muscle_groups.join(", ")}`
    );
  }

  // Safety reminder
  if (context.user_injuries.length > 0) {
    parts.push(
      `\n⚠️ CRITICAL: User has injuries in: ${context.user_injuries.join(", ")}`
    );
    parts.push(`DO NOT suggest modifications that stress these areas.`);
    if (mode === "modify_for_injury") {
      parts.push(
        `Provide a safe alternative that targets similar muscles without aggravating injuries.`
      );
    }
  }

  parts.push(
    `\nReturn the complete modified exercise with all fields populated, plus an explanation of the changes.`
  );

  return parts.join("\n");
}

/**
 * Returns mode-specific guidance for the AI.
 */
function getModeGuidance(mode: string): string {
  const guidance: Record<string, string> = {
    add_detail: `Expand the detailedInstructions field with more step-by-step guidance. Add safety considerations specific to the user's fitness level. Include progression tips for beginners or advanced variations for experienced users.`,
    adjust_difficulty: `If the user wants it easier: Reduce intensity (lower weight/RPE), increase rest periods, simplify movement pattern. If harder: Increase intensity, decrease rest, add complexity or progression.`,
    modify_for_injury: `CRITICAL: Provide a safe alternative that targets similar muscles without stressing injured areas. Include specific form cues to protect injured areas. Consider unilateral variations if one side is injured.`,
    change_intensity: `Adjust load, reps, tempo, or rest periods based on the user's request. Maintain safety and proper form.`,
    create_complex: `Combine this exercise with another movement into a single complex pattern. Ensure smooth transitions. Adjust sets/reps to account for increased complexity.`,
    simplify: `Break down complex movements into simpler steps. Focus on fundamental movement patterns. Reduce coordination requirements.`,
    adjust_equipment: `Modify to use the available equipment. Maintain similar movement pattern and muscle targets. Adjust intensity/load as needed for equipment change.`,
    rewrite_cues: `Rewrite technique cues for the user's fitness level. Use clear, actionable language. Focus on safety and proper form.`,
    update_images: `Note: Image generation happens separately. Focus on improving exercise description and cues to make visualization clearer. Ensure instructions are detailed for image generation.`,
    custom: `Follow the user's custom prompt while maintaining safety, workout flow, and exercise integrity.`,
  };
  return guidance[mode] || guidance.custom;
}
```

#### Swap Mode Prompt Building Functions

Similar structure for `swap-exercise.ts` but focused on finding alternatives:

```typescript
/**
 * Builds the system prompt for exercise swapping.
 */
function buildSystemPrompt(input: AISwapRequestInput): string {
  const injuryWarning =
    input.context.user_injuries.length > 0
      ? `\n\nCRITICAL SAFETY: User has injuries in these areas - ${input.context.user_injuries.join(", ")}. DO NOT suggest exercises that stress these areas.`
      : "";

  return `You are an expert Personal Trainer replacing an exercise in a workout program.
Your goal is to suggest alternative exercises that meet the user's needs and constraints.

OUTPUT FORMAT:
- Return exactly 3 suggestions ranked by best fit (rank 1 = best match)
- Each suggestion must include a complete exercise object with all required fields
- Provide a clear explanation (2-3 sentences) for each suggestion
- Assign a match score (0-100) based on how well it meets constraints and addresses the swap reason
- No markdown formatting outside the JSON structure${injuryWarning}`;
}

/**
 * Builds the user prompt for exercise swapping.
 */
function buildUserPrompt(input: AISwapRequestInput): string {
  const parts: string[] = [];
  const { reason, constraints, context } = input;
  const { exercise, adjacent_exercises } = context;

  parts.push(`Find alternative exercises to replace: ${exercise.name}`);
  parts.push(`\nReason for swap: "${reason}"`);

  parts.push(`\n## EXERCISE TO REPLACE`);
  parts.push(`Name: ${exercise.name}`);
  parts.push(`Muscle Target: ${exercise.muscleTarget}`);
  parts.push(`Muscle Groups: ${exercise.muscle_groups.join(", ")}`);
  parts.push(
    `Equipment: ${exercise.equipment_needed.join(", ") || "Bodyweight"}`
  );
  parts.push(`Sets: ${exercise.sets}`);
  parts.push(`Difficulty: ${context.workout_difficulty}`);

  parts.push(`\n## WORKOUT CONTEXT`);
  parts.push(`Section: ${context.section_type}`);
  parts.push(`Focus: ${context.workout_focus || "General"}`);
  if (adjacent_exercises && adjacent_exercises.length > 0) {
    parts.push(
      `Adjacent Exercises (avoid duplicates): ${adjacent_exercises.join(", ")}`
    );
  }

  parts.push(`\n## USER PROFILE`);
  parts.push(`Fitness Level: ${context.user_fitness_level}`);
  if (context.user_injuries.length > 0) {
    parts.push(`Injuries: ${context.user_injuries.join(", ")}`);
  }
  if (context.available_equipment.length > 0) {
    parts.push(
      `Available Equipment: ${context.available_equipment.join(", ")}`
    );
  } else {
    parts.push(`Available Equipment: Bodyweight only`);
  }

  parts.push(`\n## CONSTRAINTS`);
  parts.push(
    `- Same muscle group: ${constraints.same_muscle_group ? "YES" : "NO"}`
  );
  parts.push(`- Same equipment: ${constraints.same_equipment ? "YES" : "NO"}`);
  parts.push(
    `- Same difficulty: ${constraints.same_difficulty ? "YES" : "NO"}`
  );
  parts.push(
    `- Similar movement pattern: ${constraints.similar_movement_pattern ? "YES" : "NO"}`
  );

  if (context.user_injuries.length > 0) {
    parts.push(
      `\n⚠️ CRITICAL: DO NOT suggest exercises that stress: ${context.user_injuries.join(", ")}`
    );
  }

  parts.push(
    `\nProvide 3 alternative exercises ranked by best fit. Each must be a complete exercise ready to use in the workout.`
  );

  return parts.join("\n");
}
```

#### Implementation Steps

1. Implement `buildSystemPrompt()` in `edit-exercise.ts` (see code above)
2. Implement `buildUserPrompt()` in `edit-exercise.ts` with helper `getModeGuidance()`
3. Implement `buildSystemPrompt()` in `swap-exercise.ts` (see code above)
4. Implement `buildUserPrompt()` in `swap-exercise.ts`
5. Follow the same pattern as `generate-workout.ts` using string concatenation
6. Test prompt generation with sample inputs

#### Testing Checklist

- [ ] System prompts are generated correctly for both flows
- [ ] User prompts include all required context
- [ ] Mode-specific guidance is accurate
- [ ] Injury warnings are properly included
- [ ] Constraints are clearly communicated
- [ ] Prompts align with Zod input schemas

---

## Task 1.3: Genkit Flows

### File: `src/lib/genkit/flows/edit-exercise.ts`

Create Genkit flow for exercise editing following the pattern from `generate-workout.ts`.

#### Implementation Structure

```typescript
import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import type {
  TrainerWorkoutExercise,
  TrainerSetDetail,
} from "@/types/firestore";
import type { AIEditRequest, AIEditResponse } from "@/types/ai-exercise-editor";

// ============================================
// Input Schema
// ============================================

/**
 * Input schema for exercise edit flow.
 */
export const AIEditRequestSchema = z.object({
  mode: z.enum([
    "add_detail",
    "update_images",
    "adjust_difficulty",
    "modify_for_injury",
    "change_intensity",
    "create_complex",
    "simplify",
    "adjust_equipment",
    "rewrite_cues",
    "custom",
  ]),
  user_prompt: z.string().min(1).max(1000),
  context: z.object({
    exercise: z.object({
      name: z.string(),
      sets: z.number(),
      muscleTarget: z.string(),
      tempo: z.string().nullable(),
      cues: z.array(z.string()),
      detailedInstructions: z.string().nullable(),
      setDetails: z.array(
        z.object({
          reps: z.string(),
          weight: z.string(),
          duration: z.string().optional(),
          rest: z.string(),
          notes: z.string().optional(),
        })
      ),
      equipment_needed: z.array(z.string()),
      muscle_groups: z.array(z.string()),
    }),
    section_type: z.enum(["Warmup", "Main Workout", "Cooldown", "Finisher"]),
    workout_focus: z.string().nullable(),
    workout_difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    user_fitness_level: z.enum([
      "beginner",
      "intermediate",
      "advanced",
      "athlete",
    ]),
    user_injuries: z.array(z.string()),
    available_equipment: z.array(z.string()),
  }),
  options: z.object({
    regenerate_image: z.boolean(),
    preserve_sets_reps: z.boolean(),
    maintain_muscle_target: z.boolean(),
  }),
});

export type AIEditRequestInput = z.infer<typeof AIEditRequestSchema>;

// ============================================
// Output Schema
// ============================================

/**
 * Set detail schema matching TrainerSetDetail.
 */
const SetDetailSchema = z.object({
  reps: z.string().describe("Rep count or style, e.g., '12', 'AMRAP', '10-12'"),
  weight: z
    .string()
    .describe("Suggested intensity, e.g., 'RPE 8', 'Heavy', 'Moderate'"),
  duration: z.string().optional().describe("Time if applicable, e.g., '45s'"),
  rest: z.string().describe("Rest after set, e.g., '60s', '90s'"),
  notes: z.string().optional().describe("Set-specific notes"),
});

/**
 * Exercise output schema matching TrainerWorkoutExercise.
 */
const ExerciseOutputSchema = z.object({
  name: z.string().describe("Exercise name"),
  sets: z.number().min(1).max(10).describe("Number of sets"),
  muscleTarget: z
    .string()
    .describe("Primary muscle target, e.g., 'Quadriceps', 'Chest'"),
  tempo: z
    .string()
    .nullable()
    .describe("Tempo pattern e.g., '3-0-1-0' or null if not applicable"),
  cues: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("2-4 technique cues for proper form"),
  detailedInstructions: z
    .string()
    .nullable()
    .describe(
      "Step-by-step instructions for performing the exercise safely and effectively"
    ),
  setDetails: z
    .array(SetDetailSchema)
    .describe("Individual set prescriptions matching the sets count"),
  equipment_needed: z
    .array(z.string())
    .describe("Equipment required, e.g., ['kettlebell', 'mat']"),
  muscle_groups: z
    .array(z.string())
    .describe("All target muscles, e.g., ['quadriceps', 'glutes', 'core']"),
});

/**
 * Output schema for edit flow including explanation.
 */
export const AIEditOutputSchema = z.object({
  exercise: ExerciseOutputSchema,
  explanation: z
    .string()
    .describe(
      "2-3 sentence explanation of what was changed and why, written for the user"
    ),
});

export type AIEditOutput = z.infer<typeof AIEditOutputSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Build system prompt for exercise editing.
 */
function buildSystemPrompt(input: AIEditRequestInput): string {
  return `You are an expert personal trainer editing an exercise within a workout program. Your goal is to modify exercises according to user requests while maintaining safety, effectiveness, and workout flow.`;
}

/**
 * Build user prompt from request and context.
 * Uses template from prompt file or builds programmatically.
 */
function buildUserPrompt(input: AIEditRequestInput): string {
  const { mode, user_prompt, context, options } = input;
  const { exercise } = context;

  // Build prompt sections
  const sections = [
    `## CURRENT EXERCISE`,
    JSON.stringify(exercise, null, 2),
    ``,
    `## WORKOUT CONTEXT`,
    `- Section: ${context.section_type}`,
    `- Workout Focus: ${context.workout_focus || "General"}`,
    `- Workout Difficulty: ${context.workout_difficulty}`,
    ``,
    `## USER PROFILE`,
    `- Fitness Level: ${context.user_fitness_level}`,
    `- Injuries: ${context.user_injuries.length > 0 ? context.user_injuries.join(", ") : "None"}`,
    `- Available Equipment: ${context.available_equipment.length > 0 ? context.available_equipment.join(", ") : "Bodyweight only"}`,
    ``,
    `## USER REQUEST`,
    `Edit Mode: ${mode}`,
    `User Prompt: "${user_prompt}"`,
    ``,
    `## CONSTRAINTS`,
    `- Preserve sets and reps: ${options.preserve_sets_reps}`,
    `- Maintain muscle target: ${options.maintain_muscle_target}`,
    ``,
    `## TASK`,
    `Modify the exercise according to the user's request while maintaining workout flow and safety.`,
    `Return the complete modified exercise with all fields populated.`,
    `Provide a brief explanation (2-3 sentences) of what you changed and why.`,
  ];

  return sections.join("\n");
}

/**
 * Estimate token usage for cost tracking.
 */
export function estimateTokenUsage(
  promptContent: string,
  outputContent: string
): { inputTokens: number; outputTokens: number; totalTokens: number } {
  // Rough estimation: ~4 characters per token
  const inputTokens = Math.ceil(promptContent.length / 4);
  const outputTokens = Math.ceil(outputContent.length / 4);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

/**
 * Estimate cost in USD based on token usage.
 * Using Gemini 2.0 Flash pricing as of 2026.
 */
export function estimateCostUsd(tokens: {
  inputTokens: number;
  outputTokens: number;
}): number {
  // Gemini 2.0 Flash pricing (as of 2026-01):
  // Input: $0.075 per 1M tokens
  // Output: $0.30 per 1M tokens
  const inputCost = (tokens.inputTokens / 1_000_000) * 0.075;
  const outputCost = (tokens.outputTokens / 1_000_000) * 0.3;
  return inputCost + outputCost;
}

/**
 * Recursively removes undefined values to make Firestore-compatible.
 * Firestore doesn't accept undefined values anywhere in nested data.
 * (Reuse pattern from generate-workout.ts)
 */
function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (entryValue === undefined) continue;
      const cleaned = removeUndefined(entryValue);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result as unknown as T;
  }
  return value;
}

/**
 * Transforms edit output to Firestore-compatible TrainerWorkoutExercise format.
 * Ensures all optional fields are properly handled (no undefined values).
 *
 * NOTE: This function will be used in Phase 2 (API routes) to transform the flow output
 * before saving to Firestore. The flow itself returns the raw AI output.
 */
export function transformEditOutputToFirestore(output: AIEditOutput): {
  exercise: TrainerWorkoutExercise;
  explanation: string;
} {
  return {
    explanation: output.explanation,
    exercise: removeUndefined({
      name: output.exercise.name,
      sets: output.exercise.sets,
      muscleTarget: output.exercise.muscleTarget,
      tempo: output.exercise.tempo ?? null,
      cues: output.exercise.cues ?? [],
      detailedInstructions: output.exercise.detailedInstructions ?? null,
      setDetails: output.exercise.setDetails.map((set) =>
        removeUndefined({
          reps: set.reps,
          weight: set.weight,
          duration: set.duration,
          rest: set.rest,
          notes: set.notes,
        })
      ),
      equipment_needed: output.exercise.equipment_needed ?? [],
      muscle_groups: output.exercise.muscle_groups ?? [],
    }),
  };
}

// ============================================
// Edit Exercise Flow
// ============================================

/**
 * Generates a modified exercise using AI.
 *
 * Uses Genkit's structured output mode with schema enforcement to ensure
 * consistent JSON responses matching the TrainerWorkoutExercise interface.
 */
export async function editExerciseFlow(
  input: AIEditRequestInput
): Promise<AIEditOutput> {
  // Validate input
  const validatedInput = AIEditRequestSchema.parse(input);

  // Build prompts
  const systemPrompt = buildSystemPrompt(validatedInput);
  const userPrompt = buildUserPrompt(validatedInput);

  console.log("=== EXERCISE EDIT ===");
  console.log("Mode:", validatedInput.mode);
  console.log("Exercise:", validatedInput.context.exercise.name);
  console.log("User prompt:", validatedInput.user_prompt);

  // Call the AI model with structured output
  const result = await ai.generate({
    model: DEFAULT_MODEL,
    system: systemPrompt,
    prompt: userPrompt,
    output: {
      schema: AIEditOutputSchema,
      format: "json",
    },
    config: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  // Get the structured output
  const output = result.output;

  if (!output) {
    console.error("AI returned null output");
    throw new Error("AI generation returned empty output");
  }

  console.log("Modified exercise:", output.exercise.name);
  console.log("Explanation:", output.explanation.substring(0, 100) + "...");

  // Validate exercise structure
  if (!output.exercise || !output.exercise.name) {
    console.error("Invalid exercise structure:", output);
    throw new Error("AI generation returned invalid exercise structure");
  }

  // Ensure setDetails length matches sets count
  if (output.exercise.setDetails.length !== output.exercise.sets) {
    console.warn(
      `SetDetails length (${output.exercise.setDetails.length}) doesn't match sets (${output.exercise.sets}). Adjusting...`
    );
    // Adjust sets to match setDetails (or pad/trim setDetails - choose based on preserve_sets_reps)
    if (validatedInput.options.preserve_sets_reps) {
      // If preserving, trim setDetails to match original sets count
      output.exercise.setDetails = output.exercise.setDetails.slice(
        0,
        validatedInput.context.exercise.sets
      );
      output.exercise.sets = validatedInput.context.exercise.sets;
    } else {
      // Otherwise, update sets to match setDetails
      output.exercise.sets = output.exercise.setDetails.length;
    }
  }

  return output;
}
```

#### Implementation Steps

1. Create file `src/lib/genkit/flows/edit-exercise.ts`
2. Define input schema (`AIEditRequestSchema`) matching Task 1.1 types
3. Define output schema (`AIEditOutputSchema` with exercise and explanation)
4. Implement `buildSystemPrompt()` (see Task 1.2 for structure)
5. Implement `buildUserPrompt()` with helper `getModeGuidance()` (see Task 1.2 for structure)
6. Implement `editExerciseFlow()` function with:
   - Input validation using Zod schema
   - Prompt building
   - AI generation with structured output
   - Output validation (exercise structure, setDetails alignment)
   - Error handling with descriptive messages
7. Add `removeUndefined()` helper function (reuse pattern from generate-workout.ts)
8. Add `transformEditOutputToFirestore()` helper (exported for Phase 2 API route use)
9. Add `estimateTokenUsage()` function (reuse pattern from generate-workout.ts)
10. Add `estimateCostUsd()` function (reuse pricing from generate-workout.ts)
11. Export all schemas, types, and functions
12. Add comprehensive logging for debugging

#### Testing Checklist

**For `edit-exercise.ts`:**

- [ ] TypeScript compilation passes
- [ ] Input schema validation works correctly
- [ ] Flow can be called with valid input
- [ ] Output matches TrainerWorkoutExercise interface structure
- [ ] SetDetails alignment logic works (preserve_sets_reps constraint)
- [ ] Token estimation is reasonable (~800-1200 tokens typical)
- [ ] Cost calculation is accurate
- [ ] Error handling provides clear messages
- [ ] Logging provides useful debugging information

---

### File: `src/lib/genkit/flows/swap-exercise.ts`

Create Genkit flow for exercise swapping following the same pattern as `edit-exercise.ts`.

#### Implementation Structure

```typescript
import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import type { AISwapRequest } from "@/types/ai-exercise-editor";

// ============================================
// Input Schema
// ============================================

/**
 * Input schema for exercise swap flow.
 */
export const AISwapRequestSchema = z.object({
  reason: z.string().min(1).max(500),
  constraints: z.object({
    same_muscle_group: z.boolean(),
    same_equipment: z.boolean(),
    same_difficulty: z.boolean(),
    similar_movement_pattern: z.boolean(),
  }),
  context: z.object({
    exercise: z.object({
      // Same exercise schema as edit flow
      name: z.string(),
      sets: z.number(),
      muscleTarget: z.string(),
      tempo: z.string().nullable(),
      cues: z.array(z.string()),
      detailedInstructions: z.string().nullable(),
      setDetails: z.array(/* SetDetailSchema */),
      equipment_needed: z.array(z.string()),
      muscle_groups: z.array(z.string()),
    }),
    section_type: z.enum(["Warmup", "Main Workout", "Cooldown", "Finisher"]),
    workout_focus: z.string().nullable(),
    workout_difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    user_fitness_level: z.enum([
      "beginner",
      "intermediate",
      "advanced",
      "athlete",
    ]),
    user_injuries: z.array(z.string()),
    available_equipment: z.array(z.string()),
    adjacent_exercises: z.array(z.string()).optional(),
  }),
});

export type AISwapRequestInput = z.infer<typeof AISwapRequestSchema>;

// ============================================
// Output Schema
// ============================================

/**
 * Exercise schema for swap suggestions (reuse from edit-exercise.ts).
 */
const ExerciseOutputSchema = z.object({
  name: z.string().describe("Exercise name"),
  sets: z.number().min(1).max(10).describe("Number of sets"),
  muscleTarget: z.string().describe("Primary muscle target"),
  tempo: z.string().nullable().describe("Tempo pattern or null"),
  cues: z.array(z.string()).min(2).max(4).describe("2-4 technique cues"),
  detailedInstructions: z
    .string()
    .nullable()
    .describe("Step-by-step instructions"),
  setDetails: z
    .array(/* SetDetailSchema */)
    .describe("Individual set prescriptions"),
  equipment_needed: z.array(z.string()).describe("Equipment required"),
  muscle_groups: z.array(z.string()).describe("All target muscles"),
});

/**
 * Swap suggestion schema.
 */
const SwapSuggestionSchema = z.object({
  rank: z
    .number()
    .min(1)
    .max(3)
    .describe("Ranking: 1 = best match, 2 = second best, 3 = third best"),
  exercise: ExerciseOutputSchema,
  explanation: z
    .string()
    .describe("2-3 sentence explanation of why this is a good swap"),
  match_score: z
    .number()
    .min(0)
    .max(100)
    .describe("Match score: 0-100 indicating how well it meets constraints"),
});

/**
 * Output schema for swap flow.
 */
export const AISwapOutputSchema = z.object({
  suggestions: z
    .array(SwapSuggestionSchema)
    .length(3)
    .describe("Exactly 3 alternative exercise suggestions, ranked"),
});

export type AISwapOutput = z.infer<typeof AISwapOutputSchema>;

// ============================================
// Helper Functions
// ============================================

// buildSystemPrompt() and buildUserPrompt() - see Task 1.2

/**
 * Recursively removes undefined values to make Firestore-compatible.
 * (Reuse pattern from generate-workout.ts)
 */
function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (entryValue === undefined) continue;
      const cleaned = removeUndefined(entryValue);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result as unknown as T;
  }
  return value;
}

/**
 * Transforms swap output to Firestore-compatible format.
 *
 * NOTE: This function will be used in Phase 2 (API routes) to transform the flow output
 * before returning to client. The flow itself returns the raw AI output.
 */
export function transformSwapOutputToFirestore(output: AISwapOutput): {
  suggestions: Array<{
    rank: number;
    exercise: TrainerWorkoutExercise;
    explanation: string;
    match_score: number;
  }>;
} {
  return {
    suggestions: output.suggestions.map((suggestion) => ({
      rank: suggestion.rank,
      explanation: suggestion.explanation,
      match_score: suggestion.match_score,
      exercise: removeUndefined({
        name: suggestion.exercise.name,
        sets: suggestion.exercise.sets,
        muscleTarget: suggestion.exercise.muscleTarget,
        tempo: suggestion.exercise.tempo ?? null,
        cues: suggestion.exercise.cues ?? [],
        detailedInstructions: suggestion.exercise.detailedInstructions ?? null,
        setDetails: suggestion.exercise.setDetails.map((set) =>
          removeUndefined({
            reps: set.reps,
            weight: set.weight,
            duration: set.duration,
            rest: set.rest,
            notes: set.notes,
          })
        ),
        equipment_needed: suggestion.exercise.equipment_needed ?? [],
        muscle_groups: suggestion.exercise.muscle_groups ?? [],
      }),
    })),
  };
}

// Token estimation and cost calculation functions (reuse from edit-exercise.ts)

// ============================================
// Swap Exercise Flow
// ============================================

/**
 * Generates alternative exercise suggestions using AI.
 */
export async function swapExerciseFlow(
  input: AISwapRequestInput
): Promise<AISwapOutput> {
  // Validate input
  const validatedInput = AISwapRequestSchema.parse(input);

  // Build prompts
  const systemPrompt = buildSystemPrompt(validatedInput);
  const userPrompt = buildUserPrompt(validatedInput);

  console.log("=== EXERCISE SWAP ===");
  console.log("Exercise to replace:", validatedInput.context.exercise.name);
  console.log("Reason:", validatedInput.reason);
  console.log("Constraints:", validatedInput.constraints);

  // Call the AI model with structured output
  const result = await ai.generate({
    model: DEFAULT_MODEL,
    system: systemPrompt,
    prompt: userPrompt,
    output: {
      schema: AISwapOutputSchema,
      format: "json",
    },
    config: {
      temperature: 0.7,
      maxOutputTokens: 8192, // Larger for 3 exercises
    },
  });

  // Get the structured output
  const output = result.output;

  if (!output) {
    console.error("AI returned null output");
    throw new Error("AI generation returned empty output");
  }

  console.log("Generated swap suggestions:", output.suggestions.length);
  output.suggestions.forEach((s) => {
    console.log(`Rank ${s.rank}: ${s.exercise.name} (score: ${s.match_score})`);
  });

  // Validate suggestions structure
  if (!output.suggestions || output.suggestions.length !== 3) {
    console.error("Invalid suggestions structure:", output);
    throw new Error("AI generation must return exactly 3 suggestions");
  }

  // Validate rankings are unique (1, 2, 3)
  const ranks = output.suggestions.map((s) => s.rank).sort();
  if (ranks[0] !== 1 || ranks[1] !== 2 || ranks[2] !== 3) {
    console.warn("Invalid rankings detected, correcting...");
    // Re-rank based on match score
    output.suggestions.sort((a, b) => b.match_score - a.match_score);
    output.suggestions.forEach((s, i) => {
      s.rank = i + 1;
    });
  }

  // Validate each suggestion has complete exercise
  for (const suggestion of output.suggestions) {
    if (!suggestion.exercise || !suggestion.exercise.name) {
      console.error("Invalid exercise in suggestion:", suggestion);
      throw new Error("AI generation returned invalid exercise in suggestion");
    }

    // Ensure setDetails length matches sets count
    if (suggestion.exercise.setDetails.length !== suggestion.exercise.sets) {
      console.warn(
        `SetDetails length (${suggestion.exercise.setDetails.length}) doesn't match sets (${suggestion.exercise.sets}) for ${suggestion.exercise.name}. Adjusting...`
      );
      suggestion.exercise.setDetails = suggestion.exercise.setDetails.slice(
        0,
        suggestion.exercise.sets
      );
    }
  }

  return output;
}
```

#### Implementation Steps

1. Create file `src/lib/genkit/flows/swap-exercise.ts`
2. Define input schema (`AISwapRequestSchema`) matching Task 1.1 types
3. Define output schema (array of exactly 3 suggestions with rank, exercise, explanation, match_score)
4. Implement `buildSystemPrompt()` (see Task 1.2 for structure)
5. Implement `buildUserPrompt()` (see Task 1.2 for structure)
6. Implement `swapExerciseFlow()` function with:
   - Input validation using Zod schema
   - Prompt building
   - AI generation with structured output
   - Output validation (exactly 3 suggestions, valid rankings 1-3, complete exercises)
   - Automatic re-ranking if rankings are invalid (sort by match_score)
   - Error handling with descriptive messages
7. Add `removeUndefined()` helper function (reuse pattern from generate-workout.ts)
8. Add `transformSwapOutputToFirestore()` helper (exported for Phase 2 API route use)
9. Import and reuse `estimateTokenUsage()` and `estimateCostUsd()` from edit-exercise.ts (or create shared utility)
10. Export all schemas, types, and functions
11. Add comprehensive logging for debugging

#### Testing Checklist

**For `edit-exercise.ts`:**

- [ ] TypeScript compilation passes
- [ ] Input schema validation works
- [ ] Flow can be called with valid input
- [ ] Output matches TrainerWorkoutExercise interface
- [ ] Token estimation is reasonable
- [ ] Cost calculation is accurate

**For `swap-exercise.ts`:**

- [ ] TypeScript compilation passes
- [ ] Input schema validation works
- [ ] Flow returns array of 3 suggestions
- [ ] Suggestions are ranked correctly
- [ ] Each suggestion includes complete exercise
- [ ] Match scores are provided

---

## Phase 1 Completion Criteria

All Phase 1 tasks are complete when:

1. ✅ **Type Definitions**: All types defined and exported in `src/types/ai-exercise-editor.ts`
   - All types from Task 1.1 are implemented
   - Types align with Firestore schema requirements
   - TypeScript compilation passes

2. ✅ **Prompt Building Functions**: Prompt building functions implemented in flow files
   - `buildSystemPrompt()` implemented in both `edit-exercise.ts` and `swap-exercise.ts`
   - `buildUserPrompt()` implemented in both flow files
   - `getModeGuidance()` helper implemented for edit flow
   - Prompts follow existing codebase patterns (programmatic string building)

3. ✅ **Edit Flow**: `editExerciseFlow()` fully implemented
   - Input/output schemas defined with Zod
   - Flow function implemented with validation and error handling
   - Transformation helper exported for Phase 2 use
   - Token estimation and cost calculation functions implemented

4. ✅ **Swap Flow**: `swapExerciseFlow()` fully implemented
   - Input/output schemas defined with Zod
   - Flow function implemented with validation and error handling
   - Automatic re-ranking logic for invalid rankings
   - Transformation helper exported for Phase 2 use

5. ✅ **TypeScript Compilation**: All files compile without errors
   - No type errors
   - All imports resolve correctly
   - Exports are properly defined

6. ✅ **Integration**: Types, prompt functions, and flows work together correctly
   - Types match Zod schema requirements
   - Prompts generate valid inputs for AI
   - Flows produce valid outputs matching TrainerWorkoutExercise interface

## Next Steps After Phase 1

Once Phase 1 is complete, proceed to **Phase 2: API Routes & Services**, which will:

1. Create API routes that call the Genkit flows
2. Add authentication and rate limiting
3. Create client service for calling the API routes
4. Implement error handling and cost tracking

## Important Notes

### Code Patterns

- **Prompts**: Built programmatically using string concatenation (not template files), following the pattern in `generate-workout.ts`
- **Schemas**: Use Zod for input/output validation with `.describe()` annotations for AI guidance
- **Error Handling**: Follow patterns from `generate-workout.ts` with descriptive error messages
- **Firestore Compatibility**: Use `removeUndefined()` helper to ensure no undefined values (Firestore rejects undefined)
- **Transformation**: Transformation helpers are exported for Phase 2 API routes, not used in flows themselves

### Key Decisions

1. **Prompts are programmatic**: Unlike workout generation which has a `.prompt` file for documentation, exercise editing prompts are built in TypeScript functions. This provides better type safety and flexibility.

2. **Transformation in API routes**: Flow functions return raw AI output. Transformation to Firestore format happens in Phase 2 API routes, following the pattern from `generate-workout.ts`.

3. **Shared utilities**: Token estimation and cost calculation can be shared between flows or imported from a common utility (consider creating `src/lib/genkit/utils/token-estimation.ts` if both flows need them).

4. **SetDetails alignment**: Both flows handle cases where AI returns setDetails count that doesn't match sets count. Edit flow respects `preserve_sets_reps` option; swap flow trims to match.

5. **Ranking validation**: Swap flow automatically corrects invalid rankings by sorting by match_score, ensuring ranks are always 1, 2, 3.

### Testing Approach

- Unit tests should focus on:
  - Schema validation (Zod parsing)
  - Prompt building (string output correctness)
  - Transformation helpers (Firestore compatibility)
  - Error handling (invalid inputs/outputs)

- Integration tests in Phase 2 will test:
  - Actual AI generation (with mocked responses if needed)
  - End-to-end flow execution
  - Cost tracking accuracy

### Dependencies

- All dependencies already exist in `package.json`:
  - `genkit` and `@genkit-ai/googleai` for AI flows
  - `zod` for schema validation
  - `firebase/firestore` types for Firestore compatibility

No new package installations required for Phase 1.
