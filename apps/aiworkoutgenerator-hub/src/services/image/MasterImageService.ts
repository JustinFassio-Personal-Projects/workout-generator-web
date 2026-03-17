/**
 * Master Image Service for admin-curated exercise images.
 *
 * Provides functions for managing the master_exercise_images collection,
 * including marking images as master, updating quality scores, and
 * retrieving images for reuse.
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getDbInstance } from "@/lib/firestore";
import { normalizeExerciseName } from "@/lib/image-generation-config";
import { deleteImage } from "./ImageStorageService";
import type { MasterExerciseImage } from "@/types/firestore";

const COLLECTION_NAME = "master_exercise_images";

/**
 * Get a master image by exercise name.
 *
 * @param exerciseName - The exercise name to look up
 * @returns The master image document or null if not found
 */
export async function getMasterImage(
  exerciseName: string
): Promise<MasterExerciseImage | null> {
  const normalizedName = normalizeExerciseName(exerciseName);
  const db = getDbInstance();
  const docRef = doc(db, COLLECTION_NAME, normalizedName);

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
 * List all master images, optionally filtered and sorted.
 *
 * @param options - Query options
 * @returns Array of master image documents
 */
export async function listMasterImages(options?: {
  limitCount?: number;
  sortBy?: "exercise_name" | "created_at" | "quality_score";
  hasQualityScore?: boolean;
}): Promise<MasterExerciseImage[]> {
  const db = getDbInstance();
  const collectionRef = collection(db, COLLECTION_NAME);

  // Build query constraints
  const constraints: QueryConstraint[] = [];
  const sortField = options?.sortBy ?? "created_at";
  const filterByQualityScore = options?.hasQualityScore;

  // Filter by quality score presence if specified
  // Note: Firestore doesn't support != null queries directly, so we filter:
  // - hasQualityScore: true → quality_score >= 1 (assuming 1-5 scale)
  // - hasQualityScore: false → quality_score == null
  if (filterByQualityScore === true) {
    constraints.push(where("quality_score", ">=", 1));
    // Firestore requires the inequality field to be the first orderBy
    constraints.push(orderBy("quality_score", "desc"));
    // Add secondary sort if different from quality_score
    if (sortField !== "quality_score") {
      constraints.push(orderBy(sortField, "desc"));
    }
  } else if (filterByQualityScore === false) {
    constraints.push(where("quality_score", "==", null));
    constraints.push(orderBy(sortField, "desc"));
  } else {
    // No quality score filter, just sort
    constraints.push(orderBy(sortField, "desc"));
  }

  // Apply limit if specified
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  // Build query with all constraints in a single call
  const q = query(collectionRef, ...constraints);

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as MasterExerciseImage
    );
  } catch (error) {
    console.error("Error listing master images:", error);
    return [];
  }
}

/**
 * Mark an image as a master image for future reuse.
 *
 * @param exerciseName - The original exercise name
 * @param imageUrl - The Firebase Storage URL of the image
 * @param storagePath - The storage path for deletion
 * @param promptUsed - The prompt that generated this image
 * @param adminUserId - The admin user ID performing this action
 */
