import { adminDb } from "@/lib/firebase-admin";
import {
  normalizeAiPrompt,
  normalizePromptInjection,
  normalizePromptSet,
} from "@/lib/prompt-normalize";
import type {
  AiPrompt,
  PromptInjection,
  PromptMetadata,
  PromptSet,
} from "@/types/firestore";
import type { Trainer } from "@/types/trainer";

export type PromptTarget =
  | "workout_generation"
  | "edit_exercise"
  | "swap_exercise"
  | "coach_explain"
  | "image_generator";

export interface PromptContext {
  trainer_name?: string;
  trainer_nickname?: string;
  trainer_philosophy?: string;
  trainer_personality?: string;
  trainer_focuses?: string[];
  focus?: string | null;
  specific_focus?: string | null;
  equipment?: string[];
  available_equipment?: string[];
  fitness_level?: string;
  user_fitness_level?: string;
  injuries?: string[];
  user_injuries?: string[];
  equipment_access?: string[]; // Changed from string to string[] categories
  workout_difficulty?: string;
  user_level?: string;
  [key: string]: string | string[] | number | boolean | null | undefined;
}

export interface ResolvedPrompt {
  prompt: string | null;
  metadata: PromptMetadata | null;
}

/**
 * Builds a normalized template context by converting all values to strings for template rendering.
 *
 * **Normalization Rules:**
 * - `null` or `undefined` → empty string `""`
 * - Arrays → comma-separated string (e.g., `["a", "b"]` → `"a, b"`)
 * - Empty arrays → empty string `""` (indistinguishable from missing values)
 * - Booleans → `"true"` or `"false"`
 * - Numbers → string representation (e.g., `123` → `"123"`)
 * - All other values → `String(value)`
 *
 * **Important Limitations:**
 * - **Type information is lost**: Arrays, booleans, and numbers all become strings
 * - **No distinction between "no value" and "empty list"**: Both `null`/`undefined` and empty arrays `[]` normalize to `""`
 * - **Empty arrays become empty strings**: This means templates cannot differentiate between:
 *   - A missing value (`null`/`undefined`) → `""`
 *   - An empty list (`[]`) → `""`
 *   - A value explicitly set to empty string (`""`) → `""`
 *
 * **Rationale:**
 * This behavior is intentional for template variable substitution where:
 * - All template variables must be strings for rendering
 * - Empty values should render as empty strings in the final prompt
 * - The distinction between "no value" and "empty list" is not needed for prompt generation
 *
 * **When This Matters:**
 * If a template needs to handle empty lists differently from missing values, the template should
 * check the original context data before calling this function, or use conditional logic based on
 * other context variables.
 *
 * @param trainer - Trainer data to extract persona fields from (trainer fields always take precedence)
 * @param context - Additional context variables (trainer fields in context are ignored; trainer parameter values are used)
 * @returns Normalized context object with all values as strings, suitable for template rendering
 */
function buildTemplateContext(
  trainer: Trainer | null | undefined,
  context?: PromptContext
): Record<string, string> {
  // Build base context from provided context (spread first)
  const baseContext: Record<string, string | string[] | null | undefined> = {
    focus: context?.focus ?? context?.specific_focus ?? null,
    equipment: context?.equipment ?? context?.available_equipment ?? [],
    fitness_level: context?.fitness_level ?? context?.user_fitness_level,
    injuries: context?.injuries ?? context?.user_injuries ?? [],
    equipment_access: context?.equipment_access,
    workout_difficulty: context?.workout_difficulty,
    user_level: context?.user_level,
    ...context,
    // Trainer fields MUST come from trainer parameter and override any context values
    // This ensures trainer persona data is never overridden by context
    trainer_name: trainer?.name,
    trainer_nickname: trainer?.nickname,
    trainer_philosophy: trainer?.philosophy,
    trainer_personality: trainer?.personality,
    trainer_focuses: trainer?.focuses?.map((focus) => focus.name),
  };

  const normalized: Record<string, string> = {};
  Object.entries(baseContext).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      normalized[key] = "";
    } else if (Array.isArray(value)) {
      normalized[key] = value.join(", ");
    } else {
      normalized[key] = String(value);
    }
  });

  return normalized;
}

function renderTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return context[key] ?? "";
  });
}

function shouldApplyInjection(
  injection: PromptInjection,
  context?: PromptContext
): boolean {
  const conditions = injection.conditions;
  if (!conditions) return true;

  if (conditions.fitness_level?.length) {
    const level =
      context?.fitness_level ??
      context?.user_fitness_level ??
      context?.user_level;
    if (!level || !conditions.fitness_level.includes(level)) {
      return false;
    }
  }

  if (conditions.has_injuries !== undefined) {
    const injuries = context?.injuries ?? context?.user_injuries ?? [];
    const hasInjuries = injuries.length > 0;
    if (conditions.has_injuries !== hasInjuries) {
      return false;
    }
  }

  if (conditions.equipment_access?.length) {
    const access = context?.equipment_access;
    // equipment_access is now string[] - check if any category matches
    if (
      !access ||
      !Array.isArray(access) ||
      !access.some((cat) => conditions.equipment_access?.includes(cat))
    ) {
      return false;
    }
  }

  return true;
}

function applyInjections(
  prompt: string,
  injections: PromptInjection[],
  templateContext: Record<string, string>
): string {
  return injections.reduce((current, injection) => {
    const rendered = renderTemplate(injection.content, templateContext);
    if (injection.type === "prepend") {
      return `${rendered}\n\n${current}`;
    }
    if (injection.type === "append") {
      return `${current}\n\n${rendered}`;
    }
    if (injection.type === "replace_section") {
      if (
        injection.target_section &&
        current.includes(injection.target_section)
      ) {
        return current.replace(injection.target_section, rendered);
      }
      // Fallback to append if target_section not found
      // Log warning with context to help debug missing target sections
      if (injection.target_section) {
        const promptPreview =
          current.length > 200
            ? `${current.substring(0, 200)}...`
            : current.substring(0, current.length);
        console.warn(
          `[PromptResolver] replace_section injection "${injection.name}" (ID: ${injection.id}) could not find target_section "${injection.target_section}" in prompt. Falling back to append.`,
          {
            injectionId: injection.id,
            injectionName: injection.name,
            targetSection: injection.target_section,
            promptLength: current.length,
            promptPreview,
          }
        );
      }
      return `${current}\n\n${rendered}`;
    }
    return current;
  }, prompt);
}

async function getPromptById(promptId: string): Promise<AiPrompt | null> {
  const doc = await adminDb.collection("ai_prompts").doc(promptId).get();
  if (!doc.exists) return null;

  // Normalize prompt data to handle both snake_case and camelCase
  const normalized = normalizeAiPrompt(
    doc.data() as Record<string, unknown>,
    doc.id
  );
  if (!normalized.is_active) return null;

  return normalized;
}

async function getPromptSetById(
  promptSetId: string
): Promise<PromptSet | null> {
  const doc = await adminDb.collection("prompt_sets").doc(promptSetId).get();
  if (!doc.exists) return null;
  const normalized = normalizePromptSet(
    doc.data() as Record<string, unknown>,
    doc.id
  );
  if (!normalized.is_active) return null;
  return normalized;
}

async function getDefaultPromptSet(): Promise<PromptSet | null> {
  const snapshot = await adminDb
    .collection("prompt_sets")
    .where("is_default", "==", true)
    .where("is_active", "==", true)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return normalizePromptSet(doc.data() as Record<string, unknown>, doc.id);
}

async function getPromptInjections(ids: string[]): Promise<PromptInjection[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    ids.map(async (id) => {
      const doc = await adminDb.collection("prompt_injections").doc(id).get();
      if (!doc.exists) return null;
      const normalized = normalizePromptInjection(
        doc.data() as Record<string, unknown>,
        doc.id
      );
      if (!normalized.is_active) return null;
      return normalized;
    })
  );

  return results.filter((item): item is PromptInjection => !!item);
}

