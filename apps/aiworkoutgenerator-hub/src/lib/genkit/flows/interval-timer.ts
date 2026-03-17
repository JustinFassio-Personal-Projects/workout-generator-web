import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import type { FitnessLevel } from "@/types/firestore";
import { withGenAISpan } from "@/lib/sentry";

// ============================================
// Input Schema
// ============================================

/**
 * Intensity level for interval timer presets.
 */
export type IntervalIntensity = "easy" | "moderate" | "intense";

/**
 * Input schema for Interval Timer flow.
 */
export const IntervalTimerRequestSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise"),
  exerciseData: z.object({
    sets: z.number().describe("Number of sets"),
    tempo: z
      .string()
      .nullable()
      .optional()
      .describe("Exercise tempo e.g., '3-0-1-0'"),
    muscleTarget: z.string().describe("Primary muscle target"),
    duration: z
      .string()
      .optional()
      .describe("Duration if specified in set details e.g., '45s'"),
    notes: z
      .string()
      .optional()
      .describe("Set notes that may indicate bilateral work"),
  }),
  userLevel: z
    .enum(["beginner", "intermediate", "advanced", "elite", "athlete"])
    .describe("User's fitness level"),
  intensityPreference: z
    .enum(["easy", "moderate", "intense", "custom"])
    .optional()
    .describe("User's preferred intensity level"),
});

export type IntervalTimerRequestInput = z.infer<
  typeof IntervalTimerRequestSchema
>;

// ============================================
// Output Schema
// ============================================

/**
 * Output schema for Interval Timer flow.
 */
export const IntervalTimerOutputSchema = z.object({
  workDuration: z.number().describe("Recommended work duration in seconds"),
  restDuration: z.number().describe("Recommended rest duration in seconds"),
  isBilateral: z
    .boolean()
    .describe(
      "Whether this exercise is unilateral (single limb) requiring side-switching"
    ),
  switchIndicator: z
    .string()
    .optional()
    .describe(
      "Text to display when switching sides, e.g., 'Switch to left leg'"
    ),
  explanation: z
    .string()
    .describe(
      "Brief explanation of why these timings are recommended (1-2 sentences)"
    ),
  intensityLevel: z
    .enum(["easy", "moderate", "intense"])
    .describe("The intensity level these timings correspond to"),
});

export type IntervalTimerOutput = z.infer<typeof IntervalTimerOutputSchema>;

// ============================================
// Preset Values
// ============================================

/**
 * Predefined interval presets by intensity level.
 */
export const INTERVAL_PRESETS: Record<
  IntervalIntensity,
  { work: number; rest: number }
> = {
  easy: { work: 30, rest: 60 },
  moderate: { work: 45, rest: 45 },
  intense: { work: 60, rest: 30 },
};

/**
 * Known bilateral exercise patterns for quick detection.
 */
export const BILATERAL_PATTERNS = [
  "single leg",
  "single arm",
  "single-leg",
  "single-arm",
  "one leg",
  "one arm",
  "one-leg",
  "one-arm",
  "unilateral",
  "lunge",
  "split squat",
  "bulgarian",
  "step up",
  "step-up",
  "pistol",
  "one legged",
  "one armed",
];

// ============================================
// Helper Functions
// ============================================

/**
 * Quick local check for bilateral exercises without AI.
 */
export function quickBilateralCheck(
  exerciseName: string,
  notes?: string
): boolean {
  const combined = `${exerciseName} ${notes || ""}`.toLowerCase();
  return BILATERAL_PATTERNS.some((pattern) => combined.includes(pattern));
}

/**
 * Builds the system prompt for interval timer recommendations.
 */
export function buildSystemPrompt(): string {
  return `You are an expert fitness coach specializing in interval training and workout timing optimization.

Your task is to analyze an exercise and recommend optimal work and rest intervals.

TIMING GUIDELINES BY INTENSITY:
- Easy: 30s work / 60s rest - For beginners, recovery days, low energy levels
- Moderate: 45s work / 45s rest - For intermediate trainees, standard training
- Intense: 60s work / 30s rest - For advanced trainees, high-intensity conditioning

FACTORS TO CONSIDER:
1. Exercise complexity (compound vs isolation movements)
2. User's fitness level (beginner to athlete)
3. Tempo data if provided (slower tempo = shorter work duration needed)
4. Muscle target (larger muscle groups may need more rest)
5. Whether the exercise is unilateral (requires working each side separately)

BILATERAL/UNILATERAL DETECTION:
Identify exercises that work one limb at a time:
- Single leg/arm exercises (lunges, single-leg deadlifts, one-arm rows)
- Step-ups, Bulgarian split squats, pistol squats
- Any exercise with "unilateral" or "single" in the name
For bilateral exercises, the total work time should be split between sides.

RESPONSE FORMAT:
- workDuration: Total work time in seconds (if bilateral, this is per side * 2)
- restDuration: Rest time between sets in seconds
- isBilateral: true if working one limb at a time
- switchIndicator: Text to show when switching (e.g., "Switch to other leg")
- explanation: Brief rationale for your recommendation
- intensityLevel: Which preset these timings most closely align with`;
}

