"use client";

import { Button } from "@/components/ui/button";
import { EquipmentSelector } from "@/components/shared/EquipmentSelector";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";

type Props = {
  value: Partial<Phase1ProfileInput>;
  onChange: (next: Partial<Phase1ProfileInput>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepEquipment({ value, onChange, onNext, onBack }: Props) {
  const equipment_categories = value.equipment_access ?? []; // Now string[] instead of enum
  const available_equipment = value.available_equipment ?? [];
  const fitness_level = value.fitness_level;

  // Equipment categories can be empty (bodyweight-only workouts)
  // Validation: At least one category should be selected (or empty array is valid for bodyweight)
  const isValid = Array.isArray(equipment_categories);

  return (
    <div className="space-y-6">
      <EquipmentSelector
        equipmentCategories={equipment_categories}
        availableEquipment={available_equipment}
        onEquipmentCategoriesChange={(categories) =>
          onChange({ ...value, equipment_access: categories })
        }
        onAvailableEquipmentChange={(equipment) =>
          onChange({ ...value, available_equipment: equipment })
        }
        showTitle={true}
        fitnessLevel={fitness_level}
      />

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext} disabled={!isValid}>
          Continue
        </Button>
      </div>
    </div>
  );
}
