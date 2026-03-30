"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { useUser } from "@/lib/auth";
import type { ReverseTrialEndedReason } from "@/lib/reverse-trial/user-capabilities-types";
import { useReverseTrialCapabilities } from "@/components/reverse-trial/ReverseTrialCapabilitiesContext";
import { trackTrialExpiredViewed } from "@/lib/reverse-trial-funnel-analytics";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STILL_HAVE = [
  "Workouts you already generated — open, complete, and log them",
  "Your profile and non-AI workout tools that stay on the free experience",
];

const NEED_PREMIUM = [
  "New AI workout generation",
  "AI exercise edits, swaps, adds, and coach explain",
  "Advanced workout summary analytics and trends",
];

type TrialEndedExplainerTriggerProps = {
  endedReason: ReverseTrialEndedReason;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

/**
 * Opens a compact “what you keep vs what’s locked” dialog (REVERSE_TRIAL_ROADMAP §1.2).
 */
export function TrialEndedExplainerTrigger({
  endedReason,
  variant = "ghost",
  size = "sm",
  className,
}: TrialEndedExplainerTriggerProps) {
  const [open, setOpen] = useState(false);
  const churned = endedReason === "churned";
  const { user } = useUser();
  const { capabilities } = useReverseTrialCapabilities();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      trackTrialExpiredViewed("trial_ended_explainer", {
        firebaseUid: user?.uid ?? null,
        capabilities,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
        >
          What you keep vs Premium
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {churned ? "After your subscription ends" : "After your Pro trial"}
          </DialogTitle>
          <DialogDescription>
            {churned
              ? "Reactivate Premium anytime to get AI and analytics back. Your past workouts stay yours."
              : "Subscribe to Premium to unlock AI generation and analytics again. Here is the split."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 pt-2">
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              You still have
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {STILL_HAVE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <X className="h-4 w-4 text-destructive shrink-0" />
              Needs Premium
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {NEED_PREMIUM.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
