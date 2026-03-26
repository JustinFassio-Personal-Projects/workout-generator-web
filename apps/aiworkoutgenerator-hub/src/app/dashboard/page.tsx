"use client";

import Link from "next/link";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Home, Check, Clock, ChevronRight, Dumbbell } from "lucide-react";

import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useRecentWorkouts, useWorkoutStats } from "@/hooks/useWorkoutHistory";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutStatsCompact } from "@/components/history";
import { PRICING_TIERS } from "@/lib/pricing-tiers";
import { AppLogo } from "@/components/app";
import { BoardSection } from "@/components/board/BoardSection";
import { BoardBanner } from "@/components/board/BoardBanner";
import { useBoard } from "@/hooks/useBoard";
import { CertificationMessagesAlert } from "@/components/certification";
import { PurchaseReturnAnalytics } from "@/components/dashboard/PurchaseReturnAnalytics";

function formatDate(
  timestamp: {
    toDate?: () => Date;
    seconds?: number;
    toMillis?: () => number;
  } | null
): string {
  if (!timestamp) return "";

  // Handle Firestore Timestamp objects (from direct Firestore queries)
  let date: Date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (typeof timestamp.toMillis === "function") {
    date = new Date(timestamp.toMillis());
  } else if (typeof timestamp.seconds === "number") {
    // Handle serialized Timestamp objects (from API responses)
    date = new Date(timestamp.seconds * 1000);
  } else {
    // Fallback: try to use as Date directly
    date = timestamp as unknown as Date;
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get the button label for a given tier ID
 */
function getTierButtonLabel(tierId: string): string {
  switch (tierId) {
    case "basic":
      return "Upgrade to Basic";
    case "pro":
      return "Upgrade to Pro";
    case "elite":
      return "Go Elite";
    case "coach":
      return "Work with a Coach";
    case "coach_pro":
      return "Upgrade to Coach Pro";
    default:
      return "Upgrade";
  }
}

function RecentWorkoutsCard() {
  const { workouts, loading, error } = useRecentWorkouts(3);
  const { stats, loading: statsLoading } = useWorkoutStats();

  if (error) {
    return null; // Silently fail on dashboard
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Workouts</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history" className="text-sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
        {/* Stats compact view */}
        <WorkoutStatsCompact stats={stats} loading={statsLoading} />
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
              <Dumbbell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              No workouts yet. Generate your first one!
            </p>
            <Button size="sm" asChild>
              <Link href="/generate">Generate Workout</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {workouts.map((workout) => (
              <Link
                key={workout.id}
                href={`/workouts?id=${encodeURIComponent(workout.id)}&from=dashboard`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {workout.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {workout.totalDuration || workout.duration_minutes} min
                    </span>
                    <span>•</span>
                    <span>{formatDate(workout.created_at)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {workout.completed ? (
                    <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const { tier } = useSubscription();
  const { bundle, loading: boardLoading, error: boardError } = useBoard();
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
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || !completed) return null;

  const tierOrder = [
    "free",
    "basic",
    "pro",
    "elite",
    "coach",
    "coach_pro",
  ] as const;
  const currentIndex = tierOrder.indexOf(tier ?? "free");
  const upgradeOptions = PRICING_TIERS.filter((t) => {
    const idx = tierOrder.indexOf(t.id);
    return idx > currentIndex;
  });

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <Suspense fallback={null}>
        <PurchaseReturnAnalytics />
      </Suspense>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back{user.displayName ? `, ${user.displayName}` : ""}.
              Pick up where you left off.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="icon" asChild>
              <Link href="/" aria-label="Go to Home">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
            <AppLogo href="/dashboard" size={32} />
          </div>
        </div>

        {/* Board Banner */}
        {bundle?.banner && <BoardBanner post={bundle.banner} />}

        {/* Board Section */}
        <BoardSection
          bundle={bundle}
          loading={boardLoading}
          error={boardError}
        />

        {/* Certification Messages Alert */}
        <CertificationMessagesAlert />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily Check-In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Update today&apos;s context so your workout matches how you
                feel.
              </p>
              <Button asChild>
                <Link href="/daily-checkin">Open Daily Check-In</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Workout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Generate a new workout using your profile and daily state.
              </p>
              <Button asChild>
                <Link href="/generate">Generate Workout</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Session Reports Card - Left Column */}
          <Card>
            <CardHeader>
              <CardTitle>Session Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                View detailed reports of your completed workout sessions.
              </p>
              <Button asChild>
                <Link href="/summaries">Open Reports</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Equipment Locker Card - Right Column */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Locker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Manage your available equipment and categories for personalized
                workouts.
              </p>
              <Button asChild>
                <Link href="/equipment">Manage Equipment</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Keep your preferences and metrics up to date for better results.
              </p>
              <Button variant="outline" asChild>
                <Link href="/profile">Edit Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Workouts Section */}
        <RecentWorkoutsCard />

        {upgradeOptions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Upgrade your plan</h2>
                <p className="text-muted-foreground">
                  Unlock more workouts and premium features.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/pricing">View all plans</Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {upgradeOptions.map((option) => (
                <Card key={option.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{option.name}</span>
                      <span className="text-xl font-bold">
                        ${option.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /mo
                        </span>
                      </span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1">
                    <ul className="space-y-2">
                      {option.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="px-6 pb-6">
                    <Button asChild className="w-full">
                      <Link href={`/pricing#tier-${option.id}`}>
                        {getTierButtonLabel(option.id)}
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
