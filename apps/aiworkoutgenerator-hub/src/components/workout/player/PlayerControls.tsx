"use client";

import { Play, Pause, ChevronRight, HelpCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlayerControlsProps {
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onHelp?: () => void;
  onOpenTimer?: () => void;
  safetyMode?: boolean;
  className?: string;
}

/**
 * Navigation controls optimized for physical exertion.
 * Large tap targets (60x60px minimum) positioned in Thumb Zone.
 */
export function PlayerControls({
  isPlaying = false,
  onPlay,
  onPause,
  onNext,
  onHelp,
  onOpenTimer,
  safetyMode = false,
  className = "",
}: PlayerControlsProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-50",
        "flex items-center justify-center gap-4",
        className
      )}
    >
      {onHelp && (
        <Button
          variant="outline"
          size="lg"
          onClick={onHelp}
          className="h-16 w-16 rounded-full p-0"
          aria-label="Get help"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      )}

      {onOpenTimer && (
        <Button
          variant="outline"
          size="lg"
          onClick={onOpenTimer}
          className="h-16 w-16 rounded-full p-0 border-primary/50 hover:border-primary hover:bg-primary/5"
          aria-label="Open interval timer"
          title="AI Interval Timer"
        >
          <Timer className="w-6 h-6 text-primary" />
        </Button>
      )}

      {(onPlay || onPause) && (
        <Button
          variant={isPlaying ? "secondary" : "default"}
          size="lg"
          onClick={isPlaying ? onPause : onPlay}
          className="h-16 w-16 rounded-full p-0"
          aria-label={isPlaying ? "Pause workout" : "Resume workout"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>
      )}

      {onNext && (
        <Button
          variant="default"
          size="lg"
          onClick={onNext}
          className={cn(
            "h-16 px-8 rounded-full font-semibold",
            safetyMode && "animate-breathe"
          )}
          aria-label="Next exercise"
        >
          Next Exercise
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      )}
    </div>
  );
}
