"use client";

import { useState, useCallback } from "react";
import { Dumbbell, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutHistoryCard } from "./WorkoutHistoryCard";
import { WorkoutHistoryFilters } from "./WorkoutHistoryFilters";
import { WorkoutStatsBar } from "./WorkoutStatsBar";
import { CompletionModal } from "./CompletionModal";
import { useWorkoutHistory, useWorkoutStats } from "@/hooks/useWorkoutHistory";
import type { WorkoutHistoryFilters as FilterType } from "@/services/history";
import type { TrainerWorkout } from "@/types/firestore";

interface WorkoutHistoryListProps {
  showStats?: boolean;
  showFilters?: boolean;
  initialFilters?: FilterType;
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Dumbbell className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No workouts yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Generate your first AI-powered workout to get started on your fitness
        journey.
      </p>
      <Button asChild>
        <Link href="/generate">
          <Plus className="w-4 h-4 mr-2" />
          Generate Workout
        </Link>
      </Button>
    </div>
  );
}

function FilteredEmptyState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Dumbbell className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No matching workouts</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Try adjusting your filters to see more workouts.
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkoutHistoryList({
  showStats = true,
  showFilters = true,
  initialFilters = {},
}: WorkoutHistoryListProps) {
  const [filters, setFilters] = useState<FilterType>({
    status: "all",
    focus: "all",
    duration: "all",
    dateRange: "all",
    sort: "newest",
    ...initialFilters,
  });

  const [workoutToComplete, setWorkoutToComplete] =
    useState<TrainerWorkout | null>(null);

  const {
    workouts,
    loading,
    error,
    hasMore,
    loadMore,
    deleteWorkout,
    repeatWorkout,
  } = useWorkoutHistory(filters);

  const { stats, loading: statsLoading } = useWorkoutStats();

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: "all",
      focus: "all",
      duration: "all",
      dateRange: "all",
      sort: "newest",
    });
  }, []);

  const hasActiveFilters =
    (filters.status && filters.status !== "all") ||
    (filters.focus && filters.focus !== "all") ||
    (filters.duration && filters.duration !== "all") ||
    (filters.dateRange && filters.dateRange !== "all");

  // Error state
  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-medium mb-2">
          Failed to load workout history
        </p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      {showStats && <WorkoutStatsBar stats={stats} loading={statsLoading} />}

      {/* Filters Section */}
      {showFilters && (
        <WorkoutHistoryFilters filters={filters} onFiltersChange={setFilters} />
      )}

      {/* Loading State */}
      {loading && <LoadingGrid />}

      {/* Empty States */}
      {!loading && workouts.length === 0 && !hasActiveFilters && <EmptyState />}

      {!loading && workouts.length === 0 && hasActiveFilters && (
        <FilteredEmptyState onClearFilters={handleClearFilters} />
      )}

      {/* Workout Grid */}
      {!loading && workouts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workouts.map((workout) => (
              <WorkoutHistoryCard
                key={workout.id}
                workout={workout}
                onRepeat={repeatWorkout}
                onDelete={deleteWorkout}
                onMarkComplete={setWorkoutToComplete}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Completion Modal */}
      <CompletionModal
        workout={workoutToComplete}
        open={!!workoutToComplete}
        onOpenChange={(open) => !open && setWorkoutToComplete(null)}
      />
    </div>
  );
}
