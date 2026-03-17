"use client";

import {
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CertificationStatus } from "@/types/firestore";

interface CertificationStatusBadgeProps {
  status: CertificationStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig: Record<
  CertificationStatus,
  {
    label: string;
    icon: typeof Clock;
    className: string;
  }
> = {
  none: {
    label: "Not Certified",
    icon: Shield,
    className: "bg-muted text-muted-foreground",
  },
  pending: {
    label: "Pending Review",
    icon: Clock,
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  in_review: {
    label: "In Review",
    icon: UserCheck,
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  changes_requested: {
    label: "Changes Requested",
    icon: AlertCircle,
    className: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
  certified: {
    label: "Certified",
    icon: CheckCircle2,
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  rejected: {
    label: "Not Approved",
    icon: XCircle,
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

/**
 * Badge component showing certification status with appropriate styling.
 */
export function CertificationStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: CertificationStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1.5`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

/**
 * Compact badge for use in lists/cards.
 */
export function CertificationStatusDot({
  status,
}: {
  status: CertificationStatus;
}) {
  const dotColors: Record<CertificationStatus, string> = {
    none: "bg-muted",
    pending: "bg-yellow-500",
    in_review: "bg-blue-500",
    changes_requested: "bg-orange-500",
    certified: "bg-green-500",
    rejected: "bg-red-500",
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${dotColors[status]}`}
      title={statusConfig[status].label}
    />
  );
}
