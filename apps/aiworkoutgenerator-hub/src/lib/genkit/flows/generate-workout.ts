import { z } from "genkit";
import { ai, DEFAULT_MODEL, AVAILABLE_MODELS } from "@/lib/genkit";
import { logger } from "@/lib/logger";
import { withGenAISpan } from "@/lib/sentry";
import type {
  TrainerWorkoutSection,
  TrainerWorkoutExercise,
  TrainerSetDetail,
  PersonalizationItem,
  WorkoutSectionType,
} from "@/types/firestore";

// ============================================
// Input/Output Schemas
// ============================================

/**
 * Input schema for workout generation.
 * Includes user preferences, profile data, daily state, and trainer context.
 */
export const GenerateWorkoutInputSchema = z.object({
  // Required workout parameters
  focus: z.enum(["strength", "cardio", "hiit", "flexibility", "yoga"]),
  duration_minutes: z.number().min(10).max(120),

  // Profile data (from user_profiles)
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  equipment_access: z.array(z.string()).default([]), // Changed from enum to string[] categories
  available_equipment: z.array(z.string()).default([]),
  injuries: z.array(z.string()).default([]),
  fitness_goals: z.array(z.string()).default([]),
  gender: z
    .enum(["male", "female", "non_binary", "prefer_not_to_say"])
    .optional(),

  // Daily state (from user_daily_state, optional)
  energy_level: z.number().min(1).max(10).optional(),
  sleep_quality: z.number().min(1).max(10).optional(),
  stress_level: z.number().min(1).max(10).optional(),
  soreness_areas: z
    .array(
      z.object({
        area: z.string(),
        level: z.number().min(1).max(10),
      })
    )
    .optional(),

  // Muscle group focus (workout target distribution, optional)
  muscle_group_focus: z
    .array(
      z.object({
        area: z.string(),
        percentage: z.number().min(0).max(100),
        locked: z.boolean(),
      })
    )
    .optional(),

  // User notes (optional)
  user_notes: z.string().optional(),

  // Trainer context (optional - for persona-driven generation)
  trainer_name: z.string().optional(),
  trainer_nickname: z.string().optional(),
  trainer_philosophy: z.string().optional(),
  trainer_personality: z.string().optional(),
  trainer_focuses: z.array(z.string()).optional(),
  specific_focus: z.string().nullable().optional(), // The actual selected focus or null for blend

  // Model selection (optional - defaults to DEFAULT_MODEL)
  model: z.string().optional(), // Optional: Gemini model identifier

  // Iteration context (optional - for iterate mode)
  iteration_context: z
    .object({
      previous_workout: z.object({
        title: z.string(),
        focus: z.string().nullable(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]),
        trainer_name: z.string().nullable(),
        sections: z.array(
          z.object({
            type: z.enum(["Warmup", "Main Workout", "Cooldown", "Finisher"]),
            durationEstimate: z.string().optional(),
            exercises: z.array(
              z.object({
                name: z.string(),
                muscleTarget: z.string(),
                tempo: z.string().nullable(),
                setsPlanned: z.number(),
                setsCompleted: z.number(),
                averageRestSeconds: z.number().nullable(),
                cues: z.array(z.string()),
                setDetails: z.array(
                  z.object({
                    reps: z.string(),
                    weight: z.string(),
                    duration: z.string().optional(),
                    rest: z.string(),
                    notes: z.string().optional(),
                    actualWeight: z.string().optional(),
                    completed: z.boolean().optional(),
                  })
                ),
              })
            ),
          })
        ),
        session_rpe: z.number().nullable(),
        weight_selection: z
          .enum(["too_light", "perfect", "too_heavy"])
          .nullable(),
        completion_percentage: z.number().nullable(),
        session_feedback: z.array(z.string()),
      }),
      overload_protocol: z.enum([
        "linear_load",
        "double_progression",
        "density_leverage",
      ]),
    })
    .optional(),
});

export type GenerateWorkoutInput = z.infer<typeof GenerateWorkoutInputSchema>;

export interface GenerateWorkoutPromptOverrides {
  systemPrompt?: string | null;
}

// ============================================
// Enhanced Output Schemas (matching reference app)
// ============================================

/**
 * Set detail schema for individual set tracking.
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
 * Enhanced exercise schema with technique details and set tracking.
 */
