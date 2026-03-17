/**
 * Image Generation Service using Google Vertex AI Imagen.
 *
 * Generates exercise demonstration images and manages the master image library.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDbInstance } from "@/lib/firestore";
import {
  buildExerciseImagePrompt,
  normalizeExerciseName,
  DEFAULT_NEGATIVE_PROMPTS,
} from "@/lib/image-generation-config";
import {
  normalizeAiPrompt,
  normalizePromptSet,
  normalizePromptMetadata,
} from "@/lib/prompt-normalize";
import { normalizeTrainerData } from "@/lib/trainer-normalize";
import type {
  AiPrompt,
  PromptSet,
  TrainerWorkout,
  TrainerWorkoutExercise,
  MasterExerciseImage,
} from "@/types/firestore";

/**
 * Result of generating images for a workout.
 */
export interface ImageGenerationResult {
  success: boolean;
  imagesGenerated: number;
  imagesMasterReused: number;
  errors: string[];
  updatedWorkout: TrainerWorkout;
}

/**
 * Check if a master image exists for an exercise.
 *
 * @param exerciseName - The exercise name to look up
 * @returns The master image data or null if not found
 */
export async function getMasterImage(
  exerciseName: string
): Promise<MasterExerciseImage | null> {
  const normalizedName = normalizeExerciseName(exerciseName);
  const db = getDbInstance();
  const docRef = doc(db, "master_exercise_images", normalizedName);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as MasterExerciseImage;
    }
    return null;
  } catch (error) {
    console.error("Error fetching master image:", error);
    return null;
  }
}

/**
 * Resolve the image prompt template from Firestore prompt sets.
 * Falls back to default template if not available or inactive.
 */
