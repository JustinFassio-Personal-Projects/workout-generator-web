"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionData } from "@/types/support";

// ============================================
// Component
// ============================================

interface QuestionFlowProps {
  value: QuestionData;
  onChange: (data: QuestionData) => void;
  disabled?: boolean;
}

export function QuestionFlow({ value, onChange, disabled }: QuestionFlowProps) {
  const updateField = <K extends keyof QuestionData>(
    field: K,
    fieldValue: QuestionData[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="topic">
          Topic <span className="text-destructive">*</span>
        </Label>
        <Input
          id="topic"
          value={value.topic}
          onChange={(e) => updateField("topic", e.target.value)}
          disabled={disabled}
          placeholder="e.g., How do I track progress?, Can I share workouts?"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="question">
          Question <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="question"
          value={value.question}
          onChange={(e) => updateField("question", e.target.value)}
          disabled={disabled}
          placeholder="Ask your question here..."
          rows={6}
          required
        />
      </div>
    </div>
  );
}
