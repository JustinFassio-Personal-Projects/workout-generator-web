import type { User } from "firebase/auth";
import { maskIdentifier } from "@/lib/utils";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

/**
 * Ensure a user document exists in the `users` collection.
 * This is a backup/fallback mechanism if the Cloud Function `onUserCreated` fails.
 *
 * Uses an API route with Admin SDK to bypass Firestore security rules,
 * which is necessary in the emulator where auth context propagation can be delayed.
 *
 * Uses authenticatedFetch for Bearer + App Check headers and 401 retry with token refresh.
 *
 * @param user - Firebase Auth user object
 * @returns Promise that resolves when the operation completes (or fails silently)
 */
export async function ensureUserDocument(user: User): Promise<void> {
  try {
    // authenticatedFetch uses auth.currentUser; at this point it should match the passed user
    const response = await authenticatedFetch("/api/users/ensure", {
      method: "POST",
      body: JSON.stringify({}),
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
