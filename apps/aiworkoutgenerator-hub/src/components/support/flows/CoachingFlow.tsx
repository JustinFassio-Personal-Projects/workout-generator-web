"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CoachingData } from "@/types/support";

// ============================================
// Component
// ============================================

interface CoachingFlowProps {
  value: CoachingData;
  onChange: (data: CoachingData) => void;
  disabled?: boolean;
}

export function CoachingFlow({ value, onChange, disabled }: CoachingFlowProps) {
  const updateField = <K extends keyof CoachingData>(
    field: K,
    fieldValue: CoachingData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="whatNeedHelpWith">
          What do you need help with?{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="whatNeedHelpWith"
          value={value.whatNeedHelpWith}
          onChange={(e) => updateField("whatNeedHelpWith", e.target.value)}
          disabled={disabled}
          placeholder="Accountability, progression, form checks, nutrition structure..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currentChallenges">
          Current challenges <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="currentChallenges"
          value={value.currentChallenges || ""}
          onChange={(e) => updateField("currentChallenges", e.target.value)}
          disabled={disabled}
          placeholder="What obstacles are you facing?"
          rows={4}
          required
        />
      </div>
    </div>
  );
}
