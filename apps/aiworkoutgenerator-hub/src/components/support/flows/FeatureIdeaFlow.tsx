"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FeatureIdeaData } from "@/types/support";

// ============================================
// Component
// ============================================

interface FeatureIdeaFlowProps {
  value: FeatureIdeaData;
  onChange: (data: FeatureIdeaData) => void;
  disabled?: boolean;
}

export function FeatureIdeaFlow({
  value,
  onChange,
  disabled,
}: FeatureIdeaFlowProps) {
  const updateField = <K extends keyof FeatureIdeaData>(
    field: K,
    fieldValue: FeatureIdeaData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="featureName">
          What feature? <span className="text-destructive">*</span>
        </Label>
        <Input
          id="featureName"
          value={value.featureName}
          onChange={(e) => updateField("featureName", e.target.value)}
          disabled={disabled}
          placeholder="e.g., Workout sharing, Progress photos..."
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whyHelpful">
          Why would this help? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="whyHelpful"
          value={value.whyHelpful}
          onChange={(e) => updateField("whyHelpful", e.target.value)}
          disabled={disabled}
          placeholder="Tell us how this feature would improve your experience..."
          rows={6}
          required
        />
      </div>
    </div>
  );
}
