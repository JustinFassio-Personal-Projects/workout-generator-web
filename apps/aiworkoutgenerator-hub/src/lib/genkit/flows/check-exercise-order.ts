import { z } from "genkit";
import { ai, DEFAULT_MODEL } from "@/lib/genkit";
import { withGenAISpan } from "@/lib/sentry";
import { estimateTokenUsage } from "@/lib/genkit/flows/edit-exercise";

// ============================================
// Input Schema
// ============================================

const SectionExerciseSummarySchema = z.object({
  name: z.string(),
  muscleTarget: z.string(),
  muscle_groups: z.array(z.string()).optional(),
  equipment_needed: z.array(z.string()).optional(),
});

export const CheckExerciseOrderInputSchema = z.object({
  sectionExercises: z.array(SectionExerciseSummarySchema).min(1),
  targetIndex: z.number().min(0),
  sectionType: z.string(),
});

export type CheckExerciseOrderInput = z.infer<
  typeof CheckExerciseOrderInputSchema
>;

// ============================================
// Output Schema
// ============================================

const OrderIssueSchema = z.object({
  type: z.enum([
    "injury_risk",
    "movement_conflict",
    "muscle_fatigue",
    "recovery_needed",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string(),
  affectedExercises: z.array(z.string()),
  recommendation: z.string().optional(),
});

export const CheckExerciseOrderOutputSchema = z.object({
  isSafe: z
    .boolean()
    .describe("True if exercise order is safe, false if risks exist"),
  riskLevel: z
    .enum(["low", "medium", "high"])
    .describe("Overall risk level for the current order"),
  issues: z
    .array(OrderIssueSchema)
    .describe(
      "List of order-related issues (injury risk, movement conflict, etc.)"
    ),
  suggestedPosition: z
    .number()
    .min(0)
    .optional()
    .describe(
      "Zero-based index where the target exercise should be moved, if unsafe"
    ),
  explanation: z
    .string()
    .describe(
      "Overall analysis in 2-4 sentences: whether order is safe and any recommendations"
    ),
});

export type CheckExerciseOrderOutput = z.infer<
  typeof CheckExerciseOrderOutputSchema
>;

// ============================================
// Prompts
// ============================================

function buildSystemPrompt(): string {
  return `You are an expert Personal Trainer and exercise scientist. Your task is to assess whether an exercise is safely positioned within a section of a workout.

SAFETY PRINCIPLES:
- Explosive or high-impact exercises (jumps, sprints, plyometrics) before heavy strength work can increase injury risk (e.g. hamstring pulls if fatigued).
- Same muscle group done back-to-back without rest can cause excessive fatigue and reduce performance.
- Opposing movement patterns (e.g. push then pull) are generally fine; similar patterns back-to-back may need recovery.
- Warmup and cooldown sections have different rules than main workout; order matters less there.
- Consider: fatigue accumulation, muscle recovery, movement pattern sequencing, and injury risk (e.g. explosive before sprint).

ISSUE TYPES:
- injury_risk: Order could increase injury likelihood (e.g. jumps then sprints, heavy compounds without prep).
- movement_conflict: Adjacent exercises conflict (e.g. same pattern without rest, incompatible sequencing).
- muscle_fatigue: Same muscle group or related muscles without adequate recovery between exercises.
- recovery_needed: Exercise would benefit from being spaced further from another.

OUTPUT:
- Return valid JSON only. No markdown, no code fences.
- Set isSafe to false if any meaningful risk exists; true only when order is clearly safe.
- Include suggestedPosition (0-based index) only when the exercise should be moved; omit if order is fine or only minor tweaks.
- Keep explanation concise (2-4 sentences).`;
}

function buildUserPrompt(input: CheckExerciseOrderInput): string {
  const { sectionExercises, targetIndex, sectionType } = input;
  const target = sectionExercises[targetIndex];
  if (!target) throw new Error("Invalid target index");

  const lines: string[] = [];
  lines.push(`Section: ${sectionType}`);
  lines.push(`Exercise to check (at index ${targetIndex}): ${target.name}`);
  lines.push(`Muscle target: ${target.muscleTarget}`);
  if (target.muscle_groups?.length) {
    lines.push(`Muscle groups: ${target.muscle_groups.join(", ")}`);
  }
  if (target.equipment_needed?.length) {
    lines.push(`Equipment: ${target.equipment_needed.join(", ")}`);
  }

  lines.push("\nFull section order:");
  sectionExercises.forEach((ex, i) => {
    const marker = i === targetIndex ? " <-- TARGET" : "";
    lines.push(`${i}. ${ex.name} (${ex.muscleTarget})${marker}`);
  });

  lines.push(
    "\nAssess whether the target exercise is safely positioned. Consider fatigue, injury risk, movement patterns, and recovery. Return JSON only."
  );
  return lines.join("\n");
}

// ============================================
// Flow
// ============================================

/**
 * Analyzes exercise order within a section for safety (e.g. injury risk, fatigue, sequencing).
 */
export async function checkExerciseOrderFlow(
  input: CheckExerciseOrderInput
): Promise<CheckExerciseOrderOutput> {
  const validated = CheckExerciseOrderInputSchema.parse(input);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(validated);

  const result = await withGenAISpan(
    {
      operationName: "request",
      model: DEFAULT_MODEL,
      temperature: 0.3,
      maxTokens: 2048,
      flowName: "check-exercise-order",
    },
    async ({ setUsage }) => {
      const res = await ai.generate({
        model: DEFAULT_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        output: {
          schema: CheckExerciseOrderOutputSchema,
          format: "json",
        },
        config: {
          temperature: 0.3,
          maxOutputTokens: 2048,
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
    throw new Error("AI exercise order check returned empty output");
  }

  return output;
}
