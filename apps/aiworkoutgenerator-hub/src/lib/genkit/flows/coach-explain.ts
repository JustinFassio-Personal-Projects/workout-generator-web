import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import { withGenAISpan } from "@/lib/sentry";

// ============================================
// Input Schema
// ============================================

/**
 * User fitness level for Coach Explain.
 */
export type CoachExplainUserLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "elite"
  | "athlete";

/**
 * Input schema for Coach Explain flow.
 */
export const CoachExplainRequestSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise"),
  biomechanicalPoints: z
    .array(z.string())
    .describe("Biomechanical analysis points from certified image"),
  userLevel: z
    .enum(["beginner", "intermediate", "advanced", "elite", "athlete"])
    .describe("User's fitness level for personalized explanation"),
});

export type CoachExplainRequestInput = z.infer<
  typeof CoachExplainRequestSchema
>;

export interface CoachExplainPromptOverrides {
  systemPrompt?: string | null;
}

// ============================================
// Output Schema
// ============================================

/**
 * Output schema for Coach Explain flow.
 */
export const CoachExplainOutputSchema = z.object({
  exerciseGuide: z
    .string()
    .describe(
      "Step-by-step instructions for performing the exercise, tailored to the user's fitness level"
    ),
  anatomyBreakdown: z
    .string()
    .describe(
      "Detailed breakdown of which muscles are working (primary vs secondary) and biomechanical analysis"
    ),
  theWhy: z
    .string()
    .describe(
      "Explanation of why this exercise is beneficial, tailored to the user's goals and fitness level"
    ),
  detailedInstructions: z
    .string()
    .describe(
      "Combined formatted content with all three sections (Exercise Guide, Anatomy Breakdown, The Why) ready for display"
    ),
});

export type CoachExplainOutput = z.infer<typeof CoachExplainOutputSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Builds the system prompt based on user level.
 * Each level has specific tone, vocabulary, and focus areas.
 */
export function buildSystemPrompt(userLevel: CoachExplainUserLevel): string {
  const prompts: Record<CoachExplainUserLevel, string> = {
    beginner: `You are an expert Personal Trainer explaining an exercise to a Beginner trainee.

TONE: Encouraging, patient, and authoritative but friendly. Use a warm, supportive coaching voice.

VOCABULARY: 5th-grade reading level. Avoid Latin anatomical terms. Use simple, relatable language:
- Use "front of the thigh" instead of "Quadriceps Femoris"
- Use "back of the upper arm" instead of "Triceps Brachii"
- Use "shoulder blade" instead of "Scapula"
- Use analogies and everyday comparisons

DETAIL FOCUS:
- High focus on "starting position" and "safety"
- Emphasize common mistakes to avoid
- Provide clear, simple step-by-step instructions
- Include encouragement and reassurance

THE WHY: Focus on general health, posture, feeling good, and building confidence. Explain benefits in terms of daily life improvements.`,

    intermediate: `You are an expert Personal Trainer explaining an exercise to an Intermediate trainee.

TONE: Coaching-focused, motivational, and educational. Speak as a knowledgeable coach to an eager learner.

VOCABULARY: Bridge layman terms and technical anatomy. Introduce anatomical terms but explain them:
- "Your lats, the large muscles down the side of your back"
- "Your glutes, the muscles in your buttocks"
- "Your core, the muscles around your midsection that stabilize your spine"

DETAIL FOCUS:
- Focus on "mind-muscle connection" and range of motion
- Explain primary vs secondary muscle groups
- Provide detailed cueing on form
- Include progression tips

THE WHY: Focus on muscle shape, strength progression, variety in training, and building on fundamentals.`,

    advanced: `You are an expert Personal Trainer explaining an exercise to an Advanced lifter.

TONE: Professional, direct, peer-to-peer. Speak as an expert to an expert.

VOCABULARY: Technical anatomical terms are expected and should be used:
- "Distal insertion"
- "Moment arm"
- "Eccentric phase"
- "Isometric contraction"
- "Motor unit recruitment"

DETAIL FOCUS:
- Focus on isolation, tension curves, and advanced variations
- Discuss leverage and biomechanical efficiency
- Provide high-level cues regarding tempo, tension, and sticking points
- Include optimization strategies

THE WHY: Focus on correcting imbalances, maximizing hypertrophy, specific strength adaptation, and breaking through plateaus.`,

    elite: `You are an expert Personal Trainer explaining an exercise to an Elite competitor.

TONE: Clinical, analytical, precise. Speak with scientific rigor and precision.

VOCABULARY: Biomechanical physics and physiology terminology:
- "Motor unit recruitment"
- "Shear force"
- "Kinetic chain"
- "Force vector"
- "Joint angle optimization"
- "Systemic fatigue impact"

DETAIL FOCUS:
- Focus on micro-optimizations and joint angle manipulation
- Discuss force curves and load bias shifts
- Address injury mitigation at maximal loads
- Include periodization context

THE WHY: Focus on winning competitions, 1% marginal gains, mechanical efficiency optimization, and longevity at extremes of performance.`,

    athlete: `You are an expert Personal Trainer explaining an exercise to a Performance Athlete.

TONE: Dynamic, coach-to-player, energizing. Speak with urgency and performance focus.

VOCABULARY: Sports science terms:
- "Triple extension"
- "Proprioception"
- "Rate of Force Development (RFD)"
- "Ground reaction forces"
- "Power output"
- "Explosive strength"

DETAIL FOCUS:
- Focus on tempo, dynamic control, and core integration
- Emphasize explosiveness and power transfer
- Discuss functional transfer to sport
- Include sport-specific applications

THE WHY: Focus on sprint speed, jump height, changing direction, injury prevention in sport, and translating gym work to on-field performance.`,
  };

  return prompts[userLevel];
}

