/**
 * Firebase Storage service for exercise images.
 *
 * Handles uploading, retrieving, and deleting exercise demonstration images.
 */

import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getApp } from "firebase/app";

const EXERCISE_IMAGES_PATH = "exercise-images";

/**
 * Get Firebase Storage instance.
 */
function getStorageInstance() {
  const app = getApp();
  return getStorage(app);
}

/**
 * Generate a storage path for an exercise image.
 *
 * @param workoutId - The workout document ID
 * @param exerciseName - Normalized exercise name
 * @param timestamp - Generation timestamp for uniqueness
 */
export function generateStoragePath(
  workoutId: string,
  exerciseName: string,
  timestamp: number = Date.now()
): string {
  const safeName = exerciseName.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return `${EXERCISE_IMAGES_PATH}/${workoutId}/${safeName}_${timestamp}.png`;
}

/**
 * Generate a storage path for a master exercise image.
 *
 * @param normalizedName - Normalized exercise name (lowercase, underscores)
 */
export function generateMasterImagePath(normalizedName: string): string {
  return `${EXERCISE_IMAGES_PATH}/master/${normalizedName}.png`;
}

/**
 * Upload a base64 image to Firebase Storage.
 *
 * @param base64Data - Base64 encoded image data (without data URL prefix)
 * @param storagePath - Path in Firebase Storage
 * @returns Download URL for the uploaded image
 */
export async function uploadBase64Image(
  base64Data: string,
  storagePath: string
): Promise<string> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, storagePath);

  // Ensure we have clean base64 data without data URL prefix
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

  // Upload as base64 string
  await uploadString(storageRef, cleanBase64, "base64", {
    contentType: "image/png",
    cacheControl: "public, max-age=31536000", // Cache for 1 year
  });

  // Get and return the download URL
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

/**
 * Delete an image from Firebase Storage.
 *
 * @param storagePath - Path to the image in Firebase Storage
 */
export async function deleteImage(storagePath: string): Promise<void> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, storagePath);

  try {
    await deleteObject(storageRef);
  } catch (error) {
    // Ignore "object not found" errors
    const errorCode = (error as { code?: string })?.code;
    if (errorCode !== "storage/object-not-found") {
      throw error;
    }
  }
}

/**
 * Get the download URL for an existing image.
 *
 * @param storagePath - Path to the image in Firebase Storage
 * @returns Download URL or null if not found
 */
export async function getImageUrl(storagePath: string): Promise<string | null> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, storagePath);

  try {
    return await getDownloadURL(storageRef);
  } catch (error) {
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "storage/object-not-found") {
      return null;
    }
    throw error;
  }
}

export const ImageStorageService = {
  generateStoragePath,
  generateMasterImagePath,
  uploadBase64Image,
  deleteImage,
  getImageUrl,
};
