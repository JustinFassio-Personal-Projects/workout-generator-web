"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PhaseBData } from "@/hooks/usePhaseBWizard";
import type { WebsiteOnboardingData } from "@/types/websiteOnboarding";
import type { EquipmentItem } from "@/types/firestore";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { getDbInstance } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Static fallback equipment list for when Firestore fetch fails.
 * Based on common equipment items from seed data.
 */
const FALLBACK_EQUIPMENT: Omit<EquipmentItem, "created_at" | "updated_at">[] = [
  {
    id: "dumbbells",
    name: "Dumbbells",
    category: "weights",
    icon: null,
    requires_gym: false,
    typical_for_home: true,
    can_adjust_weight: true,
    weight_range_kg: { min: 1, max: 50 },
    is_active: true,
    display_order: 1,
  },
  {
    id: "barbell",
    name: "Barbell",
    category: "weights",
    icon: null,
    requires_gym: false,
    typical_for_home: true,
    can_adjust_weight: true,
    weight_range_kg: { min: 10, max: 200 },
    is_active: true,
    display_order: 2,
  },
  {
    id: "kettlebell",
    name: "Kettlebell",
    category: "weights",
    icon: null,
    requires_gym: false,
    typical_for_home: true,
    can_adjust_weight: false,
    weight_range_kg: { min: 4, max: 48 },
    is_active: true,
    display_order: 3,
  },
  {
    id: "resistance_bands",
    name: "Resistance Bands",
    category: "accessories",
    icon: null,
    requires_gym: false,
    typical_for_home: true,
    can_adjust_weight: false,
    weight_range_kg: null,
    is_active: true,
    display_order: 4,
  },
  {
    id: "pull_up_bar",
    name: "Pull-up Bar",
    category: "accessories",
    icon: null,
    requires_gym: false,
    typical_for_home: true,
    can_adjust_weight: false,
    weight_range_kg: null,
    is_active: true,
    display_order: 5,
  },
  {
    id: "cable_machine",
    name: "Cable Machine",
    category: "weights",
    icon: null,
    requires_gym: true,
    typical_for_home: false,
    can_adjust_weight: true,
    weight_range_kg: { min: 5, max: 100 },
    is_active: true,
    display_order: 6,
  },
  {
    id: "machines",
    name: "Machines",
    category: "weights",
    icon: null,
    requires_gym: true,
    typical_for_home: false,
    can_adjust_weight: true,
    weight_range_kg: null,
    is_active: true,
    display_order: 7,
  },
  {
    id: "treadmill",
    name: "Treadmill",
    category: "cardio",
    icon: null,
    requires_gym: false,
    typical_for_home: true,
    can_adjust_weight: false,
    weight_range_kg: null,
    is_active: true,
    display_order: 8,
  },
  {
    id: "stationary_bike",
    name: "Stationary Bike",
    category: "cardio",
    icon: null,
    requires_gym: false,
    typical_for_home: true,
    can_adjust_weight: false,
    weight_range_kg: null,
    is_active: true,
    display_order: 9,
  },
];

/**
 * Converts fallback equipment to full EquipmentItem with timestamps
 */
function createFallbackEquipmentItem(
  item: Omit<EquipmentItem, "created_at" | "updated_at">
): EquipmentItem {
  const now = Timestamp.now();
  return {
    ...item,
    created_at: now,
    updated_at: now,
  };
}

type ContentProps = {
  value: PhaseBData;
  phaseAData: WebsiteOnboardingData;
  onChange: (updates: Partial<PhaseBData>) => void;
};

type Props = ContentProps & {
  onNext: () => void;
  onBack: () => void;
};

/**
 * Equipment selection content (without navigation buttons).
 * Used by PhaseBWizard for the final step with custom completion button.
 */
