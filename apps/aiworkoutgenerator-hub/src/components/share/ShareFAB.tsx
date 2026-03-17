"use client";

import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShareFABProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ShareFAB({ onClick, disabled = false }: ShareFABProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={disabled}
            size="icon"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Share Session Report"
          >
            {disabled ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Share2 className="h-6 w-6" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div>
            <div className="font-semibold">Share Session Report</div>
            <div className="text-xs text-muted-foreground">
              Share with friends and family
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
