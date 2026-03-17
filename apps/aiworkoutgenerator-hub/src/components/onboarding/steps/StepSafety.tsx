"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";

const COMMON_INJURIES = [
  "Knee",
  "Shoulder",
  "Back",
  "Hip",
  "Ankle",
  "Wrist",
  "Neck",
] as const;

const COMMON_CONDITIONS = [
  "None",
  "High blood pressure",
  "Asthma",
  "Diabetes",
  "Heart condition",
  "Pregnancy",
] as const;

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepSafety({ value, onChange, onNext, onBack }: Props) {
  const injuries = new Set(value.injuries ?? []);
  const medical_conditions = new Set(value.medical_conditions ?? []);

  const toggleInjury = (name: string) => {
    const next = new Set(injuries);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange({ ...value, injuries: Array.from(next) });
  };

  const toggleCondition = (name: string) => {
    if (name === "None") {
      onChange({ ...value, medical_conditions: [] });
      return;
    }
    const next = new Set(medical_conditions);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange({ ...value, medical_conditions: Array.from(next) });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Safety</h2>
        <p className="text-sm text-muted-foreground">
          Help us avoid movements that might aggravate injuries or conditions.
        </p>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Injuries (optional)</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMMON_INJURIES.map((i) => (
            <label
              key={i}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={injuries.has(i)}
                onCheckedChange={() => toggleInjury(i)}
              />
              <Label className="cursor-pointer">{i}</Label>
            </label>
          ))}
        </div>
        <Textarea
          placeholder="Any details? (optional)"
          value={value.injury_details ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              injury_details: e.target.value.trim() ? e.target.value : null,
            })
          }
        />
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Medical conditions (optional)</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMMON_CONDITIONS.map((c) => (
            <label
              key={c}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={
                  c === "None"
                    ? (value.medical_conditions?.length ?? 0) === 0
                    : medical_conditions.has(c)
                }
                onCheckedChange={() => toggleCondition(c)}
              />
              <Label className="cursor-pointer">{c}</Label>
            </label>
          ))}
        </div>
        <Textarea
          placeholder="Any notes? (optional)"
          value={value.medical_notes ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              medical_notes: e.target.value.trim() ? e.target.value : null,
            })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
