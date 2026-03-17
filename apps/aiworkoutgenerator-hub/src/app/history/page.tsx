"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Home } from "lucide-react";

import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { AppLogo } from "@/components/app";
import { Button } from "@/components/ui/button";
import { WorkoutHistoryList } from "@/components/history";

export default function HistoryPage() {
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl px-4">
        <div className="text-center text-muted-foreground animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!user || !completed) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="sm:hidden">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Workout History</h1>
          </div>
          <p className="text-muted-foreground">
            Track your progress and revisit past workouts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="hidden sm:flex"
          >
            <Link href="/dashboard" aria-label="Go to Dashboard">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/generate">
              <Plus className="h-4 w-4 mr-2" />
              New Workout
            </Link>
          </Button>
          <AppLogo href="/dashboard" size={32} />
        </div>
      </div>

      {/* Main Content */}
      <WorkoutHistoryList showStats showFilters />

      {/* Mobile FAB for generating new workout */}
      <div className="fixed bottom-6 right-6 sm:hidden z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg h-14 w-14 p-0"
          asChild
        >
          <Link href="/generate">
            <Plus className="h-6 w-6" />
            <span className="sr-only">Generate New Workout</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
