"use client";

import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIProcessingStateProps } from "./types";

/**
 * Component to display AI processing states (loading, success, error).
 */
export function AIProcessingState({
  state,
  message,
  error,
  onRetry,
}: AIProcessingStateProps) {
  if (state === "idle") {
    return null;
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {message || "AI is generating your exercise modification..."}
        </p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          {message || "Edit generated successfully!"}
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <XCircle className="h-8 w-8 text-destructive" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-destructive">
            {error || "An error occurred"}
          </p>
          {message && (
            <p className="text-xs text-muted-foreground">{message}</p>
          )}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return null;
}
