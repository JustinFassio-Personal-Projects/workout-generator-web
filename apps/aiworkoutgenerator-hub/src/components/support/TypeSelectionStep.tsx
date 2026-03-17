"use client";

import {
  MessageCircle,
  Bug,
  CreditCard,
  Lightbulb,
  Users,
  CircleHelp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SUPPORT_TYPE_OPTIONS } from "@/lib/support-constants";
import type { SupportRequestType } from "@/types/support";
import { trackSupportTypeSelected } from "@/lib/analytics";

// ============================================
// Component
// ============================================

interface TypeSelectionStepProps {
  onSelect: (type: SupportRequestType) => void;
  disabled?: boolean;
}

const TYPE_ICONS = {
  workout_feedback: MessageCircle,
  bug: Bug,
  billing: CreditCard,
  feature: Lightbulb,
  coaching: Users,
  question: CircleHelp,
} as const;

export function TypeSelectionStep({
  onSelect,
  disabled,
}: TypeSelectionStepProps) {
  const handleSelect = (type: SupportRequestType) => {
    if (disabled) return;
    trackSupportTypeSelected(type);
    onSelect(type);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">What do you need right now?</h3>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {SUPPORT_TYPE_OPTIONS.map((option) => {
          const Icon = TYPE_ICONS[option.value];
          return (
            <Card
              key={option.value}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
              onClick={() => handleSelect(option.value)}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <CardTitle className="text-base">{option.label}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {option.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
