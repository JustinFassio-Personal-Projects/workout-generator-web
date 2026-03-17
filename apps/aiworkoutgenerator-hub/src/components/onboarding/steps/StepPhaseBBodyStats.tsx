"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PhaseBData } from "@/hooks/usePhaseBWizard";
import type { WebsiteOnboardingData } from "@/types/websiteOnboarding";

type Props = {
  value: PhaseBData;
  phaseAData: WebsiteOnboardingData;
  onChange: (updates: Partial<PhaseBData>) => void;
  onNext: () => void;
  onBack: () => void;
};

/**
 * Phase B step for collecting body stats (weight, height).
 * Age and units are pre-filled from Phase A data.
 */
export function StepPhaseBBodyStats({
  value,
  phaseAData,
  onChange,
  onNext,
  onBack,
}: Props) {
  const weightUnit = phaseAData.preferred_units.weight === "lb" ? "lb" : "kg";
  const heightUnit = phaseAData.preferred_units.height === "in" ? "in" : "cm";

  // Reasonable ranges for validation
  const WEIGHT_MIN = weightUnit === "lb" ? 50 : 25; // 50 lb ≈ 23 kg, 25 kg ≈ 55 lb
  const WEIGHT_MAX = weightUnit === "lb" ? 800 : 350; // 800 lb ≈ 363 kg, 350 kg ≈ 772 lb
  const HEIGHT_MIN = heightUnit === "in" ? 36 : 90; // 36 in ≈ 91 cm, 90 cm ≈ 35 in
  const HEIGHT_MAX = heightUnit === "in" ? 96 : 240; // 96 in ≈ 244 cm, 240 cm ≈ 94 in

  // Age validation constants
  const AGE_MIN = 13;
  const AGE_MAX = 120;

  // If Phase A has age, we don't need to collect it in Phase B
  const needsAgeInput = !phaseAData.age;

  const canContinue =
    value.weight !== null &&
    value.weight >= WEIGHT_MIN &&
    value.weight <= WEIGHT_MAX &&
    value.height !== null &&
    value.height >= HEIGHT_MIN &&
    value.height <= HEIGHT_MAX &&
    // Age must be valid if we need to collect it
    (!needsAgeInput ||
      (value.age !== null && value.age >= AGE_MIN && value.age <= AGE_MAX));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Body stats</h2>
        <p className="text-sm text-muted-foreground">
          Used for scaling workouts and recommendations.
        </p>
      </div>

      {/* Show age if provided in Phase A (read-only info), otherwise collect it */}
      {phaseAData.age ? (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">Age: </span>
          <span className="font-medium">{phaseAData.age} years old</span>
          <span className="text-muted-foreground ml-2">
            (from your previous selection)
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="age">
            Age
            <span className="text-xs text-muted-foreground ml-1">
              ({AGE_MIN}-{AGE_MAX} years)
            </span>
          </Label>
          <Input
            id="age"
            type="number"
            inputMode="numeric"
            min={AGE_MIN}
            max={AGE_MAX}
            step="1"
            value={value.age ?? ""}
            onChange={(e) => {
              const numValue = e.target.value
                ? parseInt(e.target.value, 10)
                : null;
              onChange({ age: numValue });
            }}
            placeholder="25"
            className="max-w-[120px]"
          />
          {value.age !== null &&
            (value.age < AGE_MIN || value.age > AGE_MAX) && (
              <p className="text-xs text-destructive">
                Please enter an age between {AGE_MIN} and {AGE_MAX} years
              </p>
            )}
          <p className="text-xs text-muted-foreground">
            Age helps us calculate heart rate zones and recommend appropriate
            training intensity.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weight">
            Weight ({weightUnit})
            <span className="text-xs text-muted-foreground ml-1">
              ({WEIGHT_MIN}-{WEIGHT_MAX})
            </span>
          </Label>
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            step="0.1"
            value={value.weight ?? ""}
            onChange={(e) => {
              const numValue = e.target.value ? Number(e.target.value) : null;
              onChange({ weight: numValue });
            }}
            placeholder={weightUnit === "lb" ? "180" : "82"}
          />
          {value.weight !== null &&
            (value.weight < WEIGHT_MIN || value.weight > WEIGHT_MAX) && (
              <p className="text-xs text-destructive">
                Please enter a weight between {WEIGHT_MIN} and {WEIGHT_MAX}{" "}
                {weightUnit}
              </p>
            )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">
            Height ({heightUnit})
            <span className="text-xs text-muted-foreground ml-1">
              ({HEIGHT_MIN}-{HEIGHT_MAX})
            </span>
          </Label>
          <Input
            id="height"
            type="number"
            inputMode="decimal"
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            step="0.1"
            value={value.height ?? ""}
            onChange={(e) => {
              const numValue = e.target.value ? Number(e.target.value) : null;
              onChange({ height: numValue });
            }}
            placeholder={heightUnit === "in" ? "72" : "183"}
          />
          {value.height !== null &&
            (value.height < HEIGHT_MIN || value.height > HEIGHT_MAX) && (
              <p className="text-xs text-destructive">
                Please enter a height between {HEIGHT_MIN} and {HEIGHT_MAX}{" "}
                {heightUnit}
              </p>
            )}
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
