import type { User } from "firebase/auth";
import { maskIdentifier } from "@/lib/utils";

/**
 * Ensure a user document exists in the `users` collection.
 * This is a backup/fallback mechanism if the Cloud Function `onUserCreated` fails.
 *
 * Uses an API route with Admin SDK to bypass Firestore security rules,
 * which is necessary in the emulator where auth context propagation can be delayed.
 *
 * @param user - Firebase Auth user object
 * @returns Promise that resolves when the operation completes (or fails silently)
 */
export async function ensureUserDocument(user: User): Promise<void> {
  try {
    // Get ID token for API authentication
    const idToken = await user.getIdToken(true);
    if (!idToken) {
      console.warn(
        `⚠️ Could not get ID token for user ${maskIdentifier(user.uid)}, skipping user document creation`
      );
      return;
    }

    // Call API route that uses Admin SDK (bypasses security rules)
    const response = await fetch("/api/users/ensure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    // Success - document ensured (no logging to reduce noise)
    // Response body is consumed but not needed
    await response.json();
  } catch (error) {
    // Non-blocking: log error but don't throw
    // Failures here shouldn't break authentication
    console.warn(
      `⚠️ Failed to ensure users document for user ${maskIdentifier(user.uid)} (non-critical):`,
      error
    );
  }
}