export async function markAsMasterImage(
  exerciseName: string,
  imageUrl: string,
  storagePath: string,
  promptUsed: string,
  adminUserId: string
): Promise<void> {
  const normalizedName = normalizeExerciseName(exerciseName);
  const db = getDbInstance();
  const docRef = doc(db, COLLECTION_NAME, normalizedName);

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

/**
 * Update the quality score for a master image.
 *
 * @param exerciseName - The exercise name
 * @param qualityScore - Quality score 1-5
 * @param adminUserId - The admin user ID performing this action
 */
export async function updateQualityScore(
  exerciseName: string,
  qualityScore: number,
  adminUserId: string
): Promise<void> {
  if (qualityScore < 1 || qualityScore > 5) {
    throw new Error("Quality score must be between 1 and 5");
  }

  const normalizedName = normalizeExerciseName(exerciseName);
  const db = getDbInstance();
  const docRef = doc(db, COLLECTION_NAME, normalizedName);

  await updateDoc(docRef, {
    quality_score: qualityScore,
    rated_by: adminUserId,
    updated_at: serverTimestamp(),
  });
}

/**
 * Replace a master image with a new one.
 * This will delete the old image from storage and update the document.
 *
 * @param exerciseName - The exercise name
 * @param newImageUrl - The new Firebase Storage URL
 * @param newStoragePath - The new storage path
 * @param newPromptUsed - The prompt used to generate the new image
 * @param adminUserId - The admin user ID performing this action
 */
export async function replaceMasterImage(
  exerciseName: string,
  newImageUrl: string,
  newStoragePath: string,
  newPromptUsed: string,
  adminUserId: string
): Promise<void> {
  const normalizedName = normalizeExerciseName(exerciseName);
  const db = getDbInstance();
  const docRef = doc(db, COLLECTION_NAME, normalizedName);

  // Get the existing document to find old storage path
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    const oldStoragePath = existingDoc.data()?.storage_path;
    if (oldStoragePath) {
      // Delete old image from storage
      try {
        await deleteImage(oldStoragePath);
      } catch (error) {
        console.warn("Failed to delete old master image:", error);
      }
    }
  }

  // Update with new image
  await setDoc(
    docRef,
    {
      exercise_name: exerciseName,
      image_url: newImageUrl,
      storage_path: newStoragePath,
      prompt_used: newPromptUsed,
      quality_score: null, // Reset quality score for new image
      marked_master_at: serverTimestamp(),
      marked_by: adminUserId,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Delete a master image.
 *
 * @param exerciseName - The exercise name
 * @param deleteFromStorage - Whether to also delete from Firebase Storage
 */
export async function deleteMasterImage(
  exerciseName: string,
  deleteFromStorage: boolean = true
): Promise<void> {
  const normalizedName = normalizeExerciseName(exerciseName);
  const db = getDbInstance();
  const docRef = doc(db, COLLECTION_NAME, normalizedName);

  if (deleteFromStorage) {
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      const storagePath = existingDoc.data()?.storage_path;
      if (storagePath) {
        try {
          await deleteImage(storagePath);
        } catch (error) {
          console.warn("Failed to delete master image from storage:", error);
        }
      }
    }
  }

  await deleteDoc(docRef);
}

/**
 * Get images pending review (recently marked as master without quality score).
 *
 * @param limitCount - Maximum number of images to return
 * @returns Array of master images pending review
 */
export async function getImagesPendingReview(
  limitCount: number = 50
): Promise<MasterExerciseImage[]> {
  const db = getDbInstance();
  const collectionRef = collection(db, COLLECTION_NAME);

  const q = query(
    collectionRef,
    where("quality_score", "==", null),
    orderBy("marked_master_at", "desc"),
    limit(limitCount)
  );

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as MasterExerciseImage
    );
  } catch (error) {
    console.error("Error fetching pending review images:", error);
    return [];
  }
}

/**
 * Get statistics about the master image library.
 */
export async function getMasterImageStats(): Promise<{
  totalImages: number;
  reviewedImages: number;
  averageQualityScore: number | null;
}> {
  const db = getDbInstance();
  const collectionRef = collection(db, COLLECTION_NAME);

  try {
    const snapshot = await getDocs(collectionRef);
    const images = snapshot.docs.map((doc) => doc.data());

    const totalImages = images.length;
    const reviewedImages = images.filter(
      (img) => img.quality_score !== null
    ).length;

    const scores = images
      .map((img) => img.quality_score)
      .filter((score): score is number => score !== null);

    const averageQualityScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    return {
      totalImages,
      reviewedImages,
      averageQualityScore,
    };
  } catch (error) {
    console.error("Error fetching master image stats:", error);
    return {
      totalImages: 0,
      reviewedImages: 0,
      averageQualityScore: null,
    };
  }
}

export const MasterImageService = {
  getMasterImage,
  listMasterImages,
  markAsMasterImage,
  updateQualityScore,
  replaceMasterImage,
  deleteMasterImage,
  getImagesPendingReview,
  getMasterImageStats,
};
