"use client";

import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WrittenTimerFabProps {
  onShow: () => void;
  className?: string;
}

/**
 * Bottom-left FAB (mirrors SupportFAB placement/size; sky theme + Timer icon).
 */
export function WrittenTimerFab({ onShow, className }: WrittenTimerFabProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={onShow}
            size="icon"
            className={cn(
              "fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow",
              "bg-sky-600 text-white hover:bg-sky-500 border-0",
              className
            )}
            aria-label="Show session timer"
          >
            <Timer className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div>
            <div className="font-semibold">Session timer</div>
            <div className="text-xs text-muted-foreground">
              Show work / rest timer and splits
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
