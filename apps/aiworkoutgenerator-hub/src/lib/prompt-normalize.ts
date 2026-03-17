import type {
  AiPrompt,
  PromptSet,
  PromptInjection,
  PromptMetadata,
} from "@/types/firestore";

type RawPromptData = Record<string, unknown>;
type RawPromptSetData = Record<string, unknown>;
type RawPromptInjectionData = Record<string, unknown>;

/**
 * Helper to safely extract a boolean value, checking both snake_case and camelCase.
 */
function toBoolean(
  value: unknown,
  snakeCaseKey: string,
  camelCaseKey: string,
  fallback: boolean
): boolean {
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj[snakeCaseKey] === "boolean") {
      return obj[snakeCaseKey] as boolean;
    }
    if (typeof obj[camelCaseKey] === "boolean") {
      return obj[camelCaseKey] as boolean;
    }
  }
  return fallback;
}

/**
 * Helper to safely extract a string value, checking both snake_case and camelCase.
 */
function toString(
  value: unknown,
  snakeCaseKey: string,
  camelCaseKey: string,
  fallback: string | null
): string | null {
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj[snakeCaseKey] === "string") {
      return obj[snakeCaseKey] as string;
    }
    if (typeof obj[camelCaseKey] === "string") {
      return obj[camelCaseKey] as string;
    }
  }
  return fallback;
}

/**
 * Normalizes raw Firestore data for an AiPrompt, handling both snake_case and camelCase field names.
 * This ensures compatibility with data written by different systems (admin app vs Hub app).
 */
export function normalizeAiPrompt(data: RawPromptData, id: string): AiPrompt {
  const isActive = toBoolean(data, "is_active", "isActive", true);

  return {
    id,
    name: (data.name as string) ?? "",
    type: (data.type as AiPrompt["type"]) ?? "system",
    category: (data.category as AiPrompt["category"]) ?? "general",
    content: (data.content as string) ?? "",
    variables: Array.isArray(data.variables)
      ? (data.variables as string[])
      : undefined,
    version: typeof data.version === "number" ? data.version : 1,
    is_active: isActive,
    previous_version_id:
      toString(data, "previous_version_id", "previousVersionId", null) ??
      undefined,
    description:
      toString(data, "description", "description", null) ?? undefined,
    usage_count:
      typeof data.usage_count === "number"
        ? data.usage_count
        : typeof (data as { usageCount?: number }).usageCount === "number"
          ? (data as { usageCount: number }).usageCount
          : undefined,
    last_used_at: (data.last_used_at as AiPrompt["last_used_at"]) ?? undefined,
    trainer_ids: Array.isArray(data.trainer_ids)
      ? (data.trainer_ids as string[])
      : Array.isArray((data as { trainerIds?: string[] }).trainerIds)
        ? (data as { trainerIds: string[] }).trainerIds
        : undefined,
    created_at: (data.created_at as AiPrompt["created_at"]) ?? {
      seconds: 0,
      nanoseconds: 0,
    },
    updated_at: (data.updated_at as AiPrompt["updated_at"]) ?? {
      seconds: 0,
      nanoseconds: 0,
    },
    created_by: (data.created_by as string) ?? "",
  };
}

/**
 * Normalizes raw Firestore data for a PromptSet, handling both snake_case and camelCase field names.
 * This ensures compatibility with data written by different systems (admin app vs Hub app).
 */
