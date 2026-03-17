"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BugReportData } from "@/types/support";

// ============================================
// Component
// ============================================

interface BugReportFlowProps {
  value: BugReportData;
  onChange: (data: BugReportData) => void;
  disabled?: boolean;
}

export function BugReportFlow({
  value,
  onChange,
  disabled,
}: BugReportFlowProps) {
  const updateField = <K extends keyof BugReportData>(
    field: K,
    fieldValue: BugReportData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="whatHappened">
          What happened? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="whatHappened"
          value={value.whatHappened}
          onChange={(e) => updateField("whatHappened", e.target.value)}
          disabled={disabled}
          placeholder="Describe the issue you encountered..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stepsToReproduce">
          Steps to reproduce <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="stepsToReproduce"
          value={value.stepsToReproduce || ""}
          onChange={(e) => updateField("stepsToReproduce", e.target.value)}
          disabled={disabled}
          placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedVsActual">
          Expected vs actual behavior{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="expectedVsActual"
          value={value.expectedVsActual || ""}
          onChange={(e) => updateField("expectedVsActual", e.target.value)}
          disabled={disabled}
          placeholder="Expected: ...&#10;Actual: ..."
          rows={4}
          required
        />
      </div>
    </div>
  );
}
