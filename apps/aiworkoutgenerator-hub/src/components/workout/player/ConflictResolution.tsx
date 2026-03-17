"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { PersonalizationItem } from "@/types/firestore";
import { ViewMorph } from "./ViewMorph";
import { TrustBadge } from "./TrustBadge";
import { cn } from "@/lib/utils";

interface ConflictResolutionProps {
  personalization: PersonalizationItem[];
  className?: string;
}

/**
 * Visual narrative for injury exclusions.
 * Shows animation: original exercise slides out → safe alternative slides in.
 * Only triggers on initial workout load.
 */
export function ConflictResolution({
  personalization,
  className = "",
}: ConflictResolutionProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Filter for injury-related modifications
  const injuryModifications = personalization.filter((item) =>
    item.attribute.toLowerCase().includes("injury")
  );

  useEffect(() => {
    if (injuryModifications.length > 0 && !hasAnimated) {
      // This effect only runs once on initial personalization load to kick off
      // a short entrance animation. We intentionally set local animation state
      // here rather than introducing extra refs or callbacks for a one-shot UI effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true);

      setHasAnimated(true);

      // Animation duration matches CSS transition
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [injuryModifications.length, hasAnimated]);

  if (injuryModifications.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {injuryModifications.map((mod, idx) => (
        <ViewMorph
          key={idx}
          id={`conflict-${idx}`}
          className={cn(
            "transition-all duration-500",
            isAnimating && "animate-in slide-in-from-left-5"
          )}
        >
          <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-amber-500">
                    {mod.attribute}
                  </span>
                  <TrustBadge
                    type="safety-modified"
                    explanation={mod.adjustment}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {mod.adjustment}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>
          </div>
        </ViewMorph>
      ))}
    </div>
  );
}
