import { Timestamp } from "firebase/firestore";
import type { Trainer, TrainerFocus, TrainerSeedData } from "@/types/trainer";
import { TRAINERS } from "@/types/trainer";

type RawTrainerData = Record<string, unknown>;

function toString(value: unknown, fallback: string | null): string | null {
  return typeof value === "string" ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toTimestamp(value: unknown): Timestamp | undefined {
  if (value instanceof Timestamp) {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Timestamp.fromDate(date);
  }
  return undefined;
}

function toStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeFocus(
  rawFocus: unknown,
  baseFocus?: TrainerFocus,
  index = 0
): TrainerFocus | null {
  // Return null for primitive types, null, or undefined - filter them out
  if (!rawFocus || typeof rawFocus !== "object") {
    return null;
  }

  const focus = rawFocus as Record<string, unknown>;

  // Check if there's any valid data (id or name) in the raw focus
  const hasId = typeof focus.id === "string" && focus.id.trim().length > 0;
  const hasName =
    typeof focus.name === "string" && focus.name.trim().length > 0;
  const hasValidData = hasId || hasName;

  // If there's no valid data in the raw focus, filter it out (don't use baseFocus)
  // baseFocus is only used to fill in missing fields, not to replace invalid items
  if (!hasValidData) {
    return null;
  }

  const id =
    toString(focus.id, null) ??
    toString(focus.name, null) ??
    baseFocus?.id ??
    `focus_${index}`;
  const name =
    toString(focus.name, null) ?? baseFocus?.name ?? `Focus ${index + 1}`;
  const icon = toString(focus.icon, null) ?? baseFocus?.icon ?? "💪";
  const isPrimary = toBoolean(
    focus.isPrimary ?? focus.is_primary,
    baseFocus?.isPrimary ?? false
  );

  return {
    id,
    name,
    icon,
    isPrimary,
  };
}

export function normalizeTrainerData(
  data: RawTrainerData,
  id: string
): Trainer {
  const base = TRAINERS.find((trainer) => trainer.id === id);

  const name =
    toString(data.name, null) ??
    toString(data.display_name, null) ??
    base?.name ??
    id;
  const nickname = toString(data.nickname, base?.nickname ?? "") ?? "";
  const tagline = toString(data.tagline, base?.tagline ?? "") ?? "";
  const description = toString(data.description, base?.description ?? "") ?? "";
  const philosophy = toString(data.philosophy, base?.philosophy ?? "") ?? "";
  const personality = toString(data.personality, base?.personality ?? "") ?? "";

  // profile_image_url is the admin-managed source of truth (snake_case in Firestore)
  // imageUrl is the app field (camelCase) that falls back to profile_image_url
  const profileImageUrl =
    toString(data.profile_image_url, null) ?? base?.profile_image_url ?? null;
  // Priority: data.imageUrl > profileImageUrl (admin field) > base.imageUrl
  const imageUrl =
    toString(data.imageUrl, null) ?? profileImageUrl ?? base?.imageUrl ?? null;

  const accentColor = toString(data.accentColor, base?.accentColor ?? "") ?? "";
  const borderColor = toString(data.borderColor, base?.borderColor ?? "") ?? "";

  const rawFocuses = Array.isArray(data.focuses) ? data.focuses : null;
  const normalizedFocuses = rawFocuses
    ? rawFocuses
        .map((focus, index) =>
          normalizeFocus(focus, base?.focuses[index], index)
        )
        .filter((focus): focus is TrainerFocus => !!focus)
    : [];
  const focuses =
    normalizedFocuses.length > 0 ? normalizedFocuses : (base?.focuses ?? []);

  const stats = data.stats as Record<string, unknown> | undefined;
  const workoutsGenerated = toNumber(
    stats?.workoutsGenerated ?? stats?.workouts_generated,
    base?.stats.workoutsGenerated ?? 0
  );
  const avgRating = toNumber(
    stats?.avgRating ?? stats?.avg_rating,
    base?.stats.avgRating ?? 0
  );

  const recommendedForRaw = toStringArray(data.recommendedFor, []);
  const recommendedForSnake = toStringArray(data.recommended_for, []);
  const recommendedFor =
    recommendedForRaw.length > 0
      ? recommendedForRaw
      : recommendedForSnake.length > 0
        ? recommendedForSnake
        : (base?.recommendedFor ?? []);

  const isActive = toBoolean(
    data.isActive ?? data.is_active,
    base?.isActive ?? true
  );
  const displayOrder = toNumber(
    data.displayOrder ?? data.order,
    base?.displayOrder ?? 0
  );

  const promptInjectionsRaw = toStringArray(data.prompt_injections, []);
  const promptInjectionsCamel = toStringArray(data.promptInjections, []);

  return {
    id: id as TrainerSeedData["id"],
    name,
    nickname,
    tagline,
    description,
    philosophy,
    personality,
    imageUrl,
    // Preserve profile_image_url separately as admin-managed source of truth
    // even though imageUrl may have been computed from it
    profile_image_url: profileImageUrl,
    profile_image_storage_path: toString(data.profile_image_storage_path, null),
    // Banner image fields (admin-managed, snake_case in Firestore)
    banner_image_url: toString(data.banner_image_url, null),
    banner_image_storage_path: toString(data.banner_image_storage_path, null),
    // Prioritize camelCase (promptSetId) over snake_case (prompt_set_id)
    prompt_set_id:
      toString(data.promptSetId, null) ?? toString(data.prompt_set_id, null),
    prompt_injections:
      promptInjectionsRaw.length > 0
        ? promptInjectionsRaw
        : promptInjectionsCamel,
    accentColor,
    borderColor,
    focuses,
    stats: {
      workoutsGenerated,
      avgRating,
    },
    recommendedFor,
    isActive,
    displayOrder,
    createdAt: toTimestamp(data.createdAt ?? data.created_at),
    updatedAt: toTimestamp(data.updatedAt ?? data.updated_at),
  };
}
