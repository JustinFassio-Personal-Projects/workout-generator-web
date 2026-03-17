/**
 * Public sharing configuration and URL helpers.
 *
 * This module handles the domain configuration for public sharing.
 * The app (aiworkoutgen.app) is for authenticated users, while
 * public share links point to the marketing site (aiworkoutgenerator.com).
 *
 * In development, share links use the current app domain for testing.
 * In production, set NEXT_PUBLIC_PUBLIC_SHARE_DOMAIN to the marketing site URL.
 */

/**
 * The internal app domain (authenticated, write-access)
 */
export const APP_DOMAIN = "https://aiworkoutgen.app";

/**
 * Get the public domain for sharing.
 * Called at runtime to ensure correct domain based on current environment.
 *
 * - In development (localhost), uses the current origin for testing
 * - In production, uses NEXT_PUBLIC_PUBLIC_SHARE_DOMAIN or falls back to marketing site
 */
export function getPublicDomain(): string {
  // If environment variable is set, use it
  if (process.env.NEXT_PUBLIC_PUBLIC_SHARE_DOMAIN) {
    return process.env.NEXT_PUBLIC_PUBLIC_SHARE_DOMAIN;
  }

  // In browser, check if we're on localhost for development
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return origin; // Use current origin for local testing
    }
    // For aiworkoutgen.app, use current origin (same app has public routes)
    if (hostname.includes("aiworkoutgen.app")) {
      return origin;
    }
  }

  // Default to marketing site for production
  return "https://aiworkoutgenerator.com";
}

/**
 * The public marketing site domain (read-only, for sharing)
 * @deprecated Use getPublicDomain() for dynamic domain resolution
 */
export const PUBLIC_DOMAIN = "https://aiworkoutgenerator.com";

/**
 * Generate a public URL for a workout.
 * This URL points to the marketing site or current app in development.
 *
 * @param workoutId - The Firestore document ID of the workout
 * @returns Public URL for the workout
 */
export function getPublicWorkoutUrl(workoutId: string): string {
  return `${getPublicDomain()}/workout/${workoutId}`;
}

/**
 * Generate a public URL for a workout summary/session report.
 * This URL points to the marketing site or current app in development.
 *
 * @param summaryId - The Firestore document ID of the summary
 * @returns Public URL for the summary
 */
export function getPublicSummaryUrl(summaryId: string): string {
  return `${getPublicDomain()}/summary/${summaryId}`;
}

/**
 * Generate a public profile URL for a user.
 * This URL points to the marketing site, not the app.
 *
 * Note: This is for future use when public profiles are implemented.
 *
 * @param username - The user's username or user ID
 * @returns Public URL for the user profile
 */
export function getPublicProfileUrl(username: string): string {
  return `${getPublicDomain()}/u/${username}`;
}

/**
 * Generate a shareable URL based on what content is being shared.
 *
 * @param options - Share options
 * @returns The appropriate public URL
 */
export function getShareUrl(options: {
  summaryId: string;
  workoutId?: string;
  includeWorkout?: boolean;
}): string {
  // Always link to the summary page since it can show both summary and workout context
  return getPublicSummaryUrl(options.summaryId);
}