/**
 * Resolves the prompt ID for a given target, following a documented fallback hierarchy.
 * Each case defines the priority order when multiple prompt IDs are available.
 *
 * Fallback Strategy:
 * - Target-specific prompts are preferred (e.g., workout_generation_prompt_id)
 * - Generic prompts are used as fallbacks (e.g., exercise_editor_prompt_id, system_prompt_id)
 * - This allows admins to override specific behaviors while maintaining sensible defaults
 */
function resolvePromptId(
  promptSet: PromptSet,
  target: PromptTarget
): string | null {
  switch (target) {
    case "workout_generation":
      // Priority: target-specific → generic system → none
      // Rationale: Use workout-specific prompt if available, otherwise fall back to generic system prompt
      return (
        promptSet.workout_generation_prompt_id ??
        promptSet.system_prompt_id ??
        null
      );
    case "edit_exercise":
      // Priority: edit-specific → exercise editor → generic system → none
      // Rationale: Edit operations can use exercise editor prompts as fallback since they share similar context
      return (
        promptSet.edit_exercise_prompt_id ??
        promptSet.exercise_editor_prompt_id ??
        promptSet.system_prompt_id ??
        null
      );
    case "swap_exercise":
      // Priority: swap-specific → exercise editor → generic system → none
      // Rationale: Swap operations can use exercise editor prompts as fallback since they share similar context
      return (
        promptSet.swap_exercise_prompt_id ??
        promptSet.exercise_editor_prompt_id ??
        promptSet.system_prompt_id ??
        null
      );
    case "coach_explain":
      // Priority: coach explain → generic system → none
      // Rationale: Coach explain has unique requirements, but can fall back to generic system prompt
      return (
        promptSet.coach_explain_prompt_id ?? promptSet.system_prompt_id ?? null
      );
    case "image_generator":
      // Priority: image generator → none (no fallback)
      // Rationale: Image generation prompts are highly specific and should not fall back to generic system prompts
      // to avoid generating inappropriate images
      return promptSet.image_generator_prompt_id ?? null;
    default:
      return null;
  }
}

export async function resolvePromptSetForTrainer(
  trainer?: Trainer | null
): Promise<PromptSet | null> {
  const promptSetId = trainer?.prompt_set_id ?? null;
  if (promptSetId) {
    const promptSet = await getPromptSetById(promptSetId);
    if (promptSet) return promptSet;
  }

  return getDefaultPromptSet();
}

export async function resolvePromptForTarget(input: {
  trainer?: Trainer | null;
  promptSet?: PromptSet | null;
  target: PromptTarget;
  context?: PromptContext;
}): Promise<ResolvedPrompt> {
  const { trainer, promptSet, target, context } = input;

  if (!promptSet) {
    return { prompt: null, metadata: null };
  }

  const promptId = resolvePromptId(promptSet, target);
  if (!promptId) {
    return {
      prompt: null,
      metadata: {
        prompt_set_id: promptSet.id,
        prompt_ids: [],
        prompt_versions: {},
        injection_ids: [],
      },
    };
  }

  const [prompt, injections] = await Promise.all([
    getPromptById(promptId),
    getPromptInjections(
      Array.from(
        new Set([
          ...(promptSet.injection_ids ?? []),
          ...(trainer?.prompt_injections ?? []),
        ])
      )
    ),
  ]);

  if (!prompt) {
    return {
      prompt: null,
      metadata: {
        prompt_set_id: promptSet.id,
        prompt_ids: [promptId],
        prompt_versions: {},
        injection_ids: [],
      },
    };
  }

  const templateContext = buildTemplateContext(trainer, context);
  const basePrompt = renderTemplate(prompt.content, templateContext);
  const filteredInjections = injections
    .filter((injection) => shouldApplyInjection(injection, context))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const finalPrompt =
    filteredInjections.length > 0
      ? applyInjections(basePrompt, filteredInjections, templateContext)
      : basePrompt;

  return {
    prompt: finalPrompt,
    metadata: {
      prompt_set_id: promptSet.id,
      prompt_ids: [prompt.id],
      prompt_versions: { [prompt.id]: prompt.version },
      injection_ids: filteredInjections.map((injection) => injection.id),
    },
  };
}