async function resolveImagePromptTemplate(
  workout: TrainerWorkout
): Promise<string | null> {
  const workoutId = workout.id;
  let promptSetId: string | null = null;
  let promptId: string | null = null;

  try {
    const db = getDbInstance();

    // Normalize prompt_metadata to handle both snake_case and camelCase
    const promptMetadata = normalizePromptMetadata(
      workout.prompt_metadata as Record<string, unknown> | undefined
    );
    promptSetId = promptMetadata?.prompt_set_id ?? null;

    if (!promptSetId && workout.trainerId) {
      try {
        const trainerDoc = await getDoc(doc(db, "trainers", workout.trainerId));
        if (trainerDoc.exists()) {
          const trainer = normalizeTrainerData(
            trainerDoc.data() as Record<string, unknown>,
            trainerDoc.id
          );
          promptSetId = trainer.prompt_set_id ?? null;
        }
      } catch (error) {
        console.warn(
          `[ImageGenerationService] Failed to fetch trainer document for workout ${workoutId}, trainer ${workout.trainerId}:`,
          error instanceof Error ? error.message : error
        );
        return null;
      }
    }

    if (!promptSetId) return null;

    try {
      const promptSetDoc = await getDoc(doc(db, "prompt_sets", promptSetId));
      if (!promptSetDoc.exists()) return null;

      // Normalize prompt set data to handle both snake_case and camelCase
      const promptSetData = normalizePromptSet(
        promptSetDoc.data() as Record<string, unknown>,
        promptSetDoc.id
      );
      if (!promptSetData.is_active) return null;

      promptId = promptSetData.image_generator_prompt_id ?? null;
      if (!promptId) return null;
    } catch (error) {
      console.warn(
        `[ImageGenerationService] Failed to fetch prompt set ${promptSetId} for workout ${workoutId}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }

    try {
      const promptDoc = await getDoc(doc(db, "ai_prompts", promptId));
      if (!promptDoc.exists()) return null;

      const promptData = normalizeAiPrompt(
        promptDoc.data() as Record<string, unknown>,
        promptDoc.id
      );
      if (!promptData.is_active) return null;

      return typeof promptData.content === "string" ? promptData.content : null;
    } catch (error) {
      console.warn(
        `[ImageGenerationService] Failed to fetch prompt ${promptId} from prompt set ${promptSetId} for workout ${workoutId}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  } catch (error) {
    // Catch-all for any unexpected errors in the resolution flow
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const context = {
      workoutId,
      trainerId: workout.trainerId,
      promptSetId: promptSetId ?? "not resolved",
      promptId: promptId ?? "not resolved",
      operation: "resolveImagePromptTemplate",
    };

    console.warn(
      `[ImageGenerationService] Failed to resolve image prompt template. Context:`,
      context,
      `Error: ${errorMessage}`,
      errorStack ? `\nStack: ${errorStack}` : ""
    );
    return null;
  }
}

async function resolveImagePromptTemplateByWorkoutId(
  workoutId: string
): Promise<string | null> {
  try {
    const db = getDbInstance();
    const workoutDoc = await getDoc(doc(db, "trainer_workouts", workoutId));
    if (!workoutDoc.exists()) return null;

    const workout = {
      id: workoutDoc.id,
      ...workoutDoc.data(),
    } as TrainerWorkout;

    return resolveImagePromptTemplate(workout);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const context = {
      workoutId,
      operation: "resolveImagePromptTemplateByWorkoutId",
      step: "fetch_workout_document",
    };

    console.warn(
      `[ImageGenerationService] Failed to resolve image prompt template by workout ID. Context:`,
      context,
      `Error: ${errorMessage}`,
      errorStack ? `\nStack: ${errorStack}` : ""
    );
    return null;
  }
}

/**
 * Generate an image for a single exercise using Vertex AI Imagen.
 *
 * @param exercise - The exercise to generate an image for
 * @param workoutId - The workout ID for storage path
 * @param idToken - Firebase ID token for API authentication
 * @returns The generated image URL or null on failure
 */
export async function generateExerciseImage(
  exercise: TrainerWorkoutExercise,
  workoutId: string,
  idToken: string,
  promptTemplate?: string | null
): Promise<{ url: string; storagePath: string | null } | null> {
  const resolvedTemplate =
    promptTemplate ?? (await resolveImagePromptTemplateByWorkoutId(workoutId));
  const prompt = buildExerciseImagePrompt(
    exercise.name,
    exercise.muscleTarget,
    exercise.equipment_needed,
    resolvedTemplate
  );

  try {
    // Call the API route to generate the image
    const response = await fetch("/api/image/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        prompt,
        negativePrompts: DEFAULT_NEGATIVE_PROMPTS,
        exerciseName: exercise.name,
        workoutId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Image generation failed");
    }

    const data = await response.json();
    return {
      url: data.imageUrl,
      storagePath: data.storagePath,
    };
  } catch (error) {
    console.error(`Failed to generate image for ${exercise.name}:`, error);
    return null;
  }
}

/**
 * Generate images for all exercises in a workout.
 *
 * Checks for existing master images first, then generates new ones as needed.
 *
 * @param workout - The workout to generate images for
 * @param idToken - Firebase ID token for API authentication
 * @param onProgress - Optional callback for progress updates
 * @returns Result with updated workout and statistics
 */
export async function generateWorkoutImages(
  workout: TrainerWorkout,
  idToken: string,
  onProgress?: (current: number, total: number, exerciseName: string) => void
): Promise<ImageGenerationResult> {
  // Deep clone workout to avoid mutating the original
  // Using structuredClone (requires Node.js 18+) as it properly handles Date objects
  // unlike JSON.parse(JSON.stringify()) which converts Dates to strings
  const result: ImageGenerationResult = {
    success: true,
    imagesGenerated: 0,
    imagesMasterReused: 0,
    errors: [],
    updatedWorkout: structuredClone(workout),
  };

  // Collect all exercises that need images (skip those that already have one)
  const exercisesToProcess: {
    sectionIdx: number;
    exerciseIdx: number;
    exercise: TrainerWorkoutExercise;
  }[] = [];

  workout.sections.forEach((section, sIdx) => {
    section.exercises.forEach((exercise, eIdx) => {
      // Only include exercises that don't already have an image
      if (!exercise.image_url) {
        exercisesToProcess.push({
          sectionIdx: sIdx,
          exerciseIdx: eIdx,
          exercise,
        });
      }
    });
  });

  const totalToProcess = exercisesToProcess.length;

  // If all exercises already have images, return early
  if (totalToProcess === 0) {
    return result;
  }

  // Resolve prompt template once per workout (fallback to default if missing)
  const promptTemplate = await resolveImagePromptTemplate(workout);

  // Process each exercise that needs an image
  for (let i = 0; i < exercisesToProcess.length; i++) {
    const { sectionIdx, exerciseIdx, exercise } = exercisesToProcess[i];

    // Report progress
    if (onProgress) {
      onProgress(i + 1, totalToProcess, exercise.name);
    }

    try {
      // Check for master image first
      const masterImage = await getMasterImage(exercise.name);

      if (masterImage) {
        // Use master image
        result.updatedWorkout.sections[sectionIdx].exercises[
          exerciseIdx
        ].image_url = masterImage.image_url;
        result.updatedWorkout.sections[sectionIdx].exercises[
          exerciseIdx
        ].image_source = "master";
        result.imagesMasterReused++;
      } else {
        // Generate new image
        const imageResult = await generateExerciseImage(
          exercise,
          workout.id,
          idToken,
          promptTemplate
        );

        if (imageResult) {
          result.updatedWorkout.sections[sectionIdx].exercises[
            exerciseIdx
          ].image_url = imageResult.url;
          result.updatedWorkout.sections[sectionIdx].exercises[
            exerciseIdx
          ].image_source = "generated";
          result.imagesGenerated++;
        } else {
          result.errors.push(`Failed to generate image for: ${exercise.name}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Error processing ${exercise.name}: ${errorMessage}`);
    }
  }

  // Update workout metadata
  result.updatedWorkout.has_images = true;

  if (result.errors.length > 0) {
    result.success =
      result.imagesGenerated > 0 || result.imagesMasterReused > 0;
  }

  return result;
}

/**
 * Save a generated image as a master image for future reuse.
 *
 * @param exerciseName - The original exercise name
 * @param imageUrl - The Firebase Storage URL
 * @param storagePath - The storage path for deletion
 * @param promptUsed - The prompt that generated this image
 * @param adminUserId - The admin user ID marking this as master
 */
export async function saveMasterImage(
  exerciseName: string,
  imageUrl: string,
  storagePath: string,
  promptUsed: string,
  adminUserId: string
): Promise<void> {
  const normalizedName = normalizeExerciseName(exerciseName);
  const db = getDbInstance();
  const docRef = doc(db, "master_exercise_images", normalizedName);

  await setDoc(docRef, {
    exercise_name: exerciseName,
    image_url: imageUrl,
    storage_path: storagePath,
    prompt_used: promptUsed,
    quality_score: null,
    marked_master_at: serverTimestamp(),
    marked_by: adminUserId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export const ImageGenerationService = {
  getMasterImage,
  generateExerciseImage,
  generateWorkoutImages,
  saveMasterImage,
};
