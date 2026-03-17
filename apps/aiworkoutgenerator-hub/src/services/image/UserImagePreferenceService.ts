/**
 * User Image Preference Service
 *
 * Manages user-specific exercise image preferences that override default exact-match mapping.
 * Preferences are stored in user_exercise_image_preferences collection.
 */

import { doc, getDoc } from "firebase/firestore";
import { getDbInstance } from "@/lib/firestore";
import { getPreferenceDocId } from "@/lib/image-generation-config";
import type { UserExerciseImagePreference } from "@/types/firestore";

const COLLECTION_NAME = "user_exercise_image_preferences";

/**
 * Get user's image preference for an exercise.
 * Returns the selected image URL if a preference exists, null otherwise.
 *
 * @param userId - The user's Firebase Auth UID
 * @param exerciseName - The exercise name to look up
 * @returns Selected image URL or null if no preference exists
 */
export async function getUserImagePreference(
  userId: string,
  exerciseName: string
): Promise<string | null> {
  const db = getDbInstance();
  const docId = getPreferenceDocId(userId, exerciseName);
  const preferenceRef = doc(db, COLLECTION_NAME, docId);

  try {
    const snapshot = await getDoc(preferenceRef);
    if (!snapshot.exists()) {
      return null;
    }

    // Type-safe access: snapshot.data() doesn't include id, but we only need selectedImageUrl
    const data = snapshot.data();
    return (data?.selectedImageUrl as string | undefined) || null;
  } catch (error) {
    console.error(
      `Error fetching image preference for exercise "${exerciseName}":`,
      error
    );
    return null;
  }
}

// Note: saveUserImagePreference and clearUserImagePreference are not exported
// because the frontend uses API routes (/api/images/preferences) with Admin SDK
// for write operations. This ensures proper authentication, validation, and
// security rule enforcement. Only getUserImagePreference is used client-side
// for read operations, which is safe with Firestore security rules.
