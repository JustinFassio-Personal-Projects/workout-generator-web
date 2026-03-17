import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { removeUndefined } from "@/lib/genkit/utils/firestore-helpers";
import { withGenAISpan } from "@/lib/sentry";
import { estimateTokenUsage } from "@/lib/genkit/flows/edit-exercise";

// Token estimation and cost calculation utilities (e.g., estimateTokenUsage, estimateCostUsd)
// are defined and exported in edit-exercise.ts and will be used by Phase 2 API routes that
// wrap this flow. This swap-exercise flow itself does not implement or import those utilities.

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
    adjacent_exercises: z.array(z.string()).optional(),
  }),
});

export type AISwapRequestInput = z.infer<typeof AISwapRequestSchema>;

export interface AISwapPromptOverrides {
  systemPrompt?: string | null;
}

// ============================================
// Output Schema
// ============================================

/**
 * Set detail schema matching TrainerSetDetail (reuse from edit-exercise).
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
 * Exercise schema for swap suggestions (same as edit flow).
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
    .describe(
      "Match score: 0-100 indicating how well it meets constraints and addresses the swap reason"
    ),
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

// ============================================
// Swap Exercise Flow
// ============================================

/**
 * Generates alternative exercise suggestions using AI.
 */
export async function swapExerciseFlow(
  input: AISwapRequestInput,
  promptOverrides?: AISwapPromptOverrides
): Promise<AISwapOutput> {
  // Validate input
  const validatedInput = AISwapRequestSchema.parse(input);

  // Build prompts
  const systemPrompt =
    promptOverrides?.systemPrompt ?? buildSystemPrompt(validatedInput);
  const userPrompt = buildUserPrompt(validatedInput);

  // Call the AI model with structured output (wrapped for Sentry AI Insights)
  const result = await withGenAISpan(
    {
      operationName: "request",
      model: DEFAULT_MODEL,
      temperature: 0.7,
      maxTokens: 8192,
      flowName: "swap-exercise",
    },
    async ({ setUsage }) => {
      const res = await ai.generate({
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
      const out = res.output;
      if (out) {
        const usage = estimateTokenUsage(
          systemPrompt + userPrompt,
          JSON.stringify(out)
        );
        setUsage(usage);
      }
      return res;
    }
  );

  // Get the structured output
  const output = result.output;

  if (!output) {
    console.error("AI returned null output");
    throw new Error("AI generation returned empty output");
  }

  // Suggestions length is guaranteed by AISwapOutputSchema (.length(3))
  // Zod validation would have thrown before reaching this point if invalid
  console.log("Generated swap suggestions:", output.suggestions.length);
  output.suggestions.forEach((s) => {
    console.log(`Rank ${s.rank}: ${s.exercise.name} (score: ${s.match_score})`);
  });

  // Validate rankings are unique (1, 2, 3)
  const ranks = output.suggestions.map((s) => s.rank).sort();
  if (ranks[0] !== 1 || ranks[1] !== 2 || ranks[2] !== 3) {
    console.warn("Invalid rankings detected, correcting...");
    // Re-rank based on match score
    output.suggestions.sort((a, b) => b.match_score - a.match_score);
    output.suggestions.forEach((s, i) => {
      s.rank = i + 1;
    });
    // Log corrected rankings for debugging visibility
    console.log("Corrected rankings:");
    output.suggestions.forEach((s) => {
      console.log(
        `Rank ${s.rank}: ${s.exercise.name} (score: ${s.match_score})`
      );
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
      const targetSets = suggestion.exercise.sets;
      const currentDetails = suggestion.exercise.setDetails;
      if (currentDetails.length > targetSets) {
        // Too many setDetails: trim the array
        suggestion.exercise.setDetails = currentDetails.slice(0, targetSets);
      } else {
        // Too few setDetails: pad the array with default set detail objects
        const paddedDetails = [...currentDetails];
        const lastSet = currentDetails[currentDetails.length - 1];
        if (lastSet) {
          // Pad by duplicating the last entry
          while (paddedDetails.length < targetSets) {
            paddedDetails.push({ ...lastSet });
          }
        } else {
          // No setDetails exist, create default entries
          const defaultSet = {
            reps: "10",
            weight: "Moderate",
            rest: "60s",
          };
          while (paddedDetails.length < targetSets) {
            paddedDetails.push({ ...defaultSet });
          }
        }
        suggestion.exercise.setDetails = paddedDetails;
      }
    }
  }

  return output;
}
