"use client";

import { Flame, Calendar, Clock, Zap, TrendingUp, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkoutStats } from "@/services/history";

interface WorkoutStatsBarProps {
  stats: WorkoutStats | null;
  loading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, subtext, highlight }: StatCardProps) {
  return (
    <Card
      className={`${
        highlight
          ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
          : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              highlight
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
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

function StatCardSkeleton() {
  return (
    <Card>
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
  );
}

export function WorkoutStatsBar({ stats, loading }: WorkoutStatsBarProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatCalories = (calories: number): string => {
    if (calories >= 1000) {
      return `${(calories / 1000).toFixed(1)}k`;
    }
    return calories.toString();
  };

  return (
    <div className="space-y-4">
      {/* Streak Banner - shown when there's an active streak */}
      {stats.currentStreak > 0 && (
        <Card className="bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-yellow-500/20 border-orange-500/30">
          <CardContent className="py-4 px-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {stats.currentStreak} Day Streak!
                  {stats.currentStreak >= 7 && (
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {stats.currentStreak >= stats.longestStreak
                    ? "You're at your best streak!"
                    : `${stats.longestStreak - stats.currentStreak} more days to beat your record`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="This Week"
          value={stats.workoutsThisWeek}
          subtext="workouts"
          highlight={stats.workoutsThisWeek >= 3}
        />

        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Workouts"
          value={stats.totalWorkouts}
          subtext={`${stats.completedWorkouts} completed`}
        />

        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Current Streak"
          value={stats.currentStreak}
          subtext="days"
          highlight={stats.currentStreak > 0}
        />

        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Best Streak"
          value={stats.longestStreak}
          subtext="days"
        />

        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Total Time"
          value={formatMinutes(stats.totalMinutes)}
          subtext="training"
        />

        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Calories Burned"
          value={formatCalories(stats.totalCalories)}
          subtext="estimated"
        />
      </div>
    </div>
  );
}

/**
 * Compact version for dashboard widget
 */
export function WorkoutStatsCompact({ stats, loading }: WorkoutStatsBarProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {stats.currentStreak > 0 && (
        <span className="flex items-center gap-1 text-orange-500 font-medium">
          <Flame className="w-4 h-4" />
          {stats.currentStreak} day streak
        </span>
      )}
      <span className="flex items-center gap-1">
        <Calendar className="w-4 h-4" />
        {stats.workoutsThisWeek} this week
      </span>
      <span className="flex items-center gap-1">
        <TrendingUp className="w-4 h-4" />
        {stats.completedWorkouts} completed
      </span>
    </div>
  );
}
