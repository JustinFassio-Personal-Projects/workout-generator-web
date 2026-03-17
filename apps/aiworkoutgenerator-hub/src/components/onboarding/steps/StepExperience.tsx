"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";
import {
  SPORTS_BACKGROUND_OPTIONS,
  PREVIOUS_TRAINING_PROGRAMS,
} from "@/lib/profile-phase2-options";

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext?: () => void;
  onBack: () => void;
};

export function StepExperience({ value, onChange, onNext, onBack }: Props) {
  const selectedSports = new Set(value.sports_background ?? []);
  const selectedPrograms = new Set(value.previous_training_programs ?? []);

  const toggleSport = (sport: string) => {
    const next = new Set(selectedSports);
    if (next.has(sport)) next.delete(sport);
    else next.add(sport);
    onChange({
      ...value,
      sports_background: Array.from(next),
    });
  };

  const toggleProgram = (program: string) => {
    const next = new Set(selectedPrograms);
    if (next.has(program)) next.delete(program);
    else next.add(program);
    onChange({
      ...value,
      previous_training_programs: Array.from(next),
    });
  };

  // This step is optional - user can skip it
  const canContinue = true;

  const formatLabel = (str: string): string => {
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Experience & background</h2>
        <p className="text-sm text-muted-foreground">
          Tell us about your training history. All fields are optional.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="training_experience_years">
          Years of training experience
        </Label>
        <Input
          id="training_experience_years"
          type="number"
          min="0"
          max="50"
          value={value.training_experience_years ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              training_experience_years: e.target.value
                ? parseInt(e.target.value, 10)
                : null,
            })
          }
          placeholder="e.g., 5"
        />
        <p className="text-xs text-muted-foreground">
          Enter 0 if you&apos;re just starting out
        </p>
      </div>

      <div className="space-y-2">
        <Label>Sports background</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Select any sports or activities you&apos;ve participated in
        </p>
        <div className="grid gap-3 sm:grid-cols-2 max-h-48 overflow-y-auto border rounded-md p-3">
          {SPORTS_BACKGROUND_OPTIONS.map((sport) => (
            <label
              key={sport}
              className="flex items-center gap-3 rounded-lg border p-2 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedSports.has(sport)}
                onCheckedChange={() => toggleSport(sport)}
              />
              <Label className="cursor-pointer text-sm">
                {formatLabel(sport)}
              </Label>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Previous training programs</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Select any programs you&apos;ve followed before
        </p>
        <div className="grid gap-3 sm:grid-cols-2 max-h-48 overflow-y-auto border rounded-md p-3">
          {PREVIOUS_TRAINING_PROGRAMS.map((program) => (
            <label
              key={program}
              className="flex items-center gap-3 rounded-lg border p-2 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedPrograms.has(program)}
                onCheckedChange={() => toggleProgram(program)}
              />
              <Label className="cursor-pointer text-sm">
                {formatLabel(program)}
              </Label>
            </label>
          ))}
        </div>
      </div>

      {onNext && (
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={onNext}>
            {canContinue ? "Continue" : "Skip"}
          </Button>
        </div>
      )}
    </div>
  );
}