/**
 * Builds the user prompt with exercise and biomechanical context.
 */
export function buildUserPrompt(input: CoachExplainRequestInput): string {
  const parts: string[] = [];

  parts.push(
    `Generate a comprehensive, personalized exercise explanation for: ${input.exerciseName}`
  );
  parts.push(`\nUser Fitness Level: ${input.userLevel}`);

  // Biomechanical analysis context
  if (input.biomechanicalPoints.length > 0) {
    parts.push(`\n## BIOMECHANICAL ANALYSIS`);
    parts.push(
      `The following biomechanical analysis points are from a certified exercise image. Use these technical insights to inform your explanation, but translate them appropriately for the user's fitness level:`
    );
    input.biomechanicalPoints.forEach((point, index) => {
      parts.push(`${index + 1}. ${point}`);
    });
  } else {
    parts.push(
      `\n## NOTE: No biomechanical analysis available for this exercise.`
    );
  }

  parts.push(`\n## REQUIRED OUTPUT FORMAT`);
  parts.push(
    `Generate three distinct sections that will be combined into detailedInstructions:`
  );
  parts.push(
    `1. Exercise Guide: Step-by-step instructions for performing the exercise`
  );
  parts.push(
    `2. Anatomy Breakdown: Which muscles are working (primary vs secondary) and biomechanical insights`
  );
  parts.push(
    `3. The Why: Why this exercise is beneficial for the user's goals and fitness level`
  );
  parts.push(
    `\nThen combine all three sections into a formatted detailedInstructions field that can be displayed to the user.`
  );

  parts.push(
    `\nRemember: Tailor your language, depth, and focus areas to the ${input.userLevel} fitness level as specified in the system prompt.`
  );

  return parts.join("\n");
}

// ============================================
// Main Flow
// ============================================

/**
 * Coach Explain flow: Generates personalized exercise explanations
 * based on biomechanical analysis and user fitness level.
 *
 * @param input - Exercise name, biomechanical points, and user level
 * @returns Personalized exercise breakdown with Exercise Guide, Anatomy Breakdown, and The Why
 */
export async function coachExplainFlow(
  input: CoachExplainRequestInput,
  promptOverrides?: CoachExplainPromptOverrides
): Promise<CoachExplainOutput> {
  const systemPrompt =
    promptOverrides?.systemPrompt ?? buildSystemPrompt(input.userLevel);
  const userPrompt = buildUserPrompt(input);

  const response = await withGenAISpan(
    {
      operationName: "request",
      model: DEFAULT_MODEL,
      temperature: 0.7,
      flowName: "coach-explain",
    },
    async ({ setUsage }) => {
      const res = await ai.generate({
        model: DEFAULT_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        output: {
          schema: CoachExplainOutputSchema,
          format: "json",
        },
        config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        },
      });
      const out = res.output as CoachExplainOutput | undefined;
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

  const output = response.output as CoachExplainOutput;

  // Ensure detailedInstructions is formatted nicely
  if (
    !output.detailedInstructions ||
    output.detailedInstructions.trim() === ""
  ) {
    // Format the three sections into a combined string
    output.detailedInstructions = [
      "## Exercise Guide",
      output.exerciseGuide,
      "",
      "## Anatomy Breakdown",
      output.anatomyBreakdown,
      "",
      "## The Why",
      output.theWhy,
    ].join("\n");
  }

  return output;
}

/**
 * Estimates token usage for Coach Explain generation.
 * Uses the same estimation logic as other AI flows.
 *
 * @param input - The input prompt content (system + user prompt)
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
 * Estimates cost in USD based on token usage for Coach Explain.
 * Uses the same pricing model as other AI flows (Gemini 2.0 Flash).
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

  // If tokens object with separate input/output is provided, use accurate pricing
  if (
    typeof tokens === "object" &&
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

  // Fallback: use blended price for total tokens (legacy format)
  const totalTokens = typeof tokens === "number" ? tokens : tokens.totalTokens;
  const blendedPricePerM =
    parseFloat(
      process.env.GENKIT_BLENDED_TOKEN_PRICE_PER_M ||
        process.env.GENKIT_TOKEN_PRICE_PER_M ||
        "0.1875"
    ) || 0.1875; // Default: (0.075 + 0.30) / 2

  return (totalTokens / 1_000_000) * blendedPricePerM;
}