const ExerciseSchema = z.object({
  name: z.string().describe("Exercise name, e.g., 'Goblet Squat'"),
  sets: z.number().min(1).max(10).describe("Number of sets"),
  muscleTarget: z
    .string()
    .describe("Primary muscle target, e.g., 'Quadriceps', 'Chest'"),
  tempo: z
    .string()
    .nullable()
    .describe("Tempo pattern e.g., '3-0-1-0' or null if not applicable"),
  cues: z.array(z.string()).describe("2-4 technique cues for proper form"),
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
 * Workout section schema grouping exercises by phase.
 */
const SectionSchema = z.object({
  type: z
    .enum(["Warmup", "Main Workout", "Cooldown", "Finisher"])
    .describe("Section type"),
  durationEstimate: z
    .string()
    .describe("Estimated duration, e.g., '5 mins', '20 mins'"),
  exercises: z
    .array(ExerciseSchema)
    .min(1)
    .describe(
      "Exercises in this section. Warmup sections should include 5–8 exercises covering main focus muscle groups (including lower back) with progressive intensity."
    ),
});

/**
 * Personalization schema explaining workout adaptations.
 */
const PersonalizationSchema = z.object({
  attribute: z
    .string()
    .describe(
      "User attribute, e.g., 'Low Energy (4/10)', 'Knee Injury', 'Goal: Hypertrophy'"
    ),
  adjustment: z
    .string()
    .describe(
      "How workout was adapted, e.g., 'Reduced volume by 20%', 'Avoided squats'"
    ),
});

/**
 * Enhanced output schema for workout generation.
 * Matches the reference Fitcopilot Trainer app structure.
 */
export const GenerateWorkoutOutputSchema = z.object({
  title: z.string().describe("Catchy, motivating workout title"),
  description: z
    .string()
    .describe("Brief 1-2 sentence overview of what to expect"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("Workout difficulty level"),
  trainerNotes: z
    .string()
    .describe(
      "Motivational quote or specific advice based on user state (energy, sleep, goals) - written in the trainer's voice"
    ),
  totalDuration: z
    .number()
    .describe(
      "Total estimated duration in minutes for Main Workout + Cooldown/Finisher ONLY. Warmup is a separate safety component and MUST NOT be included in this duration."
    ),
  estimatedCalories: z.number().describe("Estimated calories burned"),
  personalization: z
    .array(PersonalizationSchema)
    .min(2)
    .max(5)
    .describe(
      "2-5 specific adaptations made based on user profile and daily state"
    ),
  sections: z
    .array(SectionSchema)
    .min(2)
    .max(4)
    .describe(
      "Workout sections: typically Warmup, Main Workout, and Cooldown/Finisher"
    ),
});

export type GenerateWorkoutOutput = z.infer<typeof GenerateWorkoutOutputSchema>;

// ============================================
// Workout Generation Flow
// ============================================

/**
 * Generates a personalized workout using AI.
 *
 * Uses Genkit's structured output mode with schema enforcement to ensure
 * consistent JSON responses matching the enhanced workout structure.
 */
export async function generateWorkoutFlow(
  input: GenerateWorkoutInput,
  promptOverrides?: GenerateWorkoutPromptOverrides
): Promise<GenerateWorkoutOutput> {
  // Validate input
  const validatedInput = GenerateWorkoutInputSchema.parse(input);

  // Build the prompt
  const systemPrompt =
    promptOverrides?.systemPrompt ?? buildSystemPrompt(validatedInput);
  const userPrompt = buildUserPrompt(validatedInput);

  console.log("=== WORKOUT GENERATION ===");
  console.log("Trainer:", validatedInput.trainer_name ?? "Default");
  console.log("Focus:", validatedInput.specific_focus ?? "Blend mode");
  console.log("System prompt:", systemPrompt.substring(0, 300) + "...");
  console.log("User prompt:", userPrompt.substring(0, 300) + "...");

  // Build model fallback list: start with user's selected model, then fallback options
  const userSelectedModel = validatedInput.model || DEFAULT_MODEL;
  const fallbackModels = AVAILABLE_MODELS.map((m) => m.value);

  // Create ordered list: user's model first, then others (excluding the user's model)
  const modelsToTry = [
    userSelectedModel,
    ...fallbackModels.filter((m) => m !== userSelectedModel),
  ];

  const apiCallStartTime = Date.now();
  const estimatedInputTokens = Math.ceil(
    (systemPrompt.length + userPrompt.length) / 4
  );
  logger.debug("Before ai.generate", {
    location: "generate-workout.ts",
    userSelectedModel,
    modelsToTryCount: modelsToTry.length,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
    estimatedInputTokens,
    apiKeyConfigured: !!process.env.GOOGLE_AI_API_KEY,
  });

  // Retry logic: try each model with retries for rate limit errors
  // Increased delays to better handle RPM/TPM rate limits in production
  const maxRetriesPerModel = 3;
  // Use environment variable for initial delay, default to 5 seconds (increased from 2s)
  const initialDelayMs = process.env.GENKIT_RATE_LIMIT_RETRY_DELAY_MS
    ? parseInt(process.env.GENKIT_RATE_LIMIT_RETRY_DELAY_MS, 10)
    : 5000; // Start with 5 seconds for rate limits (was 2000ms)
  let lastError: unknown;
  let result;
  let successfulModel: string | null = null;

  // Try each model in the fallback list (each attempt wrapped for Sentry AI Insights)
  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        result = await withGenAISpan(
          {
            operationName: "request",
            model: currentModel,
            temperature: 0.7,
            maxTokens: 8192,
            flowName: "generate-workout",
          },
          async ({ setUsage }) => {
            const res = await ai.generate({
              model: currentModel,
              system: systemPrompt,
              prompt: userPrompt,
              output: {
                schema: GenerateWorkoutOutputSchema,
                format: "json",
              },
              config: {
                temperature: 0.7,
                maxOutputTokens: 8192, // Increased for richer output
              },
            });
            if (res.output) {
              const inputLen = systemPrompt.length + userPrompt.length;
              const outputStr = JSON.stringify(res.output);
              setUsage({
                inputTokens: Math.ceil(inputLen / 4),
                outputTokens: Math.ceil(outputStr.length / 4),
                totalTokens: Math.ceil((inputLen + outputStr.length) / 4),
              });
            }
            return res;
          }
        );
        // Success - break out of both loops
        successfulModel = currentModel;
        break;
      } catch (apiError) {
        lastError = apiError;

        // Check if this is a rate limit error (429) - retry same model
        const isRateLimitError =
          (apiError &&
            typeof apiError === "object" &&
            "status" in apiError &&
            (apiError as { status?: number }).status === 429) ||
          (apiError &&
            typeof apiError === "object" &&
            "statusCode" in apiError &&
            (apiError as { statusCode?: number }).statusCode === 429) ||
          (apiError instanceof Error &&
            (apiError.message.includes("429") ||
              apiError.message.includes("rate limit") ||
              apiError.message.includes("Resource exhausted") ||
              apiError.message.includes("Too Many Requests")));

        // Check if this is a model-specific error (not retryable on same model)
        const isModelError =
          (apiError instanceof Error &&
            apiError.message.includes("model") &&
            (apiError.message.includes("not found") ||
              apiError.message.includes("unavailable") ||
              apiError.message.includes("invalid") ||
              apiError.message.includes("404"))) ||
          (apiError &&
            typeof apiError === "object" &&
            "status" in apiError &&
            (apiError as { status?: number }).status === 404);

        // If it's a model-specific error, skip retries and try next model
        if (isModelError) {
          const apiErrorMessage =
            apiError instanceof Error ? apiError.message : String(apiError);
          logger.debug("Model-specific error, trying next model", {
            location: "generate-workout.ts",
            failedModel: currentModel,
            apiErrorMessage: apiErrorMessage.substring(0, 200),
            remainingModels:
              modelsToTry.length - modelsToTry.indexOf(currentModel) - 1,
          });
          break; // Break out of retry loop, try next model
        }

        // If it's a rate limit and we haven't exhausted retries, retry same model
        if (isRateLimitError && attempt < maxRetriesPerModel) {
          // Calculate exponential backoff delay with jitter
          // Delays: attempt 0: ~5s, attempt 1: ~10s, attempt 2: ~20s
          const delay = initialDelayMs * Math.pow(2, attempt);
          const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
          const totalDelay = Math.round(delay + jitter);
          // Cap max delay at 60 seconds to avoid excessive waits
          const cappedDelay = Math.min(totalDelay, 60000);

          const apiErrorMessage =
            apiError instanceof Error ? apiError.message : String(apiError);
          logger.debug("Rate limit error, retrying same model", {
            location: "generate-workout.ts",
            model: currentModel,
            attempt: attempt + 1,
            maxRetries: maxRetriesPerModel + 1,
            retryDelayMs: cappedDelay,
            apiErrorMessage: apiErrorMessage.substring(0, 100),
          });

          // Wait before retrying with capped delay
          await new Promise((resolve) => setTimeout(resolve, cappedDelay));
          continue; // Retry same model
        }

        // If we've exhausted retries for rate limits, or it's a non-retryable error, try next model
        if (attempt >= maxRetriesPerModel || !isRateLimitError) {
          const apiErrorDuration = Date.now() - apiCallStartTime;
          const apiErrorMessage =
            apiError instanceof Error ? apiError.message : String(apiError);
          logger.debug("Model failed, trying next model", {
            location: "generate-workout.ts",
            failedModel: currentModel,
            apiErrorDurationMs: apiErrorDuration,
            apiErrorType: apiError?.constructor?.name,
            apiErrorMessage: apiErrorMessage.substring(0, 200),
            attempt,
            isRateLimitError,
            remainingModels:
              modelsToTry.length - modelsToTry.indexOf(currentModel) - 1,
          });
          break; // Break out of retry loop, try next model
        }
      }
    }

    // If we got a result, break out of model loop
    if (result) {
      break;
    }
  }

  // If we get here without a result, throw the last error with context
  if (!result) {
    logger.debug("All models exhausted", {
      location: "generate-workout.ts",
      userSelectedModel,
      modelsTried: modelsToTry.length,
      totalAttempts: modelsToTry.length * (maxRetriesPerModel + 1),
    });

    // Enhance error message with fallback context
    if (lastError instanceof Error) {
      interface EnhancedError extends Error {
        originalError: Error;
        modelsTried: string[];
      }
      const enhancedError = new Error(
        `Failed to generate workout after trying ${modelsToTry.length} model(s). Last error: ${lastError.message}`
      ) as EnhancedError;
      enhancedError.originalError = lastError;
      enhancedError.modelsTried = modelsToTry;
      throw enhancedError;
    }
    throw lastError;
  }

  const apiCallDuration = Date.now() - apiCallStartTime;
  logger.debug("After ai.generate success", {
    location: "generate-workout.ts",
    model: successfulModel,
    userSelectedModel,
    usedFallback: successfulModel !== userSelectedModel,
    apiCallDurationMs: apiCallDuration,
    hasOutput: !!result.output,
  });

  // Get the structured output
  const output = result.output;

  if (!output) {
    console.error("AI returned null output");
    throw new Error("AI generation returned empty output");
  }

  console.log("Generated workout:", output.title);
  console.log("Section count:", output.sections?.length ?? 0);
  const totalExercises =
    output.sections?.reduce((sum, s) => sum + s.exercises.length, 0) ?? 0;
  console.log("Total exercises:", totalExercises);

  // Validate sections exist
  if (!output.sections || !Array.isArray(output.sections)) {
    console.error("Invalid sections structure:", output);
    throw new Error("AI generation returned invalid sections structure");
  }

  if (output.sections.length === 0) {
    console.error("Empty sections array:", output);
    throw new Error("AI generation returned no sections");
  }

  return output;
}

