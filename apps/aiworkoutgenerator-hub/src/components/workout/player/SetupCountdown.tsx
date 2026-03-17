"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SetupCountdownProps {
  duration: number; // seconds
  exerciseName: string;
  onComplete: () => void;
  safetyMode?: boolean;
  className?: string;
}

/**
 * "Get Ready" countdown component displayed before the active work phase begins.
 * Uses large, accessible typography and optional haptic feedback.
 */
export function SetupCountdown({
  duration,
  exerciseName,
  onComplete,
  safetyMode = false,
  className = "",
}: SetupCountdownProps) {
  const [remaining, setRemaining] = useState(duration);
  const [hasStarted, setHasStarted] = useState(false);

  // Vibrate on countdown (if supported)
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  useEffect(() => {
    // Short delay before starting countdown
    const startDelay = setTimeout(() => {
      setHasStarted(true);
      // Initial vibration to signal start
      vibrate(100);
    }, 300);

    return () => clearTimeout(startDelay);
  }, [vibrate]);

  useEffect(() => {
    if (!hasStarted) return;

    if (remaining <= 0) {
      // Strong vibration to signal start of work
      vibrate([100, 50, 100, 50, 200]);
      onComplete();
      return;
    }

    // Vibrate on each second for final 3 seconds
    if (remaining <= 3) {
      vibrate(50);
    }

    const interval = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, remaining, onComplete, vibrate]);

  // Calculate progress for ring animation
  const progress = ((duration - remaining) / duration) * 100;
  const circumference = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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
      {/* Exercise name */}
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Get Ready
      </p>
      <h2
        className={cn(
          "text-2xl font-bold text-center mb-8 max-w-md",
          safetyMode ? "text-safety-text" : "text-foreground"
        )}
      >
        {exerciseName}
      </h2>

      {/* Countdown circle */}
      <div className="relative w-48 h-48 mb-6">
        {/* Background circle */}
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-all duration-1000 ease-linear",
              safetyMode ? "text-primary" : "text-primary"
            )}
          />
        </svg>

        {/* Countdown number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "text-7xl font-bold tabular-nums",
              remaining <= 3 && "text-destructive animate-pulse",
              !hasStarted && "opacity-50"
            )}
          >
            {remaining}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <p
        className={cn(
          "text-sm text-center max-w-xs",
          safetyMode ? "text-muted-foreground" : "text-muted-foreground"
        )}
      >
        {remaining <= 3
          ? "Starting soon..."
          : "Position yourself and prepare for the exercise"}
      </p>
    </div>
  );
}
