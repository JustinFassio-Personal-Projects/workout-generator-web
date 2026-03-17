"use client";

import { Shield, Sparkles, Leaf, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TrustBadgeType =
  | "clinically-vetted"
  | "ai-optimized"
  | "safety-modified";

interface TrustBadgeProps {
  type: TrustBadgeType;
  explanation?: string;
  className?: string;
}

const badgeConfig: Record<
  TrustBadgeType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    defaultExplanation: string;
    variant: "default" | "secondary" | "outline";
    colorClass: string;
  }
> = {
  "clinically-vetted": {
    icon: Shield,
    label: "Clinically Vetted",
    defaultExplanation: "Content reviewed by a certified professional.",
    variant: "default",
    colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  "ai-optimized": {
    icon: Sparkles,
    label: "AI Optimized",
    defaultExplanation: "Selected by algorithm for your specific goal.",
    variant: "secondary",
    colorClass: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  "safety-modified": {
    icon: Leaf,
    label: "Safety Modified",
    defaultExplanation: "Altered due to your injury profile.",
    variant: "outline",
    colorClass: "bg-green-500/10 text-green-500 border-green-500/20",
  },
};

export function TrustBadge({
  type,
  explanation,
  className = "",
}: TrustBadgeProps) {
  const config = badgeConfig[type];
  const Icon = config.icon;
  const displayExplanation = explanation || config.defaultExplanation;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={`flex items-center gap-1.5 cursor-help ${config.colorClass} ${className}`}
          >
            <Icon className="w-3 h-3" />
            <span className="text-xs font-semibold">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm">{displayExplanation}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
