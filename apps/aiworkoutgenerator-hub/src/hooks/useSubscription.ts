"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { useUser, getIdToken } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  WORKOUT_LIMITS,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/subscription-constants";
import { IMAGE_GENERATION_CONFIG } from "@/lib/image-generation-config";

// Re-export types for consumers of this hook
export type { SubscriptionTier, SubscriptionStatus };

// ============================================
// Types
// ============================================

type SubscriptionClaims = {
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
};

// ============================================
// Helper Functions
// ============================================

async function getClaims(user: User): Promise<SubscriptionClaims> {
  const tokenResult = await user.getIdTokenResult();
  const claims = tokenResult.claims as Record<string, unknown>;

  const subscription_tier = claims.subscription_tier as
    | SubscriptionTier
    | undefined;
  const subscription_status =
    (claims.subscription_status as SubscriptionStatus | undefined) ?? null;

  return { subscription_tier, subscription_status };
}

// ============================================
// Hook
// ============================================

export function useSubscription() {
  const { user, loading: authLoading } = useUser();
  const [claims, setClaims] = useState<SubscriptionClaims>({});
  const [loading, setLoading] = useState(true);
  // Tier-aware count of workouts used (monthly for basic/pro, lifetime for free)
  const [workoutsThisMonth, setWorkoutsThisMonth] = useState<number>(0);
  const [workoutsWithImagesThisMonth, setWorkoutsWithImagesThisMonth] =
    useState<number>(0);
  const [countLoading, setCountLoading] = useState(false);

  // Fetch claims on auth change
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (authLoading) return;
      if (!user) {
        setClaims({});
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const c = await getClaims(user);
        if (cancelled) return;
        setClaims(c);
      } catch (error) {
        // If claims aren't available yet (or token fetch fails), treat as non-subscriber.
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[useSubscription] Failed to fetch subscription claims:",
            error
          );
        }
        if (cancelled) return;
        setClaims({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Derived values
  const tier: SubscriptionTier = useMemo(() => {
    return claims.subscription_tier ?? "free";
  }, [claims.subscription_tier]);

  const status: SubscriptionStatus = useMemo(() => {
    return claims.subscription_status ?? null;
  }, [claims.subscription_status]);

  // Effective tier for counting: use free tier semantics when subscription is inactive
  const effectiveTierForCounting: SubscriptionTier = useMemo(() => {
    if (tier === "free") return "free";
    if (status === "active") return tier;
    // Inactive paid tier: use free tier semantics (lifetime counting)
    return "free";
  }, [tier, status]);

  const isSubscriber = useMemo(() => {
    // Default: show pricing until we positively know they have an active paid tier.
    if (!tier) return false;
    if (tier === "free") return false;
    return status === "active";
  }, [tier, status]);

  const workoutLimit = useMemo(() => {
    return WORKOUT_LIMITS[tier];
  }, [tier]);

  const canGenerate = useMemo(() => {
    // If status is not active for paid tiers, treat as free
    if (tier !== "free" && status !== "active") {
      return workoutsThisMonth < WORKOUT_LIMITS.free!;
    }

    // Check limit
    const limit = workoutLimit;
    if (limit === null) return true; // Unlimited
    return workoutsThisMonth < limit;
  }, [tier, status, workoutLimit, workoutsThisMonth]);

  const remainingWorkouts = useMemo(() => {
    // If status is not active for paid tiers, treat as free
    if (tier !== "free" && status !== "active") {
      return Math.max(0, WORKOUT_LIMITS.free! - workoutsThisMonth);
    }

    const limit = workoutLimit;
    if (limit === null) return null; // Unlimited
    return Math.max(0, limit - workoutsThisMonth);
  }, [tier, status, workoutLimit, workoutsThisMonth]);

  // Image generation limits
  const imageLimit = useMemo(() => {
    const limits = IMAGE_GENERATION_CONFIG.tierLimits;
    switch (tier) {
      case "elite":
        return limits.elite;
      case "pro":
        return limits.pro;
      default:
        return limits.free;
    }
  }, [tier]);

  const canGenerateImages = useMemo(() => {
    // If not an active subscriber on a paid tier, no images
    if (tier !== "free" && status !== "active") {
      return false;
    }

    // Check if tier allows images
    if (imageLimit === 0) return false;

    // Check usage
    return workoutsWithImagesThisMonth < imageLimit;
  }, [tier, status, imageLimit, workoutsWithImagesThisMonth]);

  const remainingWorkoutsWithImages = useMemo(() => {
    if (imageLimit === 0) return 0;
    return Math.max(0, imageLimit - workoutsWithImagesThisMonth);
  }, [imageLimit, workoutsWithImagesThisMonth]);

  // Refresh workout and image counts
  const refreshWorkoutCount = useCallback(async () => {
    if (!user) return;

    setCountLoading(true);
    try {
      // POST + JSON body carries _firebaseIdToken when App Hosting strips auth headers (GET has no body).
      const response = await authenticatedFetch("/api/users/workout-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: effectiveTierForCounting }),
        user,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // In emulator mode, handle connection errors gracefully
        if (errorData.emulator && response.status === 503) {
          console.warn(
            "Emulator connection error - workout counts unavailable. Ensure Firebase emulators are running."
          );
          // Set default values instead of failing
          setWorkoutsThisMonth(0);
          setWorkoutsWithImagesThisMonth(0);
          setCountLoading(false);
          return;
        }

        throw new Error(errorData.error || `API returned ${response.status}`);
      }

      const data = await response.json();
      setWorkoutsThisMonth(data.workoutCount || 0);
      setWorkoutsWithImagesThisMonth(data.imageCount || 0);
    } catch (error) {
      // Non-blocking: log error but don't throw
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // In development/emulator mode, log more details
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch workout/image counts:", error);
      } else {
        // In production, log all errors but downgrade network errors to warnings
        // ECONNREFUSED is emulator-specific and can be silently ignored in production
        if (errorMessage.includes("ECONNREFUSED")) {
          // Silently ignore emulator connection errors in production
        } else if (
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("fetch")
        ) {
          // Log network errors as warnings for monitoring (may be transient)
          console.warn(
            "Network issue while fetching workout/image counts:",
            errorMessage
          );
        } else {
          // Log other errors as errors (likely application issues)
          console.error("Failed to fetch workout/image counts:", errorMessage);
        }
      }

      // Set default values on error to prevent UI issues
      setWorkoutsThisMonth(0);
      setWorkoutsWithImagesThisMonth(0);
    } finally {
      setCountLoading(false);
    }
  }, [user, effectiveTierForCounting]);

  // Fetch workout count on mount and when user, tier, or status changes
  // Add a small delay to ensure auth is fully propagated to Firestore
  useEffect(() => {
    if (user && !authLoading) {
      // Delay to ensure auth token is propagated to Firestore in emulator
      const timeoutId = setTimeout(() => {
        refreshWorkoutCount();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [user, authLoading, effectiveTierForCounting, refreshWorkoutCount]);

  // Open customer portal
  const openCustomerPortal = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error("Not authenticated. Please sign in and try again.");
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error(
            "Authentication failed. Please sign out and sign in again."
          );
        }
        if (response.status === 404 || data.error?.includes("subscription")) {
          throw new Error(
            data.error ||
              "No active subscription found. Please subscribe first to manage your subscription."
          );
        }
        throw new Error(data.error || "Failed to open customer portal");
      }

      window.location.href = data.url;
    } catch (error) {
      // Re-throw with better error messages
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred while opening the portal");
    }
  }, []);

  return {
    // Loading states
    loading,
    countLoading,

    // Subscription info
    tier,
    status,
    isSubscriber,

    // Workout usage limits
    workoutLimit,
    workoutsThisMonth,
    limitPeriod:
      workoutLimit === null
        ? "unlimited"
        : effectiveTierForCounting === "free"
          ? "total"
          : "this month",
    canGenerate,
    remainingWorkouts,

    // Image generation limits
    imageLimit,
    workoutsWithImagesThisMonth,
    canGenerateImages,
    remainingWorkoutsWithImages,

    // Actions
    refreshWorkoutCount,
    openCustomerPortal,
  };
}
