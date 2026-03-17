"use client";

import {
  Clock,
  Flame,
  CheckCircle2,
  Dumbbell,
  CloudUpload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrainerWorkout } from "@/types/firestore";

interface WorkoutHeaderProps {
  workout: TrainerWorkout;
  isSaving: boolean;
  hasSaved: boolean;
  onSave: () => void;
}

export function WorkoutHeader({
  workout,
  isSaving,
  hasSaved,
  onSave,
}: WorkoutHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl p-6 mb-6 shadow-2xl border border-primary/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Dumbbell className="w-64 h-64 text-foreground transform rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-primary font-bold tracking-wider text-xs uppercase">
            AI Generated Plan • {workout.difficulty}
          </div>

          {/* Top Save Button */}
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant={hasSaved ? "outline" : "default"}
            className={`gap-2 ${hasSaved ? "border-primary/50 text-primary" : ""}`}
          >
            {isSaving
              ? "Saving..."
              : hasSaved
                ? "Update Saved"
                : "Save Workout"}
            {hasSaved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <CloudUpload className="w-4 h-4" />
            )}
          </Button>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4">
          {workout.title}
        </h1>
        <p className="text-muted-foreground text-lg mb-6 max-w-2xl">
          {workout.description}
        </p>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-background/50 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 border border-border">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-foreground font-bold">
              {workout.totalDuration} min
            </span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 border border-border">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-foreground font-bold">
              {workout.estimatedCalories} kcal
            </span>
          </div>
        </div>

        <div className="bg-background/30 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm uppercase mb-1">
                Trainer&apos;s Note
              </h4>
              <p className="text-muted-foreground text-sm italic">
                &quot;{workout.trainerNotes}&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