export function StepPhaseBEquipmentContent({
  value,
  phaseAData,
  onChange,
}: ContentProps) {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  // Fetch equipment items from Firestore
  useEffect(() => {
    async function fetchEquipment() {
      try {
        const db = getDbInstance();
        const equipmentRef = collection(db, "equipment_items");
        const q = query(
          equipmentRef,
          where("is_active", "==", true),
          orderBy("display_order", "asc")
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as EquipmentItem
        );
        setEquipment(items);
        setUsingFallback(false);
      } catch (error) {
        console.error("Failed to fetch equipment from Firestore:", error);
        // Use fallback equipment list when Firestore fetch fails
        const fallbackItems = FALLBACK_EQUIPMENT.map(
          createFallbackEquipmentItem
        );
        setEquipment(fallbackItems);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    }

    fetchEquipment();
  }, []);

  // Filter equipment based on equipment_access from Phase A
  // equipment_access is now string[] of categories (or legacy enum string for backward compatibility)
  const filteredEquipment = equipment.filter((item) => {
    const equipmentAccess = phaseAData.equipment_access;

    // Handle new format: string[] of categories
    if (Array.isArray(equipmentAccess)) {
      if (equipmentAccess.length === 0) {
        // No categories selected - only show bodyweight accessories
        return !item.requires_gym && item.category === "accessories";
      }
      // Filter by categories - show items that match any selected category
      // Items without categories are excluded when category filters are active;
      // seed data ensures all items have a categories field.
      // Normalize both sides for case-insensitive comparison (consistent with EquipmentCategoryService)
      if (!item.categories || item.categories.length === 0) {
        return false;
      }
      const normalizedAccess = equipmentAccess.map((c) =>
        c.toLowerCase().trim()
      );
      return item.categories.some((cat) =>
        normalizedAccess.includes(cat.toLowerCase().trim())
      );
    }

    // Legacy format: enum string (for backward compatibility)
    if (typeof equipmentAccess === "string") {
      switch (equipmentAccess) {
        case "none":
          return !item.requires_gym && item.category === "accessories";
        case "minimal":
          return item.typical_for_home && !item.requires_gym;
        case "home":
          return item.typical_for_home;
        case "full_gym":
          return true;
        default:
          return true;
      }
    }

    // Fallback: show all equipment
    return true;
  });

  const selectedSet = new Set(value.available_equipment);

  const toggleEquipment = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange({ available_equipment: Array.from(next) });
  };

  // Get description based on equipment access
  const getDescription = () => {
    const equipmentAccess = phaseAData.equipment_access;

    // Handle new format: string[] of categories
    if (Array.isArray(equipmentAccess)) {
      if (equipmentAccess.length === 0) {
        return "Select any equipment you have access to.";
      }
      // Show generic message for category-based selection
      return "Select the equipment you have available based on your selected categories.";
    }

    // Legacy format: enum string (for backward compatibility)
    if (typeof equipmentAccess === "string") {
      switch (equipmentAccess) {
        case "minimal":
          return "Select the basic equipment you have available at home.";
        case "home":
          return "Select all the equipment you have in your home gym.";
        case "full_gym":
          return "Select the equipment available at your gym.";
        default:
          return "Select any equipment you have access to.";
      }
    }

    return "Select any equipment you have access to.";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Your equipment</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 rounded-lg border bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Your equipment</h2>
        <p className="text-sm text-muted-foreground">{getDescription()}</p>
      </div>

      {/* Show warning if using fallback data */}
      {usingFallback && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
            Showing common equipment options. If your equipment isn&apos;t
            listed, you can still proceed — we&apos;ll adapt workouts to your
            equipment access level.
          </AlertDescription>
        </Alert>
      )}

      {filteredEquipment.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredEquipment.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedSet.has(item.id)}
                onCheckedChange={() => toggleEquipment(item.id)}
              />
              <Label className="cursor-pointer">{item.name}</Label>
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <p>No specific equipment selection needed.</p>
          <p className="text-sm mt-1">
            We&apos;ll generate workouts based on your equipment access level.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Don&apos;t worry if you don&apos;t have everything — we&apos;ll adapt
        your workouts accordingly.
      </p>
    </>
  );
}

/**
 * Phase B step for selecting available equipment items.
 * Filters equipment based on equipment_access from Phase A.
 * Includes navigation buttons.
 */
export function StepPhaseBEquipment({
  value,
  phaseAData,
  onChange,
  onNext,
  onBack,
}: Props) {
  return (
    <div className="space-y-6">
      <StepPhaseBEquipmentContent
        value={value}
        phaseAData={phaseAData}
        onChange={onChange}
      />

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
