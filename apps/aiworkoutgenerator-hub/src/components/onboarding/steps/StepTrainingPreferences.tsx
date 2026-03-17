"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";
import {
  WORKOUT_DURATIONS,
  WORKOUT_FREQUENCY_OPTIONS,
  WORKOUT_TIMES,
  REST_BETWEEN_SETS_OPTIONS,
} from "@/lib/profile-phase2-options";

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepTrainingPreferences({
  value,
  onChange,
  onNext,
  onBack,
}: Props) {
  const selectedTimes = new Set(value.preferred_workout_times ?? []);

  const toggleTime = (time: string) => {
    const next = new Set(selectedTimes);
    if (next.has(time)) next.delete(time);
    else next.add(time);
    onChange({
      ...value,
      preferred_workout_times: Array.from(next),
    });
  };

  // This step is optional - user can skip it
  const canContinue = true;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Training preferences</h2>
        <p className="text-sm text-muted-foreground">
          Help us customize your workout schedule. All fields are optional.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="preferred_workout_duration">
            Preferred workout duration (minutes)
          </Label>
          <Select
            value={value.preferred_workout_duration?.toString() ?? undefined}
            onValueChange={(v) =>
              onChange({
                ...value,
                preferred_workout_duration: parseInt(v, 10),
              })
            }
          >
            <SelectTrigger id="preferred_workout_duration">
              <SelectValue placeholder="Select duration (optional)" />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_DURATIONS.map((duration) => (
                <SelectItem key={duration} value={duration.toString()}>
                  {duration} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workout_frequency_per_week">Workouts per week</Label>
          <Select
            value={value.workout_frequency_per_week?.toString() ?? undefined}
            onValueChange={(v) =>
              onChange({
                ...value,
                workout_frequency_per_week: parseInt(v, 10),
              })
            }
          >
            <SelectTrigger id="workout_frequency_per_week">
              <SelectValue placeholder="Select frequency (optional)" />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_FREQUENCY_OPTIONS.map((freq) => (
                <SelectItem key={freq} value={freq.toString()}>
                  {freq} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred workout times</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {WORKOUT_TIMES.map((time) => (
            <label
              key={time}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedTimes.has(time)}
                onCheckedChange={() => toggleTime(time)}
              />
              <Label className="cursor-pointer capitalize">{time}</Label>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferred_rest_between_sets">
          Rest between sets (seconds)
        </Label>
        <Select
          value={value.preferred_rest_between_sets?.toString() ?? undefined}
          onValueChange={(v) =>
            onChange({
              ...value,
              preferred_rest_between_sets: parseInt(v, 10),
            })
          }
        >
          <SelectTrigger id="preferred_rest_between_sets">
            <SelectValue placeholder="Select rest time (optional)" />
          </SelectTrigger>
          <SelectContent>
            {REST_BETWEEN_SETS_OPTIONS.map((rest) => (
              <SelectItem key={rest} value={rest.toString()}>
                {rest} seconds
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          {canContinue ? "Continue" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
