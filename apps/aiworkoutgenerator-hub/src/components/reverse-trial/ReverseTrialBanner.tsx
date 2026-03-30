"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useReverseTrialCapabilities } from "./ReverseTrialCapabilitiesContext";
import { TrialEndedExplainerTrigger } from "./TrialEndedExplainer";

export function ReverseTrialBanner() {
  const { capabilities: cap, loading } = useReverseTrialCapabilities();

  if (loading || !cap?.enforcement_enabled) return null;

  if (cap.show_reverse_trial_ended_banner) {
    const churned = cap.ended_reason === "churned";
    return (
      <Alert
        variant="destructive"
        className="rounded-none border-x-0 border-t-0 sm:rounded-md sm:border"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>
          {churned ? "Subscription ended" : "Trial ended"}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {churned
              ? "Your paid access has ended. Renew Premium to restore AI workouts, analytics, and Pro tools. You still have the workouts you already created."
              : "Pro AI workouts and analytics are locked. You still have access to workouts you created during your trial."}
          </span>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <TrialEndedExplainerTrigger
              variant="outline"
              size="sm"
              endedReason={cap.ended_reason}
            />
            <Button asChild size="sm" variant="secondary">
              <Link href="/pricing?from=trial_ended">View plans</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (cap.show_reverse_trial_expiring_banner) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-amber-500/40 bg-amber-500/10 sm:rounded-md sm:border">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          Trial ending soon
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-2 text-amber-900/90 dark:text-amber-100/90 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Your full Pro access window is closing. Subscribe to keep AI
            generation and analytics.
          </span>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/pricing">Upgrade</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