/**
 * Recursively removes undefined values from a value to make it Firestore-compatible.
 * Firestore doesn't accept undefined values anywhere in nested data.
 */
function removeUndefined<T>(value: T): T {
  // Handle arrays by recursively cleaning each element
  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined);
    return cleanedArray as unknown as T;
  }
  // Handle non-null objects by recursively cleaning each property
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (entryValue === undefined) {
        continue;
      }
      const cleaned = removeUndefined(entryValue);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result as unknown as T;
  }
  // Primitive (or null) values are returned as-is
  return value;
}

/**
 * Transforms the AI output to match Firestore types exactly.
 * Ensures all optional fields are properly handled (no undefined values).
 */
export function transformToFirestoreFormat(output: GenerateWorkoutOutput): {
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  trainerNotes: string;
  totalDuration: number;
  estimatedCalories: number;
  personalization: PersonalizationItem[];
  sections: TrainerWorkoutSection[];
} {
  const sections: TrainerWorkoutSection[] = output.sections.map((section) => ({
    type: section.type as WorkoutSectionType,
    durationEstimate: section.durationEstimate,
    exercises: section.exercises.map(
      (exercise): TrainerWorkoutExercise => ({
        name: exercise.name,
        sets: exercise.sets,
        muscleTarget: exercise.muscleTarget,
        tempo: exercise.tempo ?? null,
        cues: exercise.cues ?? [],
        detailedInstructions: exercise.detailedInstructions ?? null,
        setDetails: exercise.setDetails.map(
          (set): TrainerSetDetail =>
            removeUndefined({
              reps: set.reps,
              weight: set.weight,
              duration: set.duration,
              rest: set.rest,
              notes: set.notes,
            })
        ),
        equipment_needed: exercise.equipment_needed ?? [],
        muscle_groups: exercise.muscle_groups ?? [],
      })
    ),
  }));

  const personalization: PersonalizationItem[] = output.personalization.map(
    (p) => ({
      attribute: p.attribute,
      adjustment: p.adjustment,
    })
  );

  return {
    title: output.title,
    description: output.description,
    difficulty: output.difficulty,
    trainerNotes: output.trainerNotes,
    totalDuration: output.totalDuration,
    estimatedCalories: output.estimatedCalories,
    personalization,
    sections,
  };
}

