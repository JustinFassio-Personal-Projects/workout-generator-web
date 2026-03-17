"use client";

import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Gender } from "@/types/firestore";

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext: () => void;
};

export function StepBasicInfo({ value, onChange, onNext }: Props) {
  const gender = (value.gender ?? "prefer_not_to_say") as Gender;
  const hasInitializedGender = useRef(false);
  const valueRef = useRef(value);

  // Keep ref in sync with value to avoid stale closures
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Ensure the displayed default is also reflected in form state (so saved profile isn't missing required fields).
  // Only initialize once to avoid infinite loops
  useEffect(() => {
    if (!value.gender && !hasInitializedGender.current) {
      // Use ref to get current value and avoid stale closure
      onChange({ ...valueRef.current, gender: "prefer_not_to_say" as Gender });
      hasInitializedGender.current = true;
    } else if (value.gender) {
      hasInitializedGender.current = true;
    }
  }, [value.gender, onChange]);

  // Validate that all required fields are filled
  // Use useMemo to ensure validation recalculates when value changes
  const canContinue = useMemo(() => {
    const first_name = value.first_name?.trim() ?? "";
    const last_name = value.last_name?.trim() ?? "";
    // gender is always set (either by user or default via useEffect)
    return first_name.length > 0 && last_name.length > 0 && !!value.gender;
  }, [value.first_name, value.last_name, value.gender]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Basic info</h2>
        <p className="text-sm text-muted-foreground">
          This helps personalize your experience.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            value={value.first_name ?? ""}
            onChange={(e) => onChange({ ...value, first_name: e.target.value })}
            placeholder="Jane"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            value={value.last_name ?? ""}
            onChange={(e) => onChange({ ...value, last_name: e.target.value })}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Gender</Label>
        <Select
          value={gender}
          onValueChange={(v) => onChange({ ...value, gender: v as Gender })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="non_binary">Non-binary</SelectItem>
            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onNext} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
