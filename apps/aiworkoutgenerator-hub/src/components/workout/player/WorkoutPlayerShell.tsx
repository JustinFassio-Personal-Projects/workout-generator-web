"use client";

import { ArrowLeft, Clock, Flame, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TrainerWorkout } from "@/types/firestore";
import { Button } from "@/components/ui/button";
import { SafetyToggle } from "./SafetyToggle";
import { ConflictResolution } from "./ConflictResolution";

interface WorkoutPlayerShellProps {
  workout: TrainerWorkout;
  onSafetyToggle: (enabled: boolean) => void;
  /** When true, hides sticky header (back, title, safety, conflict) for focus mode. */
  hideTopChrome?: boolean;
  children: React.ReactNode;
}

/**
 * Shared shell for workout players (ManualWorkoutPlayer, future IntervalWorkoutPlayer).
 * Renders header, safety toggle, conflict resolution, and content slot.
 */
export function WorkoutPlayerShell({
  workout,
  onSafetyToggle,
  hideTopChrome = false,
  children,
}: WorkoutPlayerShellProps) {
  const router = useRouter();

  const totalDuration = workout.duration_minutes || 0;
  const totalCalories =
    workout.sections?.reduce(
      (acc, section) => acc + (section?.exercises?.length || 0) * 50,
      0
    ) || 0;

  const handleBack = () => {
    router.back();
  };

  const hasPersonalization =
    workout.personalization && workout.personalization.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background w-full px-4 sm:px-6 lg:px-8">
      {/* Sticky top region: header + safety + modification alert */}
      {!hideTopChrome && (
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8 lg:px-6 lg:py-5">
            {/* Left column: workout title and metadata */}
            <div className="flex-1 min-w-0 p-5 lg:p-0 border-b border-border lg:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <span className="text-xs font-bold text-primary tracking-widest uppercase">
                      AI Generated Plan
                    </span>
                  </div>
                  <h1 className="text-3xl leading-none font-bold mt-1">
                    {workout.title || "Workout"}
                  </h1>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <Bookmark className="w-4 h-4" />
                </Button>
              </div>

              {workout.description && (
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {workout.description}
                </p>
              )}

              <div className="flex gap-4 text-sm font-semibold">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  {totalDuration} min
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Flame className="w-4 h-4 text-destructive" />~{totalCalories}{" "}
                  kcal
                </div>
              </div>
            </div>

            {/* Right column: safety toggle + modification alert */}
            <div className="w-full lg:max-w-md xl:max-w-lg lg:shrink-0 flex flex-col gap-4 p-4 lg:p-0 lg:pt-0">
              <div className="border-b border-border lg:border-b-0">
                <SafetyToggle onToggle={onSafetyToggle} />
              </div>
              {hasPersonalization && (
                <div>
                  <ConflictResolution
                    personalization={workout.personalization!}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content slot */}
      <div className="flex flex-col flex-1 min-h-0 w-full">{children}</div>
    </div>
  );
}
