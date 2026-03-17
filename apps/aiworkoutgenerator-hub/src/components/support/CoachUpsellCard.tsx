"use client";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COACH_UPSELL } from "@/lib/support-constants";
import {
  trackSupportCoachUpsellShown,
  trackSupportCoachUpsellClicked,
} from "@/lib/analytics";
import { useEffect } from "react";

// ============================================
// Component
// ============================================

interface CoachUpsellCardProps {
  onSeeOptions: () => void;
  onDismiss: () => void;
}

export function CoachUpsellCard({
  onSeeOptions,
  onDismiss,
}: CoachUpsellCardProps) {
  useEffect(() => {
    trackSupportCoachUpsellShown();
  }, []);

  const handleSeeOptions = () => {
    trackSupportCoachUpsellClicked();
    onSeeOptions();
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">{COACH_UPSELL.title}</CardTitle>
        <CardDescription>{COACH_UPSELL.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex gap-2">
        <Button onClick={handleSeeOptions} size="sm">
          {COACH_UPSELL.ctaPrimary}
        </Button>
        <Button onClick={onDismiss} variant="outline" size="sm">
          {COACH_UPSELL.ctaSecondary}
        </Button>
      </CardFooter>
    </Card>
  );
}
