/**
 * Image Mapping Utilities for Admin SDK
 *
 * Provides image mapping functions that use Firebase Admin SDK.
 * Used in API routes that need to map images from master_exercise_images
 * to workout exercises.
 *
 * Features:
 * - In-memory caching with TTL to reduce Firestore queries
 * - Retry logic with exponential backoff for transient failures
 * - Race condition prevention for concurrent requests
 * - Comprehensive error handling and logging
 */

import { adminDb } from "@/lib/firebase-admin";
import { trimExerciseName } from "@/lib/image-generation-config";
import admin from "firebase-admin";

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_CLEANUP_INTERVAL = 100; // Clean cache every N operations

interface CacheEntry {
  value: string | null;
  timestamp: number;
}

// In-memory cache for exercise images
const imageCache = new Map<string, CacheEntry>();

// Track in-flight requests to prevent duplicate queries for the same exercise
const inFlightRequests = new Map<string, Promise<string | null>>();

// Counter for deterministic cache cleanup
let cacheOperationCount = 0;

/**
 * Type representing an exercise that needs image mapping.
 * Used internally for collecting exercises that need images mapped.
 */
type ExerciseToMap = {
  exercise: {
    name: string;
    image_url?: string;
    image_source?: string;
  };
};

/**
 * Clear expired cache entries.
 * Should be called periodically to prevent memory leaks.
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of imageCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      imageCache.delete(key);
    }
  }
}

/**
 * Check if an error is transient and should be retried.
 */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const transientIndicators = [
    "network",
    "timeout",
    "unavailable",
    "deadline exceeded",
    "connection",
    "econnreset",
    "etimedout",
  ];

  return transientIndicators.some((indicator) => message.includes(indicator));
}

/**
 * Retry a function with exponential backoff.
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 100)
 * @returns Result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or if error is not transient
      if (attempt === maxRetries || !isTransientError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Query Firestore for exercise image with retry logic.
 */
async function queryExerciseImage(
  normalizedName: string,
  db: admin.firestore.Firestore
): Promise<string | null> {
  return retryWithBackoff(async () => {
    const allDocs = await db
      .collection("master_exercise_images")
      .where("exercise_name", "==", normalizedName)
      .where("status", "==", "certified")
      .get();

    if (allDocs.empty) {
      return null;
    }

    // Sort by position in memory (position 1 is primary, lower is better)
    const sortedDocs = allDocs.docs.sort((a, b) => {
      const dataA = a.data();
      const dataB = b.data();
      const posA = dataA.position ?? 999;
      const posB = dataB.position ?? 999;
      return posA - posB;
    });

    const docData = sortedDocs[0].data();
    return docData.image_url || null;
  });
}

/**
 * Get image URL for an exercise using a specific database instance.
 * Implements caching, retry logic, and race condition prevention.
 *
 * @param exerciseName - The exercise name to look up
 * @param db - The Firestore database instance to use
 * @returns Image URL or null if not found or not certified
 */
async function getImageForExerciseWithDb(
  exerciseName: string,
  db: admin.firestore.Firestore
): Promise<string | null> {
  const normalizedName = trimExerciseName(exerciseName);
  const cacheKey = `exercise:${normalizedName}`;

  // Check cache first
  const cached = imageCache.get(cacheKey);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL_MS) {
      return cached.value;
    }
    // Cache expired, remove it
    imageCache.delete(cacheKey);
  }

  // Check if there's already an in-flight request for this exercise
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    try {
      const result = await inFlight;
      return result;
    } catch {
      // If the in-flight request failed, we'll retry below
      inFlightRequests.delete(cacheKey);
    }
  }

  // Create new request and track it
  const requestPromise = (async () => {
    try {
      const imageUrl = await queryExerciseImage(normalizedName, db);

      // Cache the result (even if null, to avoid repeated queries for missing images)
      imageCache.set(cacheKey, {
        value: imageUrl,
        timestamp: Date.now(),
      });

      // Clean expired cache entries deterministically every N operations
      // This ensures predictable memory management, especially important during
      // batch operations that process many exercises in a single request
      cacheOperationCount++;
      if (cacheOperationCount >= CACHE_CLEANUP_INTERVAL) {
        cleanExpiredCache();
        cacheOperationCount = 0; // Reset counter after cleanup
      }

      return imageUrl;
    } catch (error) {
      // Log error with context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[Image Mapping] Error fetching image for exercise "${exerciseName}" (normalized: "${normalizedName}"):`,
        errorMessage,
        {
          exerciseName,
          normalizedName,
          isTransient: isTransientError(error),
        }
      );

      // Clear cache on error to allow retry with fresh data
      imageCache.delete(cacheKey);

      // Re-throw to be handled by caller
      throw error;
    } finally {
      // Remove from in-flight requests
      inFlightRequests.delete(cacheKey);
    }
  })();

  // Track the in-flight request
  inFlightRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * Get image URL for an exercise from master_exercise_images collection.
 * Only returns images with status "certified".
 * Queries by exercise_name field (exact match, trimmed).
 * Returns the primary image (position 1) if available.
 *
 * Uses Firebase Admin SDK (for use in API routes).
 * Uses the default adminDb instance (may use emulator if configured).
 *
 * @param exerciseName - The exercise name to look up
 * @returns Image URL or null if not found or not certified
 */
