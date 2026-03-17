/**
 * Local Storage Helpers for Phase A Data
 *
 * Handles storing and retrieving Phase A onboarding data
 * that persists across the auth flow.
 *
 * NOTE: We use localStorage instead of sessionStorage to ensure data
 * survives OAuth redirect flows (e.g., Google Sign-In with signInWithRedirect).
 * sessionStorage can be cleared during cross-origin OAuth redirects in some
 * browsers, particularly Safari with Intelligent Tracking Prevention (ITP).
 * The 24-hour expiration mechanism ensures data doesn't persist indefinitely.
 */

import type {
  WebsiteOnboardingData,
  StoredPhaseAData,
} from "@/types/websiteOnboarding";
import {
  PHASE_A_STORAGE_KEY,
  PHASE_A_EXPIRATION_MS,
} from "@/types/websiteOnboarding";

/**
 * Stores Phase A data in localStorage
 */
export function storePhaseAData(
  data: WebsiteOnboardingData,
  source: string
): void {
  if (typeof window === "undefined") return;

  const stored: StoredPhaseAData = {
    data,
    source,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(PHASE_A_STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("Failed to store Phase A data:", error);
  }
}

/**
 * Retrieves Phase A data from localStorage
 * Returns null if not found, expired, or invalid
 */
export function getPhaseAData(): StoredPhaseAData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(PHASE_A_STORAGE_KEY);
    if (!stored) return null;

    const parsed: StoredPhaseAData = JSON.parse(stored);

    // Check expiration (24 hours)
    if (Date.now() - parsed.timestamp > PHASE_A_EXPIRATION_MS) {
      clearPhaseAData();
      return null;
    }

    // Validate data structure - check all required fields
    // Note: equipment_access can be empty array for bodyweight-only workouts
    if (
      !parsed.data ||
      !parsed.data.fitness_level ||
      !parsed.data.current_activity_level ||
      !parsed.data.fitness_goals ||
      !parsed.data.equipment_access ||
      !Array.isArray(parsed.data.equipment_access) ||
      !parsed.data.preferred_units ||
      !parsed.data.preferred_units.weight ||
      !parsed.data.preferred_units.height
    ) {
      clearPhaseAData();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to retrieve Phase A data:", error);
    clearPhaseAData();
    return null;
  }
}

/**
 * Clears Phase A data from localStorage
 */
export function clearPhaseAData(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(PHASE_A_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear Phase A data:", error);
  }
}

/**
 * Checks if Phase A data exists and is valid
 */
export function hasPhaseAData(): boolean {
  return getPhaseAData() !== null;
}
