"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLING_ISSUE_TYPES } from "@/lib/support-constants";
import type { BillingData } from "@/types/support";

// ============================================
// Component
// ============================================

interface BillingFlowProps {
  value: BillingData;
  onChange: (data: BillingData) => void;
  disabled?: boolean;
}

export function BillingFlow({ value, onChange, disabled }: BillingFlowProps) {
  const updateField = <K extends keyof BillingData>(
    field: K,
    fieldValue: BillingData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="issueType">
          Issue type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={value.issueType}
          onValueChange={(val) =>
            updateField("issueType", val as BillingData["issueType"])
          }
          disabled={disabled}
        >
          <SelectTrigger id="issueType">
            <SelectValue placeholder="Select issue type" />
          </SelectTrigger>
          <SelectContent>
            {BILLING_ISSUE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={value.description}
          onChange={(e) => updateField("description", e.target.value)}
          disabled={disabled}
          placeholder="Please provide details about your billing issue..."
          rows={6}
          required
        />
      </div>
    </div>
  );
}
