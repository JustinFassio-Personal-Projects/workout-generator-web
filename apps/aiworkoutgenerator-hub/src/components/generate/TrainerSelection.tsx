"use client";

import React from "react";
import { Users } from "lucide-react";
import { TrainerCard } from "./TrainerCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Trainer, TrainerId } from "@/types/trainer";

interface TrainerSelectionProps {
  trainers: Trainer[];
  selectedTrainerId: TrainerId | null;
  recommendedTrainerId: TrainerId | null;
  loading: boolean;
  onSelect: (trainerId: TrainerId) => void;
}

export function TrainerSelection({
  trainers,
  selectedTrainerId,
  recommendedTrainerId,
  loading,
  onSelect,
}: TrainerSelectionProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Users className="w-5 h-5" />
          <span>Choose Your AI Trainer</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Each trainer specializes in different workout styles. Pick the one
          that matches your vibe today—you can switch anytime.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TrainerCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Users className="w-5 h-5" />
        <span>Choose Your AI Trainer</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Each trainer specializes in different workout styles. Pick the one that
        matches your vibe today—you can switch anytime.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainers.map((trainer) => (
          <TrainerCard
            key={trainer.id}
            trainer={trainer}
            isSelected={selectedTrainerId === trainer.id}
            isRecommended={recommendedTrainerId === trainer.id}
            onSelect={(id) => onSelect(id as TrainerId)}
          />
        ))}
      </div>
    </div>
  );
}

function TrainerCardSkeleton() {
  // Prefer a stable skeleton that matches the intended production layout.
  const hasBanner = true;

  return (
    <div className="flex flex-col rounded-xl border-2 border-border bg-card overflow-hidden">
      {/* Banner Skeleton */}
      {hasBanner && (
        <div className="relative h-56 sm:h-36 w-full bg-card">
          <Skeleton className="h-full w-full" />
        </div>
      )}

      {/* Content Section */}
      <div
        className={cn("relative flex flex-col", hasBanner ? "p-4 pt-0" : "p-5")}
      >
        {/* Profile portrait overlay row */}
        {hasBanner && (
          <div className="-mt-10 flex items-end gap-3 mb-3">
            <Skeleton className="h-20 w-16 rounded-md border border-border" />
            <div className="flex-1" />
          </div>
        )}

        {/* Avatar (only shown when no banner) */}
        {!hasBanner && <Skeleton className="w-16 h-16 rounded-full mb-3" />}

        {/* Name */}
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-24 mb-3" />

        {/* Tagline */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-3" />

        {/* Tags */}
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-8 rounded-full" />
        </div>

        {/* Stats */}
        <div className="flex gap-3 pt-2 border-t border-border/50">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