// ============================================
// Prompt Building
// ============================================

/**
 * Builds the system prompt that defines the AI's role and constraints.
 * Now supports trainer personas for personified workout generation.
 * Also supports iteration mode with overload protocols.
 */
function buildSystemPrompt(input: GenerateWorkoutInput): string {
  const injuryWarning =
    input.injuries.length > 0
      ? `\n\nCRITICAL SAFETY: User has injuries in these areas - ${input.injuries.join(", ")}. DO NOT include any exercises that stress these areas. Include this in personalization.`
      : "";

  const goalsContext =
    input.fitness_goals.length > 0
      ? `\nUser goals: ${input.fitness_goals.join(", ")}`
      : "";

  // Check if this is an iteration request
  if (input.iteration_context) {
    return buildIterationSystemPrompt(input, injuryWarning, goalsContext);
  }

  // Check if we have trainer context for persona-driven generation
  if (input.trainer_name && input.trainer_philosophy) {
    return buildTrainerPersonaPrompt(input, injuryWarning, goalsContext);
  }

  // Fallback to default prompt without trainer persona
  return `You are an expert Personal Trainer specialized in ${input.focus} training.
Your goal is to generate a highly specific, safe, and effective workout plan based on the user's profile and daily bio-feedback.

TONE AND STYLE:
- Be encouraging and motivational in your trainer notes
- If sleep or energy is low, adjust intensity accordingly and acknowledge this
- If injuries are present, strictly avoid aggravating exercises and suggest alternatives
- Be precise with exercise prescriptions (sets, reps, rest, tempo)

PERSONALIZATION:
- You MUST explain 2-5 specific choices you made based on the user's data
- Populate the 'personalization' array with these insights
- Link specific attributes (e.g., "Low Energy 4/10", "Knee Injury") to concrete adjustments

WORKOUT STRUCTURE:

WARMUP SECTION (CRITICAL SAFETY COMPONENT):
- The warmup is a SAFETY-CRITICAL component and is NOT part of the workout duration
- Warmup duration does NOT count toward the requested workout time
- MUST include 5-8 exercises with sufficient variety
- MUST target ALL focus muscle groups from the main workout exercises
- MUST always include lower back warmup exercises (e.g., cat-cow, hip circles, gentle twists)
- Should progress from general movement → dynamic stretching → muscle activation → movement prep
- Include: light cardio (2-3 min), dynamic stretching (2-3 min), muscle activation for focus groups (3-4 min), lower back prep (1-2 min), light versions of main movements (1-2 min)
- Total warmup duration should be 8-12 minutes (independent of workout duration)
- Make warmup specific to the workout's movements and muscle groups
- Use variety - avoid repeating the same warmup exercises across workouts

MAIN WORKOUT:
- Main Workout section should be the bulk of the requested duration
- Include either a Cooldown (stretching) or Finisher (intense ending) based on energy level
- Each exercise needs detailed technique cues (2-4 bullet points)
- Each exercise should have detailed instructions for proper form

DURATION CALCULATION:
- The totalDuration field represents Main Workout + Cooldown/Finisher time ONLY
- Warmup is a separate safety component and MUST NOT be included in totalDuration

SET DETAILS:
- Each exercise's setDetails array must match the sets count
- Use appropriate intensity markers: RPE 6-8, Light/Moderate/Heavy, % of max
- Include rest periods appropriate for the exercise type

OUTPUT FORMAT:
- Return valid JSON conforming to the provided schema
- No markdown formatting outside the JSON structure${injuryWarning}${goalsContext}`;
}

