"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { AppPageHeader } from "@/components/app";
import { DailyCheckInForm } from "@/components/daily-checkin/DailyCheckInForm";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

/**
 * Inner component that handles the first-time flow
 */
function DailyCheckInContent() {
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if this is a first-time signup flow
  const isFromSignup = searchParams.get("from") === "signup";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || !completed) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <AppPageHeader backHref="/dashboard" backLabel="Back to Dashboard" />
      <div className="space-y-6">
        {/* Welcome message for first-time users from signup */}
        {isFromSignup && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-primary">
                    Welcome! Your profile is all set up.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete this quick check-in so we can personalize your
                    first AI-generated workout based on how you&apos;re feeling
                    today.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h1 className="text-3xl font-bold">
            {isFromSignup ? "Quick Check-In" : "Daily Check-In"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isFromSignup
              ? "Tell us how you're feeling today to get a personalized workout."
              : "Share today's context to generate a workout that matches how you feel."}
          </p>
        </div>

        <DailyCheckInForm />
      </div>
    </div>
  );
}

/**
 * Daily Check-In Page
 *
 * Handles both regular daily check-ins and the first-time signup flow.
 * When accessed with ?from=signup, shows a welcome message and
 * customized copy for new users.
 */
export default function DailyCheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="text-center">Loading...</div>
        </div>
      }
    >
      <DailyCheckInContent />
    </Suspense>
  );
}