export async function getImageForExerciseAdmin(
  exerciseName: string
): Promise<string | null> {
  try {
    // Use the default adminDb instance
    // Note: This may connect to emulator if FIRESTORE_EMULATOR_HOST is set
    // For production master_exercise_images, use getImageForExerciseWithDb with production DB
    const normalizedName = trimExerciseName(exerciseName);

    return retryWithBackoff(async () => {
      const allDocs = await adminDb
        .collection("master_exercise_images")
        .where("exercise_name", "==", normalizedName)
        .where("status", "==", "certified")
        .get();

      if (allDocs.empty) {
        return null;
      }

      // Sort by position in memory (position 1 is primary, lower is better)
      const sortedDocs = allDocs.docs.sort((a, b) => {
        const posA = a.data().position ?? 999;
        const posB = b.data().position ?? 999;
        return posA - posB;
      });

      const docSnap = sortedDocs[0];
      const data = docSnap.data();
      return data.image_url || null;
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Image Mapping] Error fetching image for exercise "${exerciseName}":`,
      errorMessage,
      { exerciseName, isTransient: isTransientError(error) }
    );
    return null;
  }
}

/**
 * Map images to exercises in a workout object using a specific database instance.
 * Only maps images for exercises that don't already have image_url set.
 *
 * Uses Promise.allSettled to handle partial failures gracefully - continues
 * processing even if some exercises fail to map.
 *
 * **IMPORTANT: This function mutates the input workout object in place.**
 * Callers should clone the workout object before calling this function if they
 * need to preserve the original object (e.g., in React components where immutability
 * is expected). API routes that use this function already clone the object first.
 *
 * @param workout - The workout object (will be modified in place)
 * @param db - The Firestore database instance to use
 * @returns Object with mapping statistics
 */
export async function mapImagesToWorkoutObjectWithDb(
  workout: {
    sections: Array<{
      exercises: Array<{
        name: string;
        image_url?: string;
        image_source?: string;
      }>;
    }>;
  },
  db: admin.firestore.Firestore
): Promise<{
  imagesMapped: boolean;
  successCount: number;
  errorCount: number;
}> {
  // Collect all exercises that need images
  const exercisesToMap: ExerciseToMap[] = [];

  for (const section of workout.sections) {
    for (const exercise of section.exercises) {
      // Only map images for exercises that don't already have images
      if (!exercise.image_url) {
        exercisesToMap.push({ exercise });
      }
    }
  }

  if (exercisesToMap.length === 0) {
    return { imagesMapped: false, successCount: 0, errorCount: 0 };
  }

  // Map all exercises in parallel using Promise.allSettled
  // This allows us to continue even if some exercises fail
  const results = await Promise.allSettled(
    exercisesToMap.map(async ({ exercise }) => {
      try {
        const imageUrl = await getImageForExerciseWithDb(exercise.name, db);
        if (imageUrl) {
          exercise.image_url = imageUrl;
          exercise.image_source = "master";
          return { success: true, exerciseName: exercise.name };
        }
        return {
          success: false,
          exerciseName: exercise.name,
          reason: "no_image_found",
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[Image Mapping] Failed to map image for exercise "${exercise.name}":`,
          errorMessage
        );
        return {
          success: false,
          exerciseName: exercise.name,
          reason: "error",
          error: errorMessage,
        };
      }
    })
  );

  // Count successes and errors
  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.success) {
        successCount++;
      } else if (result.value.reason === "error") {
        errorCount++;
      }
    } else {
      errorCount++;
      console.error(
        `[Image Mapping] Promise rejected while mapping exercise:`,
        result.reason
      );
    }
  }

  const imagesMapped = successCount > 0;

  if (errorCount > 0) {
    console.warn(
      `[Image Mapping] Completed with ${successCount} successes and ${errorCount} errors out of ${exercisesToMap.length} exercises`
    );
  }

  return { imagesMapped, successCount, errorCount };
}

/**
 * Map images to exercises in a workout object (doesn't save to database).
 * Only maps images for exercises that don't already have image_url set.
 * Uses the default adminDb instance (may use emulator if configured).
 *
 * Uses Promise.allSettled to handle partial failures gracefully.
 *
 * @param workout - The workout object (will be modified in place)
 * @returns True if any images were mapped, false otherwise
 */
export async function mapImagesToWorkoutObject(workout: {
  sections: Array<{
    exercises: Array<{
      name: string;
      image_url?: string;
      image_source?: string;
    }>;
  }>;
}): Promise<boolean> {
  // Collect all exercises that need images
  const exercisesToMap: ExerciseToMap[] = [];

  for (const section of workout.sections) {
    for (const exercise of section.exercises) {
      // Only map images for exercises that don't already have images
      if (!exercise.image_url) {
        exercisesToMap.push({ exercise });
      }
    }
  }

  if (exercisesToMap.length === 0) {
    return false;
  }

  // Map all exercises in parallel using Promise.allSettled
  const results = await Promise.allSettled(
    exercisesToMap.map(async ({ exercise }) => {
      try {
        const imageUrl = await getImageForExerciseAdmin(exercise.name);
        if (imageUrl) {
          exercise.image_url = imageUrl;
          exercise.image_source = "master";
          return { success: true };
        }
        return { success: false };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[Image Mapping] Failed to map image for exercise "${exercise.name}":`,
          errorMessage
        );
        return { success: false };
      }
    })
  );

  // Check if any images were successfully mapped
  const imagesMapped = results.some(
    (result) => result.status === "fulfilled" && result.value.success === true
  );

  return imagesMapped;
}