/**
 * Builds a persona-driven system prompt for trainer-first generation.
 */
function buildTrainerPersonaPrompt(
  input: GenerateWorkoutInput,
  injuryWarning: string,
  goalsContext: string
): string {
  const trainerName = input.trainer_name!;
  const trainerNickname = input.trainer_nickname ?? "";
  const trainerPhilosophy = input.trainer_philosophy!;
  const trainerPersonality = input.trainer_personality ?? "";
  const trainerFocuses = input.trainer_focuses ?? [];
  const specificFocus = input.specific_focus;

  // Determine focus context
  const focusContext = specificFocus
    ? `Today's workout focus: ${specificFocus}`
    : `Blend your expertise across all your specialties: ${trainerFocuses.join(", ")}`;

  return `You are ${trainerName}, known as "${trainerNickname}".

YOUR COACHING PHILOSOPHY:
"${trainerPhilosophy}"

YOUR PERSONALITY:
${trainerPersonality}

YOUR SPECIALTIES:
${trainerFocuses.map((f, i) => `${i + 1}. ${f}`).join("\n")}

${focusContext}

---

CRITICAL INSTRUCTIONS:

1. VOICE & TONE:
   - Write the trainerNotes field IN YOUR VOICE - motivational, personal, aligned with your philosophy
   - The workout title should reflect your personality and the session's focus
   - Be encouraging but authentic to your coaching style

2. EXERCISE SELECTION:
   - Choose exercises that align with your specialty and training philosophy
   - ${specificFocus ? `Focus primarily on ${specificFocus} exercises` : "Create a balanced workout drawing from all your areas of expertise"}
   - If you're a strength specialist, favor compound movements
   - If you're a yoga/flexibility specialist, emphasize mobility and breathwork
   - If you're a HIIT/cardio specialist, design high-intensity intervals

3. PERSONALIZATION:
   - You MUST explain 2-5 specific choices you made based on the user's data
   - Include your philosophy in at least one personalization insight
   - Link specific attributes (e.g., "Low Energy 4/10") to concrete adjustments

4. WORKOUT STRUCTURE:

   WARMUP SECTION (CRITICAL SAFETY COMPONENT):
   - The warmup is a SAFETY-CRITICAL component and is NOT part of the workout duration
   - Warmup duration does NOT count toward the requested workout time
   - MUST include 5-8 exercises with sufficient variety
   - MUST target ALL focus muscle groups from the main workout exercises
   - MUST always include lower back warmup exercises (e.g., cat-cow, hip circles, gentle twists)
   - Should progress from general movement → dynamic stretching → muscle activation → movement prep
   - Include: light cardio (2-3 min), dynamic stretching (2-3 min), muscle activation for focus groups (3-4 min), lower back prep (1-2 min), light versions of main movements (1-2 min)
   - Total warmup duration should be 8-12 minutes (independent of workout duration)
   - Make warmup specific to the workout's movements and muscle groups
   - Use variety - avoid repeating the same warmup exercises across workouts

   MAIN WORKOUT:
   - Main Workout should be the bulk of the requested duration and showcase your specialty
   - Include either a Cooldown (stretching) or Finisher (intense ending) based on energy level
   - Each exercise needs detailed technique cues (2-4 bullet points)

   DURATION CALCULATION:
   - The totalDuration field represents Main Workout + Cooldown/Finisher time ONLY
   - Warmup is a separate safety component and MUST NOT be included in totalDuration

5. SET DETAILS:
   - Each exercise's setDetails array must match the sets count
   - Use intensity markers appropriate to your training style
   - Include rest periods appropriate for the exercise type

6. SAFETY:
   - If injuries are present, strictly avoid aggravating exercises
   - Suggest alternatives that still align with your specialty${injuryWarning}${goalsContext}

OUTPUT FORMAT:
- Return valid JSON conforming to the provided schema
- No markdown formatting outside the JSON structure`;
}

/**
 * Builds a system prompt for workout iteration mode.
 * This mode generates a progressive follow-up workout based on a previous session.
 */
