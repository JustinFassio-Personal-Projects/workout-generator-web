"use client";

import { useEffect, useMemo } from "react";
import { Check, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAvailableCategories,
  getCategoryDisplayLabel,
  validateCategories,
} from "@/lib/equipment-categories";
import type { FitnessLevel } from "@/types/firestore";

type EquipmentCategorySelectorProps = {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  fitnessLevel?: FitnessLevel;
  disabled?: boolean;
};

export function EquipmentCategorySelector({
  selectedCategories,
  onCategoriesChange,
  fitnessLevel,
  disabled = false,
}: EquipmentCategorySelectorProps) {
  // Get available categories for the fitness level
  const availableCategories = useMemo(
    () => getAvailableCategories(fitnessLevel),
    [fitnessLevel]
  );

  // Validate selected categories against fitness level
  const validSelectedCategories = useMemo(() => {
    if (!fitnessLevel) return selectedCategories;
    return validateCategories(selectedCategories, fitnessLevel);
  }, [selectedCategories, fitnessLevel]);

  // Ensure selected categories are valid (remove invalid ones)
  useEffect(() => {
    if (
      validSelectedCategories.length !== selectedCategories.length &&
      !disabled &&
      fitnessLevel
    ) {
      onCategoriesChange(validSelectedCategories);
    }
  }, [
    validSelectedCategories,
    selectedCategories,
    onCategoriesChange,
    disabled,
    fitnessLevel,
  ]);

  const toggleCategory = (category: string) => {
    if (disabled) return;

    const isSelected = selectedCategories.includes(category);
    if (isSelected) {
      onCategoriesChange(selectedCategories.filter((cat) => cat !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const selectedCount = selectedCategories.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Equipment Categories</div>
        {selectedCount > 0 && (
          <div className="text-sm text-primary font-medium">
            {selectedCount}{" "}
            {selectedCount === 1 ? "category selected" : "categories selected"}
          </div>
        )}
      </div>

      {/* Horizontal scrolling container for available categories */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {availableCategories.map((category) => {
            const isSelected = selectedCategories.includes(category);
            const displayLabel = getCategoryDisplayLabel(category);

            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all",
                  "whitespace-nowrap",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/50"
                )}
              >
                <Dumbbell
                  className={cn(
                    "w-4 h-4",
                    isSelected
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-medium">{displayLabel}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected categories container (if any selected) */}
      {selectedCount > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Selected categories will automatically match equipment items
          </div>
        </div>
      )}
    </div>
  );
}
