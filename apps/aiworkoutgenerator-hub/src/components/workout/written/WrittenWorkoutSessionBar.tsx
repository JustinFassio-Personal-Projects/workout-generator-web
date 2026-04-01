"use client";

import { Timer, RotateCcw, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WrittenSessionStatus } from "@/lib/workout/writtenSession";

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface WrittenWorkoutSessionBarProps {
  status: WrittenSessionStatus;
  totalSeconds: number;
  segmentSeconds: number;
  onStartWorkout: () => void;
  onLap: () => void;
  onEndSession: () => void;
  onReset: () => void;
  /** Collapse the bar; user can reopen via the timer FAB */
  onHide?: () => void;
  className?: string;
}

export function WrittenWorkoutSessionBar({
  status,
  totalSeconds,
  segmentSeconds,
  onStartWorkout,
  onLap,
  onEndSession,
  onReset,
  onHide,
  className,
}: WrittenWorkoutSessionBarProps) {
  const phaseLabel =
    status === "active_work" ? "Work" : status === "rest" ? "Rest" : "Ready";

  const primaryLabel =
    status === "idle"
      ? "Start workout"
      : status === "active_work"
        ? "Finish block"
        : "Start next block";

  const primaryAction = status === "idle" ? onStartWorkout : onLap;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(100%-1rem,28rem)] px-2",
        className
      )}
    >
      <div className="bg-card border border-border shadow-xl rounded-2xl px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            <Timer className="h-3.5 w-3.5 text-sky-400" />
            {phaseLabel}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {onHide ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={onHide}
              >
                Hide
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm("Clear this session and all splits?")
                ) {
                  onReset();
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
            {status !== "idle" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    window.confirm(
                      "End session? Current segment will be recorded."
                    )
                  ) {
                    onEndSession();
                  }
                }}
              >
                <Square className="h-3.5 w-3.5 mr-1" />
                End session
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block">
              Session
            </span>
            <span className="text-2xl font-mono font-bold tabular-nums leading-none">
              {formatClock(totalSeconds)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block">
              Block
            </span>
            <span className="text-2xl font-mono font-bold text-sky-400 tabular-nums leading-none">
              {formatClock(segmentSeconds)}
            </span>
          </div>
        </div>

        <Button
          type="button"
          className="w-full bg-sky-600 text-white hover:bg-sky-500"
          onClick={primaryAction}
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
