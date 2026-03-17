"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { hasPhaseAData } from "@/lib/phaseAStorage";
import { PhaseBWizard } from "@/components/onboarding/PhaseBWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { onboardingAnalytics } from "@/lib/onboarding-analytics";

/**
 * Continue Onboarding Page (Phase B)
 *
 * This page renders the Phase B wizard for users coming from the website.
 * It requires:
 * 1. User to be authenticated
 * 2. Phase A data to be present in localStorage
 *
 * If Phase A data is missing, redirects to standard onboarding.
 * If user has already completed onboarding, redirects to dashboard.
 */
export default function ContinueOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const hasTrackedStartRef = useRef(false);

  // Check for Phase A data (client-side only, computed once on mount).
  // This intentionally runs only once because:
  // 1. Phase A data is stored BEFORE the user reaches this page (in /signup)
  // 2. The user is redirected here immediately after authentication
  // 3. There's no practical scenario where Phase A data appears after mount
  //
  // If no Phase A data exists on mount, the user is redirected to /onboarding.
  // We don't need to react to localStorage changes from other tabs/extensions
  // as this would be an abnormal flow.
  const hasPhaseA = useMemo(() => {
    if (typeof window === "undefined") return null;
    return hasPhaseAData();
  }, []);

  // Track onboarding start
  // Note: Time tracking for completion/abandonment is handled by usePhaseBWizard hook
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || completed || hasPhaseA === false || hasPhaseA === null) return;
    if (hasTrackedStartRef.current) return;

    onboardingAnalytics.trackStarted("continue", user.uid, "website_builder");
    hasTrackedStartRef.current = true;
  }, [authLoading, profileLoading, user, completed, hasPhaseA]);

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (user && completed) {
      router.replace("/dashboard");
    }
  }, [authLoading, profileLoading, user, completed, router]);

  // Redirect to standard onboarding if no Phase A data
  useEffect(() => {
    // Only check after we know hasPhaseA has been computed (not null)
    if (hasPhaseA === false) {
      router.replace("/onboarding");
    }
  }, [hasPhaseA, router]);

  // Loading state
  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  // Don't render if redirecting
  if (!user || completed || hasPhaseA === false || hasPhaseA === null) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Complete Your Profile
          </CardTitle>
          <p className="text-muted-foreground">
            Just a few more details to personalize your workouts.
          </p>
        </CardHeader>
        <CardContent>
          <PhaseBWizard />
        </CardContent>
      </Card>
    </div>
  );
}
