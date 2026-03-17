"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IMPACT_OPTIONS } from "@/lib/support-constants";
import type { SupportImpact } from "@/types/support";
import { cn } from "@/lib/utils";

// ============================================
// Component
// ============================================

interface ImpactSelectorProps {
  value?: SupportImpact;
  onChange: (impact: SupportImpact) => void;
  disabled?: boolean;
}

export function ImpactSelector({
  value,
  onChange,
  disabled,
}: ImpactSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<SupportImpact | undefined>(
    value ?? undefined
  );
  const [pulsingValue, setPulsingValue] = useState<SupportImpact | undefined>(
    undefined
  );

  // Sync with external value prop (only if it actually changed)
  const prevValueRef = useRef<SupportImpact | undefined>(value ?? undefined);
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value ?? undefined;
      // Use setTimeout to defer setState and avoid cascading renders
      setTimeout(() => {
        setSelectedValue(value ?? undefined);
      }, 0);
    }
  }, [value]);

  const handleValueChange = (val: string) => {
    const impact = val as SupportImpact;
    setSelectedValue(impact);
    setPulsingValue(impact);

    // Trigger pulse animation, then call onChange after a brief delay
    // This gives users visual confirmation before navigation
    setTimeout(() => {
      onChange(impact);
      // Clear pulse after animation completes
      setTimeout(() => {
        setPulsingValue(undefined);
      }, 600);
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">How blocked are you?</Label>
        <p className="text-sm text-muted-foreground mt-1">
          This helps us prioritize your request
        </p>
      </div>
      <RadioGroup
        value={selectedValue || ""}
        onValueChange={handleValueChange}
        disabled={disabled}
        className="space-y-3"
      >
        {IMPACT_OPTIONS.map((option) => {
          const isPulsing = pulsingValue === option.value;
          const isSelected = selectedValue === option.value;
          return (
            <div key={option.value} className="flex items-start space-x-3">
              <div className="relative mt-1">
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className={cn(
                    "relative z-10 transition-all duration-200",
                    isPulsing && "scale-110"
                  )}
                />
                {isPulsing && (
                  <>
                    {/* Pulse ring 1 */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-full border-2 border-primary",
                        "animate-ping opacity-75 z-0"
                      )}
                      style={{
                        animation: "ping 0.6s cubic-bezier(0, 0, 0.2, 1)",
                      }}
                    />
                    {/* Pulse ring 2 - delayed */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-full border-2 border-primary",
                        "opacity-50 z-0"
                      )}
                      style={{
                        animation: "ping 0.6s cubic-bezier(0, 0, 0.2, 1) 0.15s",
                      }}
                    />
                  </>
                )}
              </div>
              <div className="flex-1">
                <Label
                  htmlFor={option.value}
                  className={cn(
                    "font-medium cursor-pointer transition-colors",
                    isSelected && isPulsing && "text-primary"
                  )}
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
