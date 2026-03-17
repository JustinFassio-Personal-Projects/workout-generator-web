"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface RestTimerProps {
  durationSeconds: number;
  safetyMode?: boolean;
  explanation?: string;
  onComplete?: () => void;
  className?: string;
  nextExercise?: {
    name: string;
    sets?: number;
    muscleTarget?: string;
  };
}

/**
 * Enhanced rest timer with breathe animation for Safety Mode.
 * Shows explanation and large, easy-to-read countdown.
 */
export function RestTimer({
  durationSeconds,
  safetyMode = false,
  explanation,
  onComplete,
  className = "",
  nextExercise,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border-2",
        safetyMode
          ? "bg-muted border-primary animate-breathe"
          : "bg-card border-border",
        className
      )}
    >
      <Timer className="w-8 h-8 mb-4 text-muted-foreground" />
      <div
        className={cn(
          "text-6xl font-bold mb-2",
          safetyMode ? "text-safety-text" : "text-foreground"
        )}
      >
        {displayTime}
      </div>
      {explanation && (
        <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
          {explanation}
        </p>
      )}
      {nextExercise && (
        <div className="mt-4 pt-4 border-t border-border/50 w-full">
          <p className="text-xs text-muted-foreground mb-1">Next Exercise</p>
          <p className="text-sm font-semibold text-foreground">
            {nextExercise.name}
          </p>
          {nextExercise.sets && (
            <p className="text-xs text-muted-foreground mt-1">
              {nextExercise.sets} {nextExercise.sets === 1 ? "set" : "sets"}
              {nextExercise.muscleTarget && ` • ${nextExercise.muscleTarget}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