function buildIterationSystemPrompt(
  input: GenerateWorkoutInput,
  injuryWarning: string,
  goalsContext: string
): string {
  const iterCtx = input.iteration_context!;
  const protocol = iterCtx.overload_protocol;
  const prevWorkout = iterCtx.previous_workout;

  // Get protocol-specific instructions
  let protocolInstructions: string;
  let protocolName: string;

  switch (protocol) {
    case "linear_load":
      protocolName = "Linear Load Progression";
      protocolInstructions = `
PROTOCOL: LINEAR LOAD PROGRESSION
- Primary Goal: Increase weight/resistance while keeping reps static
- Logic: Add 2-5% load compared to the previous workout
- Keep the same rep scheme as the previous workout
- Maintain exercise selection unless user feedback indicates issues
- Focus on progressive overload through resistance increases
- If previous weight was "too_light", increase by 5-10%
- If previous weight was "perfect", increase by 2-5%
- If previous weight was "too_heavy", keep same weight or slightly reduce`;
      break;

    case "double_progression":
      protocolName = "Double Progression";
      protocolInstructions = `
PROTOCOL: DOUBLE PROGRESSION
- Primary Goal: First add reps, then increase weight when rep target is maxed
- Logic: Work within a rep range (e.g., 8-12). If client hit top of range, increase load and reset to bottom
- Track where they are in the rep progression
- If previous weight was "too_light", increase reps OR jump to next weight bracket
- If previous weight was "perfect" and completed all reps, add 1-2 reps or increase weight
- If previous weight was "too_heavy", stay at same weight, aim for more quality reps
- Focus on time under tension and muscle development`;
      break;

    case "density_leverage":
      protocolName = "Density & Leverage Progression";
      protocolInstructions = `
PROTOCOL: DENSITY & LEVERAGE PROGRESSION  
- Primary Goal: Increase workout density OR progress to harder exercise variations
- Logic: Either reduce rest periods OR substitute exercises with more challenging versions
- Options for progression:
  1. Reduce rest periods by 5-15 seconds between sets
  2. Swap exercises for harder variations (e.g., Push-up → Diamond Push-up → Archer Push-up)
  3. Add tempo variations (slower eccentric, pauses)
  4. Increase total volume (more sets/reps) if rest is already minimal
- Best for bodyweight/calisthenics progressions
- If completion was low (<80%), maintain difficulty but reduce volume
- If completion was high (>90%), progress to harder variations`;
      break;
  }

  // Build autoregulation context
  const autoregContext: string[] = [];
  if (prevWorkout.session_rpe !== null) {
    autoregContext.push(`Session RPE: ${prevWorkout.session_rpe}/10`);
    if (prevWorkout.session_rpe >= 9) {
      autoregContext.push(
        "  → Very hard session - consider deload or maintain"
      );
    } else if (prevWorkout.session_rpe <= 6) {
      autoregContext.push("  → Room for progression - increase challenge");
    }
  }
  if (prevWorkout.weight_selection) {
    const wsLabels = {
      too_light: "weights were TOO LIGHT",
      perfect: "weights were PERFECT",
      too_heavy: "weights were TOO HEAVY",
    };
    autoregContext.push(
      `Weight Feedback: ${wsLabels[prevWorkout.weight_selection]}`
    );
  }
  if (prevWorkout.completion_percentage !== null) {
    autoregContext.push(
      `Completion: ${Math.round(prevWorkout.completion_percentage)}%`
    );
  }
  if (prevWorkout.session_feedback.length > 0) {
    autoregContext.push(
      `Session Issues: ${prevWorkout.session_feedback.join(", ")}`
    );
  }

  // Reuse same persona context as buildTrainerPersonaPrompt so iteration mode keeps trainer voice
  const trainerPersonaParts: string[] = [];
  if (input.trainer_name) {
    const nameLine = input.trainer_nickname?.trim()
      ? `You are ${input.trainer_name}, known as "${input.trainer_nickname}".`
      : `You are ${input.trainer_name}.`;
    trainerPersonaParts.push(nameLine);
  } else {
    trainerPersonaParts.push("You are an expert Personal Trainer.");
  }
  if (input.trainer_philosophy) {
    trainerPersonaParts.push(
      `Coaching philosophy: ${input.trainer_philosophy}.`
    );
  }
  if (input.trainer_personality) {
    trainerPersonaParts.push(`Personality: ${input.trainer_personality}.`);
  }
  if (input.trainer_focuses?.length) {
    trainerPersonaParts.push(
      `Specialties: ${input.trainer_focuses.join(", ")}.`
    );
  }
  trainerPersonaParts.push(
    "Stay in character with your coaching philosophy and personality."
  );
  const trainerContext = trainerPersonaParts.join(" ");

  return `${trainerContext}

You are generating an ITERATION workout - a progressive follow-up to a previous session.
The client has completed "${prevWorkout.title}" and wants to build on their progress.

${protocolInstructions}

---

PREVIOUS WORKOUT FEEDBACK:
${autoregContext.length > 0 ? autoregContext.join("\n") : "No specific feedback provided"}

---

ITERATION REQUIREMENTS:

1. EXERCISE CONTINUITY:
   - Maintain 60-80% of exercises from the previous workout for progressive overload tracking
   - Only swap exercises if there were issues (joint pain, couldn't complete, didn't enjoy)
   - Keep the same focus and muscle group distribution

2. INTELLIGENT PROGRESSION:
   - Apply the ${protocolName} protocol to progress exercises appropriately
   - Use autoregulation feedback to adjust intensity
   - If completion was low or RPE was very high, prioritize recovery over progression

3. PERSONALIZATION:
   - In your personalization array, explain HOW you applied the overload protocol
   - Reference specific exercises and what changed (e.g., "Increased squat weight from RPE 7 to RPE 8")
   - Acknowledge the client's previous performance

4. WARMUP:
   - Include appropriate warmup targeting the same muscle groups
   - Warmup is NOT part of the workout duration

5. TITLE:
   - Include iteration context in title (e.g., "Progression: [Focus] Day 2" or "[Focus] - Building Strength")
${injuryWarning}${goalsContext}

OUTPUT FORMAT:
- Return valid JSON conforming to the provided schema
- No markdown formatting outside the JSON structure`;
}

/**
 * Builds the user prompt with workout parameters and context.
 */
