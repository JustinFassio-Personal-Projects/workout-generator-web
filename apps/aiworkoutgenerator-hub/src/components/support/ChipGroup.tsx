"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================
// Types
// ============================================

export interface ChipOption<T = string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T = string> {
  options: ChipOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
}

// ============================================
// Component
// ============================================

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = true,
  className,
  disabled = false,
}: ChipGroupProps<T>) {
  const handleToggle = (optionValue: T) => {
    if (disabled) return;

    if (multiple) {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    } else {
      onChange(value.includes(optionValue) ? [] : [optionValue]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => handleToggle(option.value)}
            disabled={disabled}
            className={cn(
              "rounded-full",
              isSelected && "bg-primary text-primary-foreground"
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
