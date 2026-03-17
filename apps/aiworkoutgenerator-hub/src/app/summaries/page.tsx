"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Home,
  Calendar,
  Clock,
  TrendingUp,
  Zap,
  FileText,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import { getPublicSummaryUrl } from "@/lib/share-config";
import type { WorkoutSummary, SummaryAnalytics } from "@/types/workoutSummary";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ summary }: { summary: WorkoutSummary }) {
  const [copied, setCopied] = useState(false);
  const completedDate = summary.completed_at.toDate();
  const totalSetsCompleted = summary.sections.reduce(
    (sum, section) =>
      sum +
      section.exercises.reduce((exSum, ex) => exSum + ex.setsCompleted, 0),
    0
  );

  const isPublic = summary.visibility === "public";
  const shareUrl = isPublic ? getPublicSummaryUrl(summary.id) : null;

  // Handle copy link to clipboard
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">
                {summary.title}
              </h3>
              <Badge
                variant={
                  summary.difficulty === "advanced"
                    ? "destructive"
                    : summary.difficulty === "intermediate"
                      ? "default"
                      : "secondary"
                }
                className="text-xs"
              >
                {summary.difficulty}
              </Badge>
              {isPublic && (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-300 bg-green-50"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  Shared
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {formatDate(completedDate)}
              {summary.focus && ` • ${summary.focus}`}
              {summary.trainer_name && ` • ${summary.trainer_name}`}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {summary.stats.totalTimeMinutes}m
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Zap className="w-4 h-4" />
                {totalSetsCompleted} sets
              </span>
              {summary.stats.strainScore !== null && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  Strain: {summary.stats.strainScore}
                </span>
              )}
              {summary.stats.completionPercentage !== null && (
                <span className="text-muted-foreground">
                  {summary.stats.completionPercentage}% complete
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPublic && shareUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Copy share link"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workouts/${summary.workout_id}/summary`}>
                View Report
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SummariesPage() {
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const router = useRouter();

  const [summaries, setSummaries] = useState<WorkoutSummary[]>([]);
  const [analytics, setAnalytics] = useState<SummaryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  const loadSummaries = useCallback(
    async (reset: boolean = false) => {
      if (!user?.uid) return;

      try {
        const result = await WorkoutSummaryService.getUserSummaries(user.uid, {
          pageSize: 20,
          lastDoc: reset ? undefined : lastDoc || undefined,
        });
        setSummaries((prev) =>
          reset ? result.summaries : [...prev, ...result.summaries]
        );
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Failed to load summaries:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.uid, lastDoc]
  );

  const loadAnalytics = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const analyticsData = await WorkoutSummaryService.getSummaryAnalytics(
        user.uid
      );
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid && !authLoading && completed) {
      setLoading(true);
      setSummaries([]);
      setLastDoc(null);
      // Use a fresh function call to avoid lastDoc dependency
      const loadInitial = async () => {
        if (!user?.uid) return;
        try {
          const result = await WorkoutSummaryService.getUserSummaries(
            user.uid,
            {
              pageSize: 20,
            }
          );
          setSummaries(result.summaries);
          setLastDoc(result.lastDoc);
          setHasMore(result.hasMore);
        } catch (error) {
          console.error("Failed to load summaries:", error);
        } finally {
          setLoading(false);
        }
      };
      Promise.all([loadInitial(), loadAnalytics()]);
    }
  }, [user?.uid, authLoading, completed, loadAnalytics]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadSummaries(false);
  }, [loadingMore, hasMore, loadSummaries]);

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
            <h1 className="text-3xl font-bold">Session Reports</h1>
          </div>
          <p className="text-muted-foreground">
            View detailed reports and analytics from your completed workouts
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
        </div>
      </div>

      {/* Analytics Section */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="Total Reports"
            value={analytics.totalSummaries}
            subtext="completed workouts"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Total Time"
            value={formatMinutes(analytics.totalTimeMinutes)}
            subtext="training"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Strain Score"
            value={
              analytics.averageStrainScore !== null
                ? analytics.averageStrainScore.toFixed(1)
                : "–"
            }
            subtext="difficulty"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Completion Rate"
            value={
              analytics.averageCompletionPercentage !== null
                ? `${analytics.averageCompletionPercentage.toFixed(0)}%`
                : "–"
            }
            subtext="average"
          />
        </div>
      ) : null}

      {/* Recent Activity */}
      {analytics &&
        (analytics.summariesThisWeek > 0 ||
          analytics.summariesThisMonth > 0) && (
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-full">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {analytics.summariesThisWeek} workout
                    {analytics.summariesThisWeek !== 1 ? "s" : ""} this week
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {analytics.summariesThisMonth} total this month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Summaries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete a workout to see your session reports here.
              </p>
              <Button asChild>
                <Link href="/generate">Generate Workout</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {summaries.map((summary) => (
              <SummaryCard key={summary.id} summary={summary} />
            ))}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
