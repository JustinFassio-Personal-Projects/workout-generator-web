"use client";

import { useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { parseSignupParams, hasSignupParams } from "@/lib/parseSignupParams";
import {
  storePhaseAData,
  hasPhaseAData,
  getPhaseAData,
} from "@/lib/phaseAStorage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

/**
 * Inner component that uses searchParams
 */
function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const hasProcessedParams = useRef(false);

  // Parse and store URL params on mount (side effect only, no state update)
  useEffect(() => {
    if (hasProcessedParams.current) return;

    if (hasSignupParams(searchParams)) {
      const parsed = parseSignupParams(searchParams);
      if (parsed) {
        storePhaseAData(parsed.data, parsed.source);
        hasProcessedParams.current = true;
      }
    }
  }, [searchParams]);

  // Compute display data from storage (no state needed)
  const phaseAInfo = useMemo(() => {
    // First check URL params
    if (hasSignupParams(searchParams)) {
      const parsed = parseSignupParams(searchParams);
      if (parsed) {
        return {
          hasData: true,
          goals: parsed.data.fitness_goals,
        };
      }
    }
    // Fall back to stored data
    const stored = getPhaseAData();
    if (stored) {
      return {
        hasData: true,
        goals: stored.data.fitness_goals,
      };
    }
    return { hasData: false, goals: [] as string[] };
  }, [searchParams]);

  // If user is already authenticated and has Phase A data, redirect to continue
  useEffect(() => {
    if (!authLoading && user && hasPhaseAData()) {
      router.push("/onboarding/continue");
    } else if (!authLoading && user) {
      // User is authenticated but no Phase A data - redirect to standard flow
      router.push("/onboarding");
    }
  }, [authLoading, user, router]);

  // NOTE: We intentionally allow direct access to /signup without Phase A data.
  // This page serves two purposes:
  // 1. Landing page for users from website with Phase A data (shows summary banner)
  // 2. Direct signup for users who navigate here manually (shows just auth form)
  // This avoids a redirect loop with /login?mode=signup and provides a seamless
  // signup experience regardless of how the user arrived.

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-center">
            Sign up to generate your personalized workout plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phase A Summary Banner */}
          {phaseAInfo.hasData && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Your workout preferences are saved!
                  </p>
                  {phaseAInfo.goals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {phaseAInfo.goals.map((goal) => (
                        <Badge
                          key={goal}
                          variant="secondary"
                          className="text-xs"
                        >
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Create an account to complete your profile and generate your
                    first workout.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Suspense fallback={<div className="h-96" />}>
            <AuthForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Signup page that handles URL parameters from website handoff
 *
 * This page:
 * 1. Parses URL params from the website's Workout Plan Builder
 * 2. Stores Phase A data in sessionStorage
 * 3. Shows the auth form
 * 4. After auth, redirects to /onboarding/continue for Phase B
 */
export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