export function normalizePromptSet(
  data: RawPromptSetData,
  id: string
): PromptSet {
  const isActive = toBoolean(data, "is_active", "isActive", true);
  const isDefault = toBoolean(data, "is_default", "isDefault", false);

  return {
    id,
    name: (data.name as string) ?? "",
    description:
      toString(data, "description", "description", null) ?? undefined,
    system_prompt_id:
      toString(data, "system_prompt_id", "systemPromptId", null) ?? undefined,
    workout_generation_prompt_id:
      toString(
        data,
        "workout_generation_prompt_id",
        "workoutGenerationPromptId",
        null
      ) ?? undefined,
    edit_exercise_prompt_id:
      toString(data, "edit_exercise_prompt_id", "editExercisePromptId", null) ??
      undefined,
    swap_exercise_prompt_id:
      toString(data, "swap_exercise_prompt_id", "swapExercisePromptId", null) ??
      undefined,
    coach_explain_prompt_id:
      toString(data, "coach_explain_prompt_id", "coachExplainPromptId", null) ??
      undefined,
    exercise_editor_prompt_id:
      toString(
        data,
        "exercise_editor_prompt_id",
        "exerciseEditorPromptId",
        null
      ) ?? undefined,
    section_editor_prompt_id:
      toString(
        data,
        "section_editor_prompt_id",
        "sectionEditorPromptId",
        null
      ) ?? undefined,
    board_editor_prompt_id:
      toString(data, "board_editor_prompt_id", "boardEditorPromptId", null) ??
      undefined,
    image_generator_prompt_id:
      toString(
        data,
        "image_generator_prompt_id",
        "imageGeneratorPromptId",
        null
      ) ?? undefined,
    injection_ids: Array.isArray(data.injection_ids)
      ? (data.injection_ids as string[])
      : Array.isArray((data as { injectionIds?: string[] }).injectionIds)
        ? (data as { injectionIds: string[] }).injectionIds
        : undefined,
    is_active: isActive,
    is_default: isDefault,
    created_at: (data.created_at as PromptSet["created_at"]) ?? {
      seconds: 0,
      nanoseconds: 0,
    },
    updated_at: (data.updated_at as PromptSet["updated_at"]) ?? {
      seconds: 0,
      nanoseconds: 0,
    },
  };
}

/**
 * Normalizes raw Firestore data for a PromptInjection, handling both snake_case and camelCase field names.
 */
export function normalizePromptInjection(
  data: RawPromptInjectionData,
  id: string
): PromptInjection {
  const isActive = toBoolean(data, "is_active", "isActive", true);

  return {
    id,
    name: (data.name as string) ?? "",
    type: (data.type as PromptInjection["type"]) ?? "append",
    target_section:
      toString(data, "target_section", "targetSection", null) ?? undefined,
    content: (data.content as string) ?? "",
    variables: Array.isArray(data.variables)
      ? (data.variables as string[])
      : undefined,
    conditions: (data.conditions as PromptInjection["conditions"]) ?? undefined,
    priority: typeof data.priority === "number" ? data.priority : 0,
    is_active: isActive,
    created_at: (data.created_at as PromptInjection["created_at"]) ?? {
      seconds: 0,
      nanoseconds: 0,
    },
    updated_at: (data.updated_at as PromptInjection["updated_at"]) ?? {
      seconds: 0,
      nanoseconds: 0,
    },
  };
}

type RawPromptMetadataData = Record<string, unknown>;

/**
 * Normalizes raw Firestore data for PromptMetadata, handling both snake_case and camelCase field names.
 * This ensures compatibility with data written by different systems (admin app vs Hub app).
 */
export function normalizePromptMetadata(
  data: RawPromptMetadataData | undefined | null
): PromptMetadata | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return {
    prompt_set_id:
      toString(data, "prompt_set_id", "promptSetId", null) ?? undefined,
    prompt_ids: Array.isArray(data.prompt_ids)
      ? (data.prompt_ids as string[])
      : Array.isArray((data as { promptIds?: string[] }).promptIds)
        ? (data as { promptIds: string[] }).promptIds
        : undefined,
    prompt_versions:
      (data.prompt_versions as Record<string, number>) ??
      ((data as { promptVersions?: Record<string, number> }).promptVersions as
        | Record<string, number>
        | undefined) ??
      undefined,
    injection_ids: Array.isArray(data.injection_ids)
      ? (data.injection_ids as string[])
      : Array.isArray((data as { injectionIds?: string[] }).injectionIds)
        ? (data as { injectionIds: string[] }).injectionIds
        : undefined,
    resolved_at:
      (data.resolved_at as PromptMetadata["resolved_at"]) ??
      ((data as { resolvedAt?: PromptMetadata["resolved_at"] }).resolvedAt as
        | PromptMetadata["resolved_at"]
        | undefined) ??
      undefined,
  };
}
