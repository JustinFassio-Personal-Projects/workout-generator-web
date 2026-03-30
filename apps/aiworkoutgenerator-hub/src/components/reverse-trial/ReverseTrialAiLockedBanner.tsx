"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useReverseTrialAiLock } from "@/hooks/useReverseTrialAiLock";

/**
 * Inline strip for AI editor panels when calendar trial / churn blocks AI APIs.
 */
export function ReverseTrialAiLockedBanner() {
  const { aiLocked, onLockedAction } = useReverseTrialAiLock("banner");
  if (!aiLocked) return null;

  return (
    <Alert className="border-destructive/40 bg-destructive/5">
      <Lock className="h-4 w-4" />
      <AlertTitle>AI tools need Premium</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Your Pro trial has ended. Subscribe to use AI edits, swaps, and coach
          features again.
        </span>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="shrink-0"
          onClick={onLockedAction}
        >
          View Premium
        </Button>
      </AlertDescription>
    </Alert>
  );
}
