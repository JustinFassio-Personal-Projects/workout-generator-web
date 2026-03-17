"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PhaseBData } from "@/hooks/usePhaseBWizard";

type Props = {
  value: PhaseBData;
  onChange: (updates: Partial<PhaseBData>) => void;
  onNext: () => void;
  onBack: () => void;
};

/**
 * Phase B step for collecting name (first_name, last_name).
 * Simplified from StepBasicInfo - gender is already collected in Phase A.
 */
export function StepPhaseBName({ value, onChange, onNext, onBack }: Props) {
  // Validate that both name fields are filled
  const canContinue = useMemo(() => {
    const firstName = value.first_name?.trim() ?? "";
    const lastName = value.last_name?.trim() ?? "";
    return firstName.length > 0 && lastName.length > 0;
  }, [value.first_name, value.last_name]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">What&apos;s your name?</h2>
        <p className="text-sm text-muted-foreground">
          This helps us personalize your workout experience.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            value={value.first_name}
            onChange={(e) => onChange({ first_name: e.target.value })}
            placeholder="Jane"
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            value={value.last_name}
            onChange={(e) => onChange({ last_name: e.target.value })}
            placeholder="Doe"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
