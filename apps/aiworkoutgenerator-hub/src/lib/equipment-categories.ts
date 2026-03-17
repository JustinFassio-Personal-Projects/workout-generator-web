import type { FitnessLevel } from "@/types/firestore";

/**
 * Category mapping from ONBOARDING_INTEGRATION.md
 * Each fitness level unlocks progressively more categories (cumulative)
 */
export const CATEGORY_MAPPING: Record<FitnessLevel, string[]> = {
  beginner: ["general", "strength", "functional", "cardio"],
  intermediate: [
    "general",
    "strength",
    "functional",
    "cardio",
    "calisthenics",
    "yoga",
    "pilates",
    "mobility",
  ],
  advanced: [
    "general",
    "strength",
    "functional",
    "cardio",
    "calisthenics",
    "yoga",
    "pilates",
    "mobility",
    "strongman",
    "olympic",
    "recovery",
  ],
  athlete: [
    "general",
    "strength",
    "functional",
    "cardio",
    "calisthenics",
    "yoga",
    "pilates",
    "mobility",
    "strongman",
    "olympic",
    "recovery",
    "combat",
    "rehab",
    "outdoor",
    "aquatic",
    "smart",
  ],
};

/**
 * Display labels from ONBOARDING_INTEGRATION.md table (lines 75-92)
 * Maps category string keys to user-friendly display labels
 */
export const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  general: "General / Universal",
  strength: "Strength Training",
  functional: "Functional Training",
  cardio: "Cardio",
  calisthenics: "Calisthenics",
  yoga: "Yoga",
  pilates: "Pilates",
  mobility: "Mobility",
  strongman: "Strongman",
  olympic: "Olympic Lifting",
  recovery: "Recovery",
  combat: "Combat Sports",
  rehab: "Rehabilitation",
  outdoor: "Outdoor Training",
  aquatic: "Aquatic Training",
  smart: "Smart Equipment",
};

/**
 * Get available categories for a given fitness level
 * @param fitnessLevel - The user's fitness level
 * @returns Array of category strings available for that level
 */
export function getAvailableCategories(fitnessLevel?: FitnessLevel): string[] {
  if (!fitnessLevel) return [];
  return CATEGORY_MAPPING[fitnessLevel] || [];
}

/**
 * Get display label for a category string
 * @param category - Category string (e.g., "general", "strength")
 * @returns Display label (e.g., "General / Universal", "Strength Training")
 */
export function getCategoryDisplayLabel(category: string): string {
  return CATEGORY_DISPLAY_LABELS[category] || category;
}

/**
 * Validate and filter categories to only include those allowed for the fitness level
 * @param categories - Array of category strings to validate
 * @param fitnessLevel - User's fitness level
 * @returns Filtered array containing only valid categories for the fitness level
 */
export function validateCategories(
  categories: string[],
  fitnessLevel: FitnessLevel
): string[] {
  const allowed = CATEGORY_MAPPING[fitnessLevel];
  return categories.filter((cat) => allowed.includes(cat));
}
