import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { removeUndefined } from "@/lib/genkit/utils/firestore-helpers";
import { withGenAISpan } from "@/lib/sentry";

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
    "coach_explain",
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

export interface AIEditPromptOverrides {
  systemPrompt?: string | null;
}

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
 * Estimates token usage for cost tracking.
 * Rough estimate based on character count.
 *
 * @param input - The input prompt content
 * @param output - The output response content
 * @returns Object with inputTokens, outputTokens, and totalTokens
 */
export function estimateTokenUsage(
  input: string,
  output: string
): { inputTokens: number; outputTokens: number; totalTokens: number } {
  // Rough estimate: ~4 characters per token
  const inputTokens = Math.ceil(input.length / 4);
  const outputTokens = Math.ceil(output.length / 4);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

/**
 * Estimates cost in USD based on token usage.
 *
 * Pricing model (Gemini 2.0 Flash as of 2026):
 * - Input tokens:  $0.075 per 1M tokens
 * - Output tokens: $0.30 per 1M tokens
 *
 * When an object with inputTokens and outputTokens is provided, uses separate
 * pricing for accurate cost calculation. When a number (total tokens) is provided
 * (legacy format), uses a blended price assuming roughly 50/50 input/output split.
 *
 * The default blended price is the simple average of input and output prices:
 *   (0.075 + 0.30) / 2 = 0.1875 per 1M tokens
 *
 * Can be overridden via environment variables:
 * - GENKIT_BLENDED_TOKEN_PRICE_PER_M (preferred): explicit blended price
 * - GENKIT_TOKEN_PRICE_PER_M: legacy name kept for backward compatibility
 *
 * @param tokens - Token usage object with inputTokens, outputTokens, totalTokens, or total token count number
 * @returns Estimated cost in USD
 */
export function estimateCostUsd(
  tokens:
    | number
    | { inputTokens: number; outputTokens: number; totalTokens: number }
): number {
  // Documented Gemini 2.0 Flash pricing (USD per 1M tokens)
  const GEMINI_FLASH_INPUT_PRICE_PER_M_TOKENS = 0.075;
  const GEMINI_FLASH_OUTPUT_PRICE_PER_M_TOKENS = 0.3;

  // Blended default assuming ~50/50 input/output token usage
  const DEFAULT_BLENDED_PRICE_PER_M_TOKENS =
    (GEMINI_FLASH_INPUT_PRICE_PER_M_TOKENS +
      GEMINI_FLASH_OUTPUT_PRICE_PER_M_TOKENS) /
    2;

  // If object format provided, use separate pricing for accuracy
  if (
    typeof tokens !== "number" &&
    tokens.inputTokens !== undefined &&
    tokens.outputTokens !== undefined
  ) {
    const inputCost =
      (tokens.inputTokens / 1_000_000) * GEMINI_FLASH_INPUT_PRICE_PER_M_TOKENS;
    const outputCost =
      (tokens.outputTokens / 1_000_000) *
      GEMINI_FLASH_OUTPUT_PRICE_PER_M_TOKENS;
    return inputCost + outputCost;
  }

  // For number (legacy) or object with only totalTokens, use blended price
  // Prefer explicit blended env var, but fall back to legacy name
  const envBlendedPrice =
    process.env.GENKIT_BLENDED_TOKEN_PRICE_PER_M ??
    process.env.GENKIT_TOKEN_PRICE_PER_M;
  const parsedPrice = envBlendedPrice ? Number(envBlendedPrice) : NaN;
  const pricePerMTokens =
    Number.isFinite(parsedPrice) && parsedPrice > 0
      ? parsedPrice
      : DEFAULT_BLENDED_PRICE_PER_M_TOKENS;

  const totalTokens = typeof tokens === "number" ? tokens : tokens.totalTokens;
  return (totalTokens / 1_000_000) * pricePerMTokens;
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
  input: AIEditRequestInput,
  promptOverrides?: AIEditPromptOverrides
): Promise<AIEditOutput> {
  // Validate input
  const validatedInput = AIEditRequestSchema.parse(input);

  // Build prompts
  const systemPrompt =
    promptOverrides?.systemPrompt ?? buildSystemPrompt(validatedInput);
  const userPrompt = buildUserPrompt(validatedInput);

  console.log("=== EXERCISE EDIT ===");
  console.log("Mode:", validatedInput.mode);
  console.log("Exercise:", validatedInput.context.exercise.name);
  console.log(
    "User prompt:",
    validatedInput.user_prompt.substring(0, 300) +
      (validatedInput.user_prompt.length > 300 ? "..." : "")
  );

  // Call the AI model with structured output (wrapped for Sentry AI Insights)
  const result = await withGenAISpan(
    {
      operationName: "request",
      model: DEFAULT_MODEL,
      temperature: 0.7,
      maxTokens: 4096,
      flowName: "edit-exercise",
    },
    async ({ setUsage }) => {
      const res = await ai.generate({
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

  // Exercise structure is guaranteed by AIEditOutputSchema (exercise field is required,
  // and ExerciseOutputSchema.name is a required string). Zod validation would have
  // thrown before reaching this point if invalid.
  console.log("Modified exercise:", output.exercise.name);
  console.log("Explanation:", output.explanation.substring(0, 100) + "...");

  // Ensure setDetails length matches sets count
  if (output.exercise.setDetails.length !== output.exercise.sets) {
    console.warn(
      `SetDetails length (${output.exercise.setDetails.length}) doesn't match sets (${output.exercise.sets}). Adjusting...`
    );
    // Adjust sets to match setDetails (or pad/trim setDetails - choose based on preserve_sets_reps)
    if (validatedInput.options.preserve_sets_reps) {
      // If preserving, pad or trim setDetails to match original sets count
      const targetSets = validatedInput.context.exercise.sets;
      if (output.exercise.setDetails.length > targetSets) {
        // Trim setDetails to match original sets count (slice removes excess entries)
        output.exercise.setDetails = output.exercise.setDetails.slice(
          0,
          targetSets
        );
      } else if (output.exercise.setDetails.length < targetSets) {
        // Pad setDetails when AI returns fewer entries than expected
        // Note: We use push (not slice) because slice cannot add entries, only remove them
        const lastSet =
          output.exercise.setDetails[output.exercise.setDetails.length - 1];
        if (lastSet) {
          // Duplicate the last setDetail entry to pad the array
          while (output.exercise.setDetails.length < targetSets) {
            output.exercise.setDetails.push({ ...lastSet });
          }
        } else {
          // No setDetails exist (empty array), create default entries (shouldn't happen but handle gracefully)
          const defaultSet = {
            reps: "10",
            weight: "Moderate",
            rest: "60s",
          };
          while (output.exercise.setDetails.length < targetSets) {
            output.exercise.setDetails.push({ ...defaultSet });
          }
        }
      }
      output.exercise.sets = targetSets;
    } else {
      // Otherwise, update sets to match setDetails
      output.exercise.sets = output.exercise.setDetails.length;
    }
  }

  return output;
}
