"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { onboardingAnalytics } from "@/lib/onboarding-analytics";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const hasTrackedStartRef = useRef(false);

  // Track onboarding start
  // Note: Time tracking for completion/abandonment is handled by useOnboardingWizard hook
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || completed) return;
    if (hasTrackedStartRef.current) return;

    onboardingAnalytics.trackStarted("main", user.uid, "signup");
    hasTrackedStartRef.current = true;
  }, [authLoading, profileLoading, user, completed]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    // Use router.replace to prevent navigating back to onboarding after completion
    // Onboarding is a one-time flow; if a user needs to edit their profile,
    // it should be done via a dedicated profile settings page.
    if (user && completed) router.replace("/");
  }, [authLoading, profileLoading, user, completed, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Set up your profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingWizard />
        </CardContent>
      </Card>
    </div>
  );
}
