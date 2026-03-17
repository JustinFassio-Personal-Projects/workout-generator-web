"use client";

import { useState, useEffect, useTransition } from "react";
import { Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "workout-player-safety-mode";

interface SafetyToggleProps {
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

/**
 * Prominent Safety-First Mode toggle component.
 * Toggles theme, persists preference, and shows feedback.
 */
export function SafetyToggle({ onToggle, className = "" }: SafetyToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPending, startTransition] = useTransition();

  const applyTheme = (enabled: boolean) => {
    if (typeof document === "undefined") return;

    const body = document.body;
    if (enabled) {
      body.classList.add("theme-safety");
    } else {
      body.classList.remove("theme-safety");
    }
  };

  // Load preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      // We intentionally hydrate state from localStorage inside an effect
      // instead of the useState lazy initializer so this code never runs
      // during server rendering, where localStorage is undefined.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEnabled(true);
      applyTheme(true);
    }
  }, []);

  const handleToggle = () => {
    startTransition(() => {
      const newValue = !isEnabled;
      setIsEnabled(newValue);
      applyTheme(newValue);
      localStorage.setItem(STORAGE_KEY, String(newValue));

      if (newValue) {
        toast.success("Safety protocols engaged", {
          description:
            "Rep ranges lowered, complex lifts substituted, rest times extended.",
          duration: 3000,
        });
      } else {
        toast.info("Standard mode activated", {
          description: "Performance-focused metrics enabled.",
          duration: 2000,
        });
      }

      onToggle?.(newValue);
    });
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "h-16 w-full rounded-full border-2 text-base font-semibold transition-all",
        isEnabled
          ? "bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20"
          : "bg-muted border-border text-muted-foreground hover:bg-muted/80",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isEnabled ? (
          <>
            <Shield className="w-5 h-5" />
            <span>Safety-First Mode: ON</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>Safety-First Mode: OFF</span>
          </>
        )}
      </div>
    </Button>
  );
}
