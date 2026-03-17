"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLogo } from "./AppLogo";

interface AppPageHeaderProps {
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export function AppPageHeader({
  backHref,
  backLabel = "Back to Dashboard",
  children,
}: AppPageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2 min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </Link>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center justify-center min-w-0 flex-1">
          {children}
        </div>
      ) : null}
      <div className="flex items-center justify-end shrink-0">
        <AppLogo href="/dashboard" size={32} />
      </div>
    </div>
  );
}
