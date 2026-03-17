import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { removeUndefined } from "@/lib/genkit/utils/firestore-helpers";
import { withGenAISpan } from "@/lib/sentry";
import { estimateTokenUsage } from "@/lib/genkit/flows/edit-exercise";

// ============================================
// Input Schema
// ============================================

/**
 * Input schema for exercise add flow.
 * Adds a new exercise; context includes reference exercise for position/flow.
 */
export const AIAddRequestSchema = z.object({
  reason: z.string().min(1).max(500),
  constraints: z.object({
    same_muscle_group: z.boolean(),
    same_equipment: z.boolean(),
    same_difficulty: z.boolean(),
    similar_movement_pattern: z.boolean(),
  }),
  context: z.object({
    reference_exercise: z.object({
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

export type AIAddRequestInput = z.infer<typeof AIAddRequestSchema>;

export interface AIAddPromptOverrides {
  systemPrompt?: string | null;
}

// ============================================
// Output Schema (same as swap)
// ============================================

const SetDetailSchema = z.object({
  reps: z.string().describe("Rep count or style, e.g., '12', 'AMRAP', '10-12'"),
  weight: z
    .string()
    .describe("Suggested intensity, e.g., 'RPE 8', 'Heavy', 'Moderate'"),
  duration: z.string().optional().describe("Time if applicable, e.g., '45s'"),
  rest: z.string().describe("Rest after set, e.g., '60s', '90s'"),
  notes: z.string().optional().describe("Set-specific notes"),
});

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

const AddSuggestionSchema = z.object({
  rank: z
    .number()
    .min(1)
    .max(3)
    .describe("Ranking: 1 = best match, 2 = second best, 3 = third best"),
  exercise: ExerciseOutputSchema,
  explanation: z
    .string()
    .describe("2-3 sentence explanation of why this is a good exercise to add"),
  match_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Match score: 0-100 indicating how well it meets constraints and addresses the add reason"
    ),
});

export const AIAddOutputSchema = z.object({
  suggestions: z
    .array(AddSuggestionSchema)
    .length(3)
    .describe("Exactly 3 new exercise suggestions, ranked"),
});

export type AIAddOutput = z.infer<typeof AIAddOutputSchema>;

// ============================================
// Helper Functions
// ============================================

function buildSystemPrompt(input: AIAddRequestInput): string {
  const injuryWarning =
    input.context.user_injuries.length > 0
      ? `\n\nCRITICAL SAFETY: User has injuries in these areas - ${input.context.user_injuries.join(", ")}. DO NOT suggest exercises that stress these areas.`
      : "";

  return `You are an expert Personal Trainer adding a new exercise to a workout program.
Your goal is to suggest new exercises that meet the user's needs and constraints. The user will insert one of these exercises before or after a reference exercise in the section.

OUTPUT FORMAT:
- Return exactly 3 suggestions ranked by best fit (rank 1 = best match)
- Each suggestion must include a complete exercise object with all required fields
- Provide a clear explanation (2-3 sentences) for each suggestion
- Assign a match score (0-100) based on how well it meets constraints and addresses the add reason
- No markdown formatting outside the JSON structure${injuryWarning}`;
}

function buildUserPrompt(input: AIAddRequestInput): string {
  const parts: string[] = [];
  const { reason, constraints, context } = input;
  const { reference_exercise, adjacent_exercises } = context;

  parts.push(
    `Suggest new exercises to add to the workout (inserted near: ${reference_exercise.name})`
  );
  parts.push(`\nReason / what to add: "${reason}"`);

  parts.push(`\n## REFERENCE EXERCISE (position context)`);
  parts.push(`Name: ${reference_exercise.name}`);
  parts.push(`Muscle Target: ${reference_exercise.muscleTarget}`);
  parts.push(`Muscle Groups: ${reference_exercise.muscle_groups.join(", ")}`);
  parts.push(
    `Equipment: ${reference_exercise.equipment_needed.join(", ") || "Bodyweight"}`
  );
  parts.push(`Sets: ${reference_exercise.sets}`);
  parts.push(`Difficulty: ${context.workout_difficulty}`);

  parts.push(`\n## WORKOUT CONTEXT`);
  parts.push(`Section: ${context.section_type}`);
  parts.push(`Focus: ${context.workout_focus || "General"}`);
  if (adjacent_exercises && adjacent_exercises.length > 0) {
    parts.push(`Nearby exercises (for flow): ${adjacent_exercises.join(", ")}`);
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
    `\nProvide 3 new exercises ranked by best fit. Each must be a complete exercise ready to add to the workout.`
  );

  return parts.join("\n");
}

export function transformAddOutputToFirestore(output: AIAddOutput): {
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
// Add Exercise Flow
// ============================================

export async function addExerciseFlow(
  input: AIAddRequestInput,
  promptOverrides?: AIAddPromptOverrides
): Promise<AIAddOutput> {
  const validatedInput = AIAddRequestSchema.parse(input);

  const systemPrompt =
    promptOverrides?.systemPrompt ?? buildSystemPrompt(validatedInput);
  const userPrompt = buildUserPrompt(validatedInput);

  const result = await withGenAISpan(
    {
      operationName: "request",
      model: DEFAULT_MODEL,
      temperature: 0.7,
      maxTokens: 8192,
      flowName: "add-exercise",
    },
    async ({ setUsage }) => {
      const res = await ai.generate({
        model: DEFAULT_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        output: {
          schema: AIAddOutputSchema,
          format: "json",
        },
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
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

  const output = result.output;

  if (!output) {
    throw new Error("AI generation returned empty output");
  }

  const ranks = output.suggestions.map((s) => s.rank).sort();
  if (ranks[0] !== 1 || ranks[1] !== 2 || ranks[2] !== 3) {
    output.suggestions.sort((a, b) => b.match_score - a.match_score);
    output.suggestions.forEach((s, i) => {
      s.rank = i + 1;
    });
  }

  for (const suggestion of output.suggestions) {
    if (!suggestion.exercise || !suggestion.exercise.name) {
      throw new Error("AI generation returned invalid exercise in suggestion");
    }

    if (suggestion.exercise.setDetails.length !== suggestion.exercise.sets) {
      const targetSets = suggestion.exercise.sets;
      const currentDetails = suggestion.exercise.setDetails;
      if (currentDetails.length > targetSets) {
        suggestion.exercise.setDetails = currentDetails.slice(0, targetSets);
      } else {
        const paddedDetails = [...currentDetails];
        const lastSet = currentDetails[currentDetails.length - 1];
        if (lastSet) {
          while (paddedDetails.length < targetSets) {
            paddedDetails.push({ ...lastSet });
          }
        } else {
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
