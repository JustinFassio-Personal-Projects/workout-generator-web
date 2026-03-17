/**
 * Configuration for exercise image generation using Google Vertex AI Imagen.
 *
 * Environment variables required:
 * - GOOGLE_CLOUD_PROJECT_ID: GCP project ID
 * - GOOGLE_CLOUD_LOCATION: GCP region (default: us-central1)
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON: Service account key JSON
 */

export const IMAGE_GENERATION_CONFIG = {
  // Vertex AI Imagen settings
  model: "imagegeneration@006", // Imagen 3
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",

  // Image settings
  imageSize: {
    width: 1024,
    height: 1024,
  },
  aspectRatio: "1:1",

  // Generation parameters
  sampleCount: 1, // Generate 1 image per request
  guidanceScale: 7.5, // How closely to follow the prompt (1-20)

  // Safety settings - "block_fewest" is less restrictive for fitness content
  safetyFilterLevel: "block_fewest",

  // Person generation policy - controls how people are generated in images
  // Options: "allow_adult" (default for fitness), "dont_allow" (no people), or undefined (use API default)
  // Can be customized based on user preferences (e.g., motivational vs realistic)
  personGeneration: "allow_adult" as "allow_adult" | "dont_allow" | undefined,

  // Tier-based limits (matches SubscriptionTier: "free" | "basic" | "pro" | "elite")
  tierLimits: {
    free: 0,
    basic: 0,
    pro: 10,
    elite: 20,
  } as const,

  // Cost tracking (per image in USD)
  estimatedCostPerImage: 0.03,
} as const;

/**
 * Default image generation prompt template.
 * Can be overridden via Firestore app_config/image_generation document.
 */
export const DEFAULT_IMAGE_PROMPT_TEMPLATE = `
Professional fitness photography of a fit adult performing "{exerciseName}".

Exercise details:
- Target muscle: {muscleTarget}
- Equipment: {equipment}

Image requirements:
- Clean gym or studio background with professional lighting
- Show proper form at the peak contraction point of the movement
- 45-degree angle view preferred for clear form visibility
- Athletic wear (fitted tank top, shorts)
- Realistic human proportions and natural skin tones
- No text, watermarks, or logos
- High resolution, sharp focus on the subject

Style: Professional fitness demonstration photo, educational and motivational.
`.trim();

/**
 * Negative prompts to avoid common AI image issues.
 */
export const DEFAULT_NEGATIVE_PROMPTS = [
  "blurry",
  "distorted limbs",
  "extra limbs",
  "deformed hands",
  "unrealistic proportions",
  "cartoon",
  "anime",
  "illustration",
  "text",
  "watermark",
  "logo",
  "low quality",
  "oversaturated",
];

/**
 * Replaces a template variable in both single-brace and double-brace formats.
 * Canonical format is single braces: {variableName}
 * Double braces {{variableName}} are supported for compatibility with admin-managed templates.
 *
 * @param template - The template string to process
 * @param variableName - The variable name (without braces)
 * @param value - The value to substitute
 * @returns The template with all occurrences of the variable replaced
 */
function replaceTemplateVariable(
  template: string,
  variableName: string,
  value: string
): string {
  // Replace double-brace format first ({{variableName}}), then single-brace ({variableName})
  // This ensures double braces don't interfere with single brace replacements
  return template
    .replace(new RegExp(`\\{\\{\\s*${variableName}\\s*\\}\\}`, "g"), value)
    .replace(new RegExp(`\\{${variableName}\\}`, "g"), value);
}

/**
 * Build an image prompt for a specific exercise.
 *
 * Template variable syntax:
 * - Preferred: {variableName} (single braces)
 * - Supported: {{variableName}} (double braces, for admin-managed template compatibility)
 *
 * Available variables:
 * - {exerciseName} - The name of the exercise
 * - {muscleTarget} - The primary muscle group targeted
 * - {equipment} - Available equipment or "bodyweight only"
 */
export function buildExerciseImagePrompt(
  exerciseName: string,
  muscleTarget: string,
  equipment: string[] = [],
  templateOverride?: string | null
): string {
  const equipmentStr =
    equipment.length > 0 ? equipment.join(", ") : "bodyweight only";
  const template =
    templateOverride && templateOverride.trim().length > 0
      ? templateOverride
      : DEFAULT_IMAGE_PROMPT_TEMPLATE;

  return replaceTemplateVariable(
    replaceTemplateVariable(
      replaceTemplateVariable(template, "exerciseName", exerciseName),
      "muscleTarget",
      muscleTarget
    ),
    "equipment",
    equipmentStr
  );
}

/**
 * Normalize exercise name for storage paths.
 * Converts to lowercase, removes special characters, replaces spaces with hyphens.
 * Used only for Firebase Storage paths, NOT for Firestore queries.
 */
export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Trim exercise name for Firestore queries.
 * Exercise names in master_exercise_images are stored with exact match (trimmed only).
 * Use this for querying by exercise_name field.
 */
export function trimExerciseName(name: string): string {
  return name.trim();
}

/**
 * Get document ID for a user exercise image preference.
 * Format: `${userId}_${normalizedExerciseName}`
 *
 * This is the single source of truth for preference document IDs.
 * Used by both client-side service and API routes to ensure consistency.
 *
 * @param userId - The user's Firebase Auth UID
 * @param exerciseName - The exercise name
 * @returns Document ID in format `${userId}_${normalizedExerciseName}`
 */
export function getPreferenceDocId(
  userId: string,
  exerciseName: string
): string {
  const normalizedName = trimExerciseName(exerciseName);
  // Replace spaces and special characters with underscores for document ID
  const safeName = normalizedName.replace(/[^a-zA-Z0-9]/g, "_");
  return `${userId}_${safeName}`;
}

export type SubscriptionTier = keyof typeof IMAGE_GENERATION_CONFIG.tierLimits;
