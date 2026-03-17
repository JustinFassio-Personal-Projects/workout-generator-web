"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/auth";
import { getUserImagePreference } from "@/services/image/UserImagePreferenceService";

/**
 * Hook to get the image URL for an exercise, checking user preferences first.
 *
 * @param exerciseName - The exercise name
 * @param defaultImageUrl - The default image URL from the workout document
 * @returns The image URL (user preference if set, otherwise default)
 */
export function useExerciseImage(
  exerciseName: string,
  defaultImageUrl?: string | null
): string | null {
  const { user } = useUser();
  const [preferredImageUrl, setPreferredImageUrl] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPreference = useCallback(async () => {
    if (!user || !exerciseName) {
      setIsLoading(false);
      setPreferredImageUrl(null);
      return;
    }

    setIsLoading(true);
    // Reset to null before loading to prevent showing stale preference from previous exercise
    setPreferredImageUrl(null);
    try {
      const preference = await getUserImagePreference(user.uid, exerciseName);
      setPreferredImageUrl(preference);
    } catch (error) {
      console.error("Failed to load image preference:", error);
      setPreferredImageUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, exerciseName]);

  useEffect(() => {
    loadPreference();
  }, [loadPreference, refreshKey]);

  // Listen for custom events to refresh when preference is updated (same-tab updates)
  useEffect(() => {
    const handlePreferenceUpdate = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener(
      "exercise-image-preference-updated",
      handlePreferenceUpdate
    );

    return () => {
      window.removeEventListener(
        "exercise-image-preference-updated",
        handlePreferenceUpdate
      );
    };
  }, []);

  // Return user preference if set, otherwise fall back to default
  // During loading, always show default to avoid showing stale preference from previous exercise
  if (isLoading) {
    return defaultImageUrl || null;
  }

  return preferredImageUrl || defaultImageUrl || null;
}