/**
 * Builds the user prompt with exercise context.
 */
export function buildUserPrompt(input: IntervalTimerRequestInput): string {
  const parts: string[] = [];

  parts.push(`Analyze this exercise and recommend optimal interval timings:`);
  parts.push(`\nExercise: ${input.exerciseName}`);
  parts.push(`User Fitness Level: ${input.userLevel}`);
  parts.push(`Sets: ${input.exerciseData.sets}`);
  parts.push(`Muscle Target: ${input.exerciseData.muscleTarget}`);

  if (input.exerciseData.tempo) {
    parts.push(`Tempo: ${input.exerciseData.tempo}`);
  }

  if (input.exerciseData.duration) {
    parts.push(`Specified Duration: ${input.exerciseData.duration}`);
  }

  if (input.exerciseData.notes) {
    parts.push(`Notes: ${input.exerciseData.notes}`);
  }

  if (input.intensityPreference && input.intensityPreference !== "custom") {
    parts.push(`\nUser prefers ${input.intensityPreference} intensity level.`);
  }

  parts.push(
    `\nProvide your timing recommendation in the required JSON format.`
  );

  return parts.join("\n");
}

/**
 * Maps fitness level to a base intensity suggestion.
 */
export function getBaseIntensityForLevel(
  level: FitnessLevel
): IntervalIntensity {
  switch (level) {
    case "beginner":
      return "easy";
    case "intermediate":
      return "moderate";
    case "advanced":
    case "athlete":
      return "intense";
    default:
      return "moderate";
  }
}

// ============================================
// Main Flow
// ============================================

/**
 * Interval Timer flow: Generates optimal work/rest intervals
 * based on exercise type and user fitness level.
 *
 * @param input - Exercise data and user level
 * @returns Recommended intervals with bilateral detection
 */
export async function intervalTimerFlow(
  input: IntervalTimerRequestInput
): Promise<IntervalTimerOutput> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  const response = await withGenAISpan(
    {
      operationName: "request",
      model: DEFAULT_MODEL,
      temperature: 0.4,
      flowName: "interval-timer",
    },
    async ({ setUsage }) => {
      const res = await ai.generate({
        model: DEFAULT_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        output: {
          schema: IntervalTimerOutputSchema,
          format: "json",
        },
        config: {
          temperature: 0.4, // Lower temperature for more consistent timing recommendations
          topK: 40,
          topP: 0.95,
        },
      });
      const out = res.output as IntervalTimerOutput | undefined;
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

  const output = response.output as IntervalTimerOutput;

  // Validate and constrain outputs to reasonable ranges
  output.workDuration = Math.max(10, Math.min(120, output.workDuration));
  output.restDuration = Math.max(10, Math.min(180, output.restDuration));

  // Ensure bilateral exercises have a switch indicator
  if (output.isBilateral && !output.switchIndicator) {
    output.switchIndicator = "Switch sides";
  }

  return output;
}

/**
 * Get preset intervals without AI call.
 * Useful when user selects a specific intensity level.
 */
export function getPresetIntervals(
  intensity: IntervalIntensity,
  exerciseName: string,
  notes?: string
): IntervalTimerOutput {
  const preset = INTERVAL_PRESETS[intensity];
  const isBilateral = quickBilateralCheck(exerciseName, notes);

  return {
    workDuration: preset.work,
    restDuration: preset.rest,
    isBilateral,
    switchIndicator: isBilateral ? "Switch sides" : undefined,
    explanation: `Using ${intensity} intensity preset: ${preset.work}s work, ${preset.rest}s rest.`,
    intensityLevel: intensity,
  };
}

/**
 * Estimates token usage for Interval Timer generation.
 */
export function estimateTokenUsage(
  input: string,
  output: string
): { inputTokens: number; outputTokens: number; totalTokens: number } {
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
 */
export function estimateCostUsd(tokens: {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}): number {
  const GEMINI_FLASH_INPUT_PRICE_PER_M_TOKENS = 0.075;
  const GEMINI_FLASH_OUTPUT_PRICE_PER_M_TOKENS = 0.3;

  const inputCost =
    (tokens.inputTokens / 1_000_000) * GEMINI_FLASH_INPUT_PRICE_PER_M_TOKENS;
  const outputCost =
    (tokens.outputTokens / 1_000_000) * GEMINI_FLASH_OUTPUT_PRICE_PER_M_TOKENS;

  return inputCost + outputCost;
}
