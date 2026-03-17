"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";
import type { PreferredUnits } from "@/types/firestore";

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepBodyStats({ value, onChange, onNext, onBack }: Props) {
  const preferred_units: PreferredUnits = value.preferred_units ?? {
    weight: "lb",
    height: "in",
    distance: "mi",
    temperature: "f",
  };

  const age = value.age ?? "";
  const height = value.height ?? "";
  const weight = value.weight ?? "";

  const canContinue =
    Number(age) >= 13 &&
    Number(age) <= 120 &&
    Number(height) > 0 &&
    Number(weight) > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Body stats</h2>
        <p className="text-sm text-muted-foreground">
          Used for scaling workouts and recommendations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            inputMode="numeric"
            value={age}
            onChange={(e) =>
              onChange({ ...value, age: Number(e.target.value) })
            }
            placeholder="30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Height</Label>
          <div className="flex gap-2">
            <Input
              id="height"
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(e) =>
                onChange({ ...value, height: Number(e.target.value) })
              }
              placeholder="72"
            />
            <Select
              value={preferred_units.height}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  preferred_units: {
                    ...preferred_units,
                    height: v as PreferredUnits["height"],
                  },
                })
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">in</SelectItem>
                <SelectItem value="cm">cm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <div className="flex gap-2">
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) =>
                onChange({ ...value, weight: Number(e.target.value) })
              }
              placeholder="180"
            />
            <Select
              value={preferred_units.weight}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  preferred_units: {
                    ...preferred_units,
                    weight: v as PreferredUnits["weight"],
                  },
                })
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lb">lb</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