function buildUserPrompt(input: GenerateWorkoutInput): string {
  const parts: string[] = [];

  // Main request with trainer context if available
  if (input.trainer_name) {
    parts.push(
      `${input.trainer_name}, please create a ${input.duration_minutes}-minute workout for a ${input.difficulty} level client.`
    );
    if (input.specific_focus) {
      parts.push(
        `\nThe client has requested a focus on: ${input.specific_focus}`
      );
    } else {
      parts.push(
        `\nThe client wants you to blend your expertise - create a well-rounded session.`
      );
    }
  } else {
    parts.push(
      `Generate a ${input.duration_minutes}-minute ${input.focus} workout for ${input.difficulty} level.`
    );
  }

  // CRITICAL: Warmup is separate from workout duration
  parts.push(
    `\n⚠️ IMPORTANT: The ${input.duration_minutes}-minute duration refers to Main Workout + Cooldown/Finisher ONLY. Warmup is a separate safety component (8-12 minutes) and does NOT count toward the requested workout time.`
  );

  // Equipment
  if (input.available_equipment.length > 0) {
    parts.push(
      `\nEQUIPMENT AVAILABLE:\n${input.available_equipment.join(", ")}`
    );
  } else if (
    Array.isArray(input.equipment_access) &&
    input.equipment_access.length > 0
  ) {
    parts.push(`\nEQUIPMENT CATEGORIES: ${input.equipment_access.join(", ")}`);
  } else {
    parts.push(`\nEQUIPMENT: Bodyweight only (no categories selected)`);
  }

  // Daily state context
  parts.push(`\nDAILY CONTEXT (Use this to adapt today's workout):`);

  if (input.energy_level !== undefined) {
    parts.push(`- Energy Level: ${input.energy_level}/10`);
    if (input.energy_level <= 4) {
      parts.push(
        "  → LOW ENERGY: Reduce intensity, prioritize movement quality over volume"
      );
    } else if (input.energy_level >= 8) {
      parts.push("  → HIGH ENERGY: Can push harder, add intensity techniques");
    }
  } else {
    parts.push("- Energy Level: Not provided (assume moderate 6/10)");
  }

  if (input.sleep_quality !== undefined) {
    parts.push(`- Sleep Quality: ${input.sleep_quality}/10`);
    if (input.sleep_quality <= 4) {
      parts.push(
        "  → POOR SLEEP: Reduce training volume, avoid CNS-intensive exercises"
      );
    }
  }

  if (input.stress_level !== undefined) {
    parts.push(`- Stress Level: ${input.stress_level}/10`);
    if (input.stress_level >= 7) {
      parts.push(
        "  → HIGH STRESS: Include breathing cues, emphasize stress-relieving benefits"
      );
    }
  }

  // Soreness (align with muscle_group_focus: if user is targeting a sore area, say reduce intensity; otherwise avoid)
  if (input.soreness_areas && input.soreness_areas.length > 0) {
    parts.push(`\nMUSCLE SORENESS:`);
    const focusAreas = new Set(
      (input.muscle_group_focus ?? []).map((g) => g.area.toLowerCase())
    );
    for (const s of input.soreness_areas) {
      const isTargeted = focusAreas.has(s.area.toLowerCase());
      const warning =
        s.level >= 7
          ? isTargeted
            ? " ← REDUCE INTENSITY (user chose to target this area)"
            : " ← AVOID THIS AREA"
          : "";
      parts.push(`- ${s.area}: ${s.level}/10${warning}`);
    }
  }

  // Muscle Group Focus (workout target distribution)
  if (input.muscle_group_focus && input.muscle_group_focus.length > 0) {
    parts.push(`\nMUSCLE GROUP FOCUS (% of workout time):`);
    for (const g of input.muscle_group_focus) {
      // Check if this muscle group is also marked as sore
      const sorenessArea = input.soreness_areas?.find(
        (s) => s.area.toLowerCase() === g.area.toLowerCase()
      );
      const sorenessNote =
        sorenessArea && sorenessArea.level >= 7
          ? ` ⚠️ (sore: ${sorenessArea.level}/10 - include but reduce intensity)`
          : "";
      parts.push(`- ${g.area}: ${g.percentage}%${sorenessNote}`);
    }
    parts.push(
      `→ Distribute exercises to match these percentages. Focus ${input.muscle_group_focus.map((g) => g.area).join(", ")} muscle groups.`
    );
  }

  // Injuries (critical)
  if (input.injuries.length > 0) {
    parts.push(`\n⚠️ INJURIES (DO NOT stress these areas):`);
    parts.push(input.injuries.join(", "));
  }

  // Goals
  if (input.fitness_goals.length > 0) {
    parts.push(`\nFITNESS GOALS: ${input.fitness_goals.join(", ")}`);
  }

  // Gender (optional - for personalized recommendations)
  if (input.gender && input.gender !== "prefer_not_to_say") {
    const genderLabels: Record<string, string> = {
      male: "Male",
      female: "Female",
      non_binary: "Non-binary",
    };
    parts.push(
      `\nCLIENT PROFILE: ${genderLabels[input.gender] || input.gender}`
    );
  }

  // User notes
  if (input.user_notes) {
    parts.push(`\nUSER NOTES: ${input.user_notes}`);
  }

  // Warmup requirements based on focus
  parts.push(`\nWARMUP REQUIREMENTS (SAFETY-CRITICAL):`);
  parts.push(
    `- Warmup is a separate safety component (8-12 minutes) and does NOT count toward the ${input.duration_minutes}-minute workout duration`
  );
  parts.push(
    `- MUST include 5-8 exercises with variety, targeting all muscle groups that will be used in the main workout`
  );
  parts.push(
    `- MUST always include lower back warmup exercises (cat-cow, hip circles, gentle twists, etc.)`
  );

  // Add focus-specific muscle groups that need warming up
  const focusMuscleGroups = getFocusMuscleGroups(
    input.focus,
    input.specific_focus
  );
  // Filter out "lower back" since it's already explicitly mentioned above
  const focusMuscleGroupsFiltered = focusMuscleGroups.filter(
    (mg) => mg.toLowerCase() !== "lower back"
  );
  if (focusMuscleGroupsFiltered.length > 0) {
    parts.push(
      `- MUST include warmup exercises targeting these muscle groups: ${focusMuscleGroupsFiltered.join(", ")}`
    );
  }

  parts.push(
    `- Progress from general movement → dynamic stretching → muscle activation → movement prep`
  );
  parts.push(
    `- Make warmup specific to this workout's movements and exercises`
  );

  // Iteration context - include previous workout exercises
  if (input.iteration_context) {
    const prevWorkout = input.iteration_context.previous_workout;
    const protocol = input.iteration_context.overload_protocol;

    parts.push(`\n${"=".repeat(50)}`);
    parts.push(`ITERATION MODE: Building on "${prevWorkout.title}"`);
    parts.push(`Protocol: ${protocol.replace("_", " ").toUpperCase()}`);
    parts.push(`${"=".repeat(50)}`);

    parts.push(
      `\nPREVIOUS WORKOUT EXERCISES (use as reference for progression):`
    );

    for (const section of prevWorkout.sections) {
      parts.push(`\n[${section.type}]`);
      for (const exercise of section.exercises) {
        const completionStatus =
          exercise.setsCompleted === exercise.setsPlanned
            ? "✓ Completed"
            : `${exercise.setsCompleted}/${exercise.setsPlanned} sets`;

        parts.push(
          `- ${exercise.name} (${exercise.muscleTarget}): ${completionStatus}`
        );

        // Include set details for progression reference
        if (exercise.setDetails.length > 0) {
          const firstSet = exercise.setDetails[0];
          const setInfo = firstSet.actualWeight
            ? `${firstSet.reps} @ ${firstSet.actualWeight}`
            : `${firstSet.reps} @ ${firstSet.weight}`;
          parts.push(`  Sets: ${setInfo}`);
        }
      }
    }

    parts.push(
      `\n→ Apply ${protocol.replace("_", " ")} progression to these exercises.`
    );
    parts.push(
      `→ Maintain exercise selection unless there were issues reported.`
    );
  }

  parts.push(
    "\nGenerate the workout now with all sections and detailed exercises."
  );

  return parts.join("\n");
}

