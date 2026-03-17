"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";

const GOALS = [
  "Build muscle",
  "Lose fat",
  "Improve endurance",
  "Increase strength",
  "Mobility & flexibility",
  "General health",
] as const;

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepGoals({ value, onChange, onNext, onBack }: Props) {
  const selected = new Set(value.fitness_goals ?? []);

  const toggle = (goal: string) => {
    const next = new Set(selected);
    if (next.has(goal)) next.delete(goal);
    else next.add(goal);
    onChange({ ...value, fitness_goals: Array.from(next) });
  };

  const canContinue = (value.fitness_goals?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Goals</h2>
        <p className="text-sm text-muted-foreground">
          Pick at least one—this steers workout recommendations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {GOALS.map((g) => (
          <label
            key={g}
            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              checked={selected.has(g)}
              onCheckedChange={() => toggle(g)}
            />
            <Label className="cursor-pointer">{g}</Label>
          </label>
        ))}
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
