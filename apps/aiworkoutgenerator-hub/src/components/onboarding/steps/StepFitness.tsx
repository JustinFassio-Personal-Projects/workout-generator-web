"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";
import type { ActivityLevel, FitnessLevel } from "@/types/firestore";

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepFitness({ value, onChange, onNext, onBack }: Props) {
  const fitness_level = (value.fitness_level ?? "beginner") as FitnessLevel;
  const current_activity_level = (value.current_activity_level ??
    "moderately_active") as ActivityLevel;
  const hasInitializedFitnessLevel = useRef(false);
  const hasInitializedActivityLevel = useRef(false);
  const valueRef = useRef(value);

  // Keep ref in sync with value to avoid stale closures
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Ensure the displayed defaults are also reflected in form state (so saved profile isn't missing required fields).
  // Only initialize once to avoid infinite loops
  useEffect(() => {
    if (!value.fitness_level && !hasInitializedFitnessLevel.current) {
      // Use ref to get current value and avoid stale closure
      onChange({
        ...valueRef.current,
        fitness_level: "beginner" as FitnessLevel,
      });
      hasInitializedFitnessLevel.current = true;
    } else if (value.fitness_level) {
      hasInitializedFitnessLevel.current = true;
    }
  }, [value.fitness_level, onChange]);

  useEffect(() => {
    if (!value.current_activity_level && !hasInitializedActivityLevel.current) {
      // Use ref to get current value and avoid stale closure
      onChange({
        ...valueRef.current,
        current_activity_level: "moderately_active" as ActivityLevel,
      });
      hasInitializedActivityLevel.current = true;
    } else if (value.current_activity_level) {
      hasInitializedActivityLevel.current = true;
    }
  }, [value.current_activity_level, onChange]);

  const canContinue = !!fitness_level && !!current_activity_level;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Fitness level</h2>
        <p className="text-sm text-muted-foreground">
          So workouts match your current ability and schedule.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Fitness level</Label>
          <Select
            value={fitness_level}
            onValueChange={(v) =>
              onChange({ ...value, fitness_level: v as FitnessLevel })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="athlete">Athlete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Activity level</Label>
          <Select
            value={current_activity_level}
            onValueChange={(v) =>
              onChange({
                ...value,
                current_activity_level: v as ActivityLevel,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary</SelectItem>
              <SelectItem value="lightly_active">Lightly active</SelectItem>
              <SelectItem value="moderately_active">
                Moderately active
              </SelectItem>
              <SelectItem value="very_active">Very active</SelectItem>
              <SelectItem value="extremely_active">Extremely active</SelectItem>
            </SelectContent>
          </Select>
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
