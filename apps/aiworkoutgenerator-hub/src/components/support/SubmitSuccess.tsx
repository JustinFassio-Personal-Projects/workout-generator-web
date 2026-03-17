"use client";

import { CheckCircle2 } from "lucide-react";
import { SUPPORT_CENTER_COPY } from "@/lib/support-constants";

// ============================================
// Component
// ============================================

interface SubmitSuccessProps {
  email?: string;
  followUpOk?: boolean;
}

export function SubmitSuccess({ email, followUpOk }: SubmitSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
      <h3 className="text-xl font-semibold mb-2">
        {SUPPORT_CENTER_COPY.successMessage}
      </h3>
      {followUpOk && email && (
        <p className="text-sm text-muted-foreground">
          {SUPPORT_CENTER_COPY.followUpMessage.replace("{email}", email)}
        </p>
      )}
    </div>
  );
}
