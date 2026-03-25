"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "exercise-card-split:";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function readStoredLeftPercent(
  fullKey: string,
  def: number,
  min: number,
  max: number
): number {
  if (typeof window === "undefined") return def;
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw != null) {
      const n = Number.parseFloat(raw);
      if (Number.isFinite(n)) return clamp(n, min, max);
    }
  } catch {
    /* ignore */
  }
  return def;
}

export interface ResizableExerciseSplitProps {
  /** Distinct key for persisting the split in localStorage. */
  storageKey: string;
  /** Default width % of the left column (first pane). */
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  className?: string;
  rowClassName?: string;
  left: ReactNode;
  right: ReactNode;
}

/**
 * Horizontal split with a draggable handle (md+). Stacks vertically on small viewports.
 * Persists the left pane width percentage in localStorage.
 */
export function ResizableExerciseSplit({
  storageKey,
  defaultLeftPercent = 50,
  minLeftPercent = 22,
  maxLeftPercent = 78,
  className,
  rowClassName,
  left,
  right,
}: ResizableExerciseSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullKey = STORAGE_PREFIX + storageKey;
  const [leftPercent, setLeftPercent] = useState(() =>
    readStoredLeftPercent(
      fullKey,
      defaultLeftPercent,
      minLeftPercent,
      maxLeftPercent
    )
  );

  const persist = useCallback(
    (v: number) => {
      try {
        localStorage.setItem(fullKey, String(v));
      } catch {
        /* ignore */
      }
    },
    [fullKey]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const row = containerRef.current;
      if (!row) return;
      const rowRect = row.getBoundingClientRect();
      const startX = e.clientX;
      const startPct = leftPercent;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const next = clamp(
          startPct + (dx / rowRect.width) * 100,
          minLeftPercent,
          maxLeftPercent
        );
        setLeftPercent(next);
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const dx = ev.clientX - startX;
        const final = clamp(
          startPct + (dx / rowRect.width) * 100,
          minLeftPercent,
          maxLeftPercent
        );
        setLeftPercent(final);
        persist(final);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [leftPercent, minLeftPercent, maxLeftPercent, persist]
  );

  const rightFlex = 100 - leftPercent;

  return (
    <div className={className}>
      {/* Mobile: stacked */}
      <div className="flex flex-col md:hidden">
        {left}
        {right}
      </div>

      {/* md+: resizable row */}
      <div
        ref={containerRef}
        className={cn(
          "hidden md:flex md:flex-row md:items-stretch md:w-full md:min-w-0",
          rowClassName
        )}
      >
        <div
          className="min-w-0 overflow-hidden flex flex-col shrink-0"
          style={{ flex: `${leftPercent} 1 0%` }}
        >
          {left}
        </div>
        <button
          type="button"
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={minLeftPercent}
          aria-valuemax={maxLeftPercent}
          aria-valuenow={Math.round(leftPercent)}
          aria-label="Resize image and details panels"
          title="Drag to resize"
          onPointerDown={onPointerDown}
          className={cn(
            "w-2 shrink-0 cursor-col-resize group relative z-10",
            "border-x border-border/80 bg-border/50 hover:bg-primary/20",
            "touch-none select-none outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <span
            className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-0.5 rounded-full bg-muted-foreground/45 group-hover:bg-primary/60"
            aria-hidden
          />
        </button>
        <div
          className="min-w-0 flex flex-col flex-1 overflow-hidden"
          style={{ flex: `${rightFlex} 1 0%` }}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
