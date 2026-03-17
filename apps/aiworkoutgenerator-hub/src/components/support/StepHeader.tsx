"use client";

import { Badge } from "@/components/ui/badge";
import { SUPPORT_CENTER_COPY } from "@/lib/support-constants";

// ============================================
// Component
// ============================================

interface StepHeaderProps {
  title?: string;
  subhead?: string;
  showResponseTime?: boolean;
  className?: string;
}

export function StepHeader({
  title = SUPPORT_CENTER_COPY.title,
  subhead = SUPPORT_CENTER_COPY.subhead,
  showResponseTime = true,
  className,
}: StepHeaderProps) {
  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {showResponseTime && (
          <Badge variant="secondary" className="shrink-0">
            {SUPPORT_CENTER_COPY.responseTime}
          </Badge>
        )}
      </div>
      {subhead && (
        <p className="text-sm text-muted-foreground mb-4">{subhead}</p>
      )}
    </div>
  );
}
