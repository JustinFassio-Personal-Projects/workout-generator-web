"use client";

import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReasoningChipProps {
  reasoning: string;
  className?: string;
}

/**
 * Small interactive UI element that explains why an exercise was selected.
 * Example: "Selected to minimize lumbar shear force based on your profile"
 */
export function ReasoningChip({
  reasoning,
  className = "",
}: ReasoningChipProps) {
  if (!reasoning) return null;

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 bg-muted/50 text-muted-foreground border-muted-foreground/20 ${className}`}
    >
      <Info className="w-3 h-3" />
      <span className="text-xs italic">{reasoning}</span>
    </Badge>
  );
}
