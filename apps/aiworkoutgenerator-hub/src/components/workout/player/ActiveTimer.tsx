"use client";

import { useState, useEffect, useCallback } from "react";
import { Pause, Play, SkipForward, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActiveTimerProps {
  duration: number; // Total work duration in seconds
  exerciseName: string;
  isBidirectional: boolean;
  switchIndicator?: string; // e.g., "Switch to other leg"
  currentSet: number;
  totalSets: number;
  onComplete: () => void;
  onPause?: () => void;
  onSkip?: () => void;
  safetyMode?: boolean;
  className?: string;
}

type TimerState = "running" | "paused" | "switching";

/**
 * Active work phase timer with bidirectional switch support.
 * Shows prominent countdown, progress visualization, and switch overlay.
 */
export function ActiveTimer({
  duration,
  exerciseName,
  isBidirectional,
  switchIndicator = "Switch sides",
  currentSet,
  totalSets,
  onComplete,
  onPause,
  onSkip,
  safetyMode = false,
  className = "",
}: ActiveTimerProps) {
  // For bidirectional exercises, split duration in half for each direction
  const sideDuration = isBidirectional ? Math.floor(duration / 2) : duration;
  const [remaining, setRemaining] = useState(sideDuration);
  const [timerState, setTimerState] = useState<TimerState>("running");
  const [currentSide, setCurrentSide] = useState<1 | 2>(1); // 1 = first side, 2 = second side
  const [showSwitchOverlay, setShowSwitchOverlay] = useState(false);

  // Vibrate on events (if supported)
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Handle timer tick
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (timerState !== "running") return;

    if (remaining <= 0) {
      // First side/direction complete for bidirectional exercises
      if (isBidirectional && currentSide === 1) {
        vibrate([100, 50, 100, 50, 100]); // Switch signal
        setTimerState("switching");
        setShowSwitchOverlay(true);
        return;
      }

      // Work complete
      vibrate([200, 100, 200]); // Done signal
      onComplete();
      return;
    }

    // Warning vibration at 5 seconds
    if (remaining === 5) {
      vibrate(50);
    }

    // Tick vibration at final 3 seconds
    if (remaining <= 3 && remaining > 0) {
      vibrate(30);
    }

    const interval = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [
    timerState,
    remaining,
    isBidirectional,
    currentSide,
    onComplete,
    vibrate,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle switch overlay dismiss
  const handleSwitchComplete = useCallback(() => {
    setShowSwitchOverlay(false);
    setCurrentSide(2);
    setRemaining(sideDuration);
    setTimerState("running");
    vibrate(100);
  }, [sideDuration, vibrate]);

  // Calculate progress
  const totalElapsed = isBidirectional
    ? currentSide === 1
      ? sideDuration - remaining
      : sideDuration + (sideDuration - remaining)
    : duration - remaining;
  const totalDuration = isBidirectional ? sideDuration * 2 : duration;
  const progress = (totalElapsed / totalDuration) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Format time display
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const displayTime =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}`;

  // Switch overlay
  if (showSwitchOverlay) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 rounded-xl border-2",
          "bg-primary/10 border-primary",
          className
        )}
      >
        <RefreshCw className="w-16 h-16 text-primary mb-4 animate-spin" />
        <h2 className="text-3xl font-bold text-primary mb-2">
          {switchIndicator}
        </h2>
        <p className="text-muted-foreground mb-6">
          Get ready for the other side
        </p>
        <Button
          size="lg"
          onClick={handleSwitchComplete}
          className="h-16 px-8 rounded-full font-semibold text-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Continue
        </Button>
      </div>
    );
  }

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
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Set {currentSet} of {totalSets}
        </span>
        {isBidirectional && (
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
            Side {currentSide}/2
          </span>
        )}
      </div>

      <h2
        className={cn(
          "text-xl font-bold text-center mb-6 max-w-md",
          safetyMode ? "text-safety-text" : "text-foreground"
        )}
      >
        {exerciseName}
      </h2>

      {/* Progress ring with time */}
      <div className="relative w-56 h-56 mb-6">
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
            strokeWidth="10"
            className="text-muted"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-all duration-1000 ease-linear",
              remaining <= 5 ? "text-destructive" : "text-primary"
            )}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-6xl font-bold tabular-nums",
              remaining <= 5 && "text-destructive animate-pulse"
            )}
          >
            {displayTime}
          </span>
          <span className="text-sm text-muted-foreground mt-1">
            {timerState === "paused" ? "PAUSED" : "WORK"}
          </span>
        </div>
      </div>

      {/* Bidirectional indicator */}
      {isBidirectional && (
        <div className="flex items-center gap-4 mb-4">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              currentSide === 1 ? "bg-primary" : "bg-muted"
            )}
          />
          <span className="text-sm text-muted-foreground">
            {currentSide === 1 ? "First side" : "Second side"}
          </span>
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              currentSide === 2 ? "bg-primary" : "bg-muted"
            )}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            if (timerState === "running") {
              setTimerState("paused");
              onPause?.();
            } else {
              setTimerState("running");
            }
          }}
          className="h-14 w-14 rounded-full p-0"
          aria-label={timerState === "running" ? "Pause" : "Resume"}
        >
          {timerState === "running" ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>

        {onSkip && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onSkip}
            className="h-14 px-6 rounded-full"
            aria-label="Skip to rest"
          >
            <SkipForward className="w-5 h-5 mr-2" />
            Skip
          </Button>
        )}
      </div>

      {/* Progress text */}
      <p className="text-xs text-muted-foreground mt-4">
        {Math.round(progress)}% complete
      </p>
    </div>
  );
}