/**
 * Returns muscle groups that should be warmed up based on workout focus.
 *
 * Always includes "lower back" for all focus types (safety requirement).
 *
 * Muscle groups returned by focus type:
 * - "strength": shoulders, core, hips + (if upper: chest, back, arms) + (if lower: quadriceps, hamstrings, glutes, calves) + (if full/none: all of the above)
 * - "cardio": legs, core, shoulders, hips
 * - "hiit": legs, core, shoulders, hips
 * - "flexibility": hips, shoulders, spine, hamstrings, hip flexors
 * - "yoga": hips, shoulders, spine, hamstrings, hip flexors
 * - default: only "lower back" (fallback for unknown focus types)
 *
 * @param focus - The workout focus type (strength, cardio, hiit, flexibility, yoga)
 * @param specificFocus - Optional specific focus (e.g., "upper body", "lower body", "full body")
 * @returns Array of muscle group names that should be warmed up
 */
function getFocusMuscleGroups(
  focus: string,
  specificFocus: string | null | undefined
): string[] {
  const groups: string[] = [];

  // Always include lower back (will be emphasized separately)
  groups.push("lower back");

  // Add groups based on focus type
  switch (focus.toLowerCase()) {
    case "strength":
      groups.push("shoulders", "core", "hips");
      if (specificFocus?.toLowerCase().includes("upper")) {
        groups.push("chest", "back", "arms");
      }
      if (specificFocus?.toLowerCase().includes("lower")) {
        groups.push("quadriceps", "hamstrings", "glutes", "calves");
      }
      if (specificFocus?.toLowerCase().includes("full") || !specificFocus) {
        groups.push(
          "chest",
          "back",
          "arms",
          "quadriceps",
          "hamstrings",
          "glutes"
        );
      }
      break;
    case "cardio":
    case "hiit":
      groups.push("legs", "core", "shoulders", "hips");
      break;
    case "flexibility":
    case "yoga":
      groups.push("hips", "shoulders", "spine", "hamstrings", "hip flexors");
      break;
    default:
      // For unknown focus types, intentionally fall back to the always-included
      // "lower back" warmup only. The input is validated by Zod enum, so this
      // case should rarely occur, but provides a safe fallback.
      break;
  }

  // Remove duplicates and return
  return [...new Set(groups)];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Estimates token usage for cost tracking.
 * Rough estimate based on character count.
 */
export function estimateTokenUsage(input: string, output: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil((input.length + output.length) / 4);
}

/**
 * Estimates cost in USD based on token usage.
 *
 * Uses a configurable price per 1M tokens, falling back to a default
 * approximate value when no environment override is provided.
 */
export function estimateCostUsd(tokens: number): number {
  const DEFAULT_PRICE_PER_M_TOKENS = 0.1875;

  const envPrice = process.env.GENKIT_TOKEN_PRICE_PER_M;
  const parsedPrice = envPrice ? Number(envPrice) : NaN;
  const pricePerMTokens =
    Number.isFinite(parsedPrice) && parsedPrice > 0
      ? parsedPrice
      : DEFAULT_PRICE_PER_M_TOKENS;

  return (tokens / 1_000_000) * pricePerMTokens;
}
