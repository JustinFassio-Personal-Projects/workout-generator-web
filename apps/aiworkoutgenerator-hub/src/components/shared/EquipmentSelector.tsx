"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/auth";
import { getDbInstance } from "@/lib/firestore";
import { TrainerEquipmentService } from "@/services/trainer/TrainerEquipmentService";
import { EquipmentCategoryService } from "@/services/equipment/EquipmentCategoryService";
import { EquipmentCategorySelector } from "@/components/shared/EquipmentCategorySelector";
import { getCategoryDisplayLabel } from "@/lib/equipment-categories";
import type { TrainerId } from "@/types/trainer";
import type { EquipmentItem, FitnessLevel } from "@/types/firestore";

type EquipmentSelectorProps = {
  equipmentCategories: string[]; // Changed from equipmentAccess enum to string[] categories
  availableEquipment: string[];
  onEquipmentCategoriesChange: (categories: string[]) => void;
  onAvailableEquipmentChange: (equipment: string[]) => void;
  loading?: boolean;
  error?: string | null;
  showTitle?: boolean;
  // NEW PROPS
  trainerId?: TrainerId; // Filter equipment by trainer
  focusId?: string | null; // Filter equipment by focus (null = blend mode)
  fitnessLevel?: FitnessLevel; // Filter categories by fitness level
  userAvailableEquipment?: string[]; // User's source of truth equipment IDs (for documentation/future use, not used for filtering display)
};

export function EquipmentSelector({
  equipmentCategories,
  availableEquipment,
  onEquipmentCategoriesChange,
  onAvailableEquipmentChange,
  loading: externalLoading,
  error: externalError,
  showTitle = true,
  trainerId,
  focusId,
  fitnessLevel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userAvailableEquipment, // Reserved for future use (documentation)
}: EquipmentSelectorProps) {
  const { user, loading: authLoading } = useUser();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isMappingCategories, setIsMappingCategories] = useState(false);
  const [isGroupingEquipment, setIsGroupingEquipment] = useState(false);
  const prevCategoriesRef = useRef<string[]>(equipmentCategories);

  const loading = externalLoading ?? internalLoading;
  const error = externalError ?? internalError;

  const selected = useMemo(
    () => new Set(availableEquipment),
    [availableEquipment]
  );

  // State to hold equipment items grouped by category (fetched when categories change)
  const [equipmentByCategory, setEquipmentByCategory] = useState<
    Record<string, EquipmentItem[]>
  >({});

  // Fetch and group equipment items by category when categories change
  useEffect(() => {
    if (equipmentCategories.length === 0) {
      setEquipmentByCategory({});
      return;
    }

    // Don't fetch if user is not authenticated yet
    if (authLoading || !user) {
      return;
    }

    // Don't fetch if still mapping categories (to avoid duplicate fetches)
    if (isMappingCategories) {
      return;
    }

    let active = true;
    setIsGroupingEquipment(true);

    (async () => {
      try {
        // Use the same service that auto-selection uses to ensure consistency
        const allMatchingItems =
          await EquipmentCategoryService.getEquipmentItemsByCategories(
            equipmentCategories
          );

        if (!active) return;

        // Group items by category
        const grouped: Record<string, EquipmentItem[]> = {};

        // Initialize groups for each selected category
        equipmentCategories.forEach((category) => {
          grouped[category] = [];
        });

        // Group items by their categories
        allMatchingItems.forEach((item) => {
          // Filter out inactive items
          if (item.is_active === false) {
            return;
          }

          equipmentCategories.forEach((category) => {
            // Check if item belongs to this category
            if (item.categories?.includes(category)) {
              if (!grouped[category]) {
                grouped[category] = [];
              }
              // Avoid duplicates
              if (!grouped[category].some((i) => i.id === item.id)) {
                grouped[category].push(item);
              }
            }
          });
        });

        // Sort items within each category by display_order
        Object.keys(grouped).forEach((category) => {
          grouped[category].sort((a, b) => a.display_order - b.display_order);
        });

        if (active) {
          setEquipmentByCategory(grouped);
        }
      } catch (error) {
        console.error(
          "[EquipmentSelector] Failed to group equipment by category:",
          error
        );
        if (active) {
          setEquipmentByCategory({});
        }
      } finally {
        if (active) {
          setIsGroupingEquipment(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [equipmentCategories, authLoading, user, isMappingCategories]);

  // Auto-map categories to equipment items when categories change
  // Use ref to track previous categories - only auto-select when categories actually change
  // This prevents overriding user's manual equipment selections
  useEffect(() => {
    // Check if categories actually changed (compare arrays by value)
    const categoriesChanged =
      prevCategoriesRef.current.length !== equipmentCategories.length ||
      prevCategoriesRef.current.some(
        (cat) => !equipmentCategories.includes(cat)
      ) ||
      equipmentCategories.some(
        (cat) => !prevCategoriesRef.current.includes(cat)
      );

    // Update ref for next comparison
    prevCategoriesRef.current = equipmentCategories;

    // Skip if categories haven't changed (prevents unnecessary fetches and infinite loops)
    if (!categoriesChanged) {
      return;
    }

    // Handle empty categories
    if (equipmentCategories.length === 0) {
      // No categories selected - clear equipment only if it's not already empty
      if (availableEquipment.length > 0) {
        onAvailableEquipmentChange([]);
      }
      return;
    }

    let active = true;
    setIsMappingCategories(true);

    (async () => {
      try {
        const matchingItems =
          await EquipmentCategoryService.getEquipmentItemsByCategories(
            equipmentCategories
          );
        const equipmentIds = matchingItems.map((item) => item.id);

        if (active) {
          // When categories change, auto-select all matching equipment items
          // This creates the initial "source of truth" - users can then deselect items they don't have
          const currentIds = new Set(availableEquipment);
          const newIds = new Set(equipmentIds);

          // Only update if there's an actual change (prevents infinite loops)
          const hasChanged =
            equipmentIds.length !== availableEquipment.length ||
            equipmentIds.some((id) => !currentIds.has(id)) ||
            availableEquipment.some((id) => !newIds.has(id));

          if (hasChanged) {
            onAvailableEquipmentChange(equipmentIds);
          }
        }
      } catch (error) {
        console.error(
          "[EquipmentSelector] Failed to map categories to equipment:",
          error
        );
        // Don't break the flow - user can still manually select equipment
      } finally {
        if (active) {
          setIsMappingCategories(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [equipmentCategories, availableEquipment, onAvailableEquipmentChange]);

  useEffect(() => {
    // Don't attempt to load equipment if user is not authenticated yet
    if (authLoading || !user) {
      setInternalLoading(true);
      return;
    }

    let active = true;
    (async () => {
      try {
        setInternalLoading(true);
        setInternalError(null);

        let list: EquipmentItem[];

        if (trainerId) {
          // Trainer selected: fetch filtered equipment based on trainer + focus
          list = await TrainerEquipmentService.getFilteredEquipmentForTrainer(
            trainerId,
            focusId
          );
        } else {
          // No trainer selected (onboarding/profile): fetch all equipment
          const db = getDbInstance();
          const q = query(
            collection(db, "equipment_items"),
            orderBy("display_order", "asc")
          );
          const snap = await getDocs(q);

          if (!active) return;

          list = snap.docs.map((d) => {
            const data = d.data() as unknown as Omit<EquipmentItem, "id">;
            return { id: d.id, ...data };
          });
        }

        if (active) {
          setItems(list);
        }
      } catch (e: unknown) {
        console.error("[EquipmentSelector] Failed to load equipment:", e);
        if (active) {
          const errorMessage =
            e instanceof Error ? e.message : "Failed to load equipment";
          setInternalError(errorMessage);
        }
      } finally {
        if (active) setInternalLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading, trainerId, focusId]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onAvailableEquipmentChange(Array.from(next));
  };

  // Toggle all items in a specific category
  const toggleCategoryAll = (category: string) => {
    const categoryItems = equipmentByCategory[category] || [];
    if (categoryItems.length === 0) return;

    const categoryIds = categoryItems.map((item) => item.id);
    const allSelected = categoryIds.every((id) => selected.has(id));

    const next = new Set(selected);
    if (allSelected) {
      // Deselect all in category
      categoryIds.forEach((id) => next.delete(id));
    } else {
      // Select all in category
      categoryIds.forEach((id) => next.add(id));
    }
    onAvailableEquipmentChange(Array.from(next));
  };

  // Toggle all items across all categories
  const toggleAll = () => {
    // Get all equipment IDs from all categories
    const allEquipmentIds = Object.values(equipmentByCategory)
      .flat()
      .map((item) => item.id);

    if (allEquipmentIds.length === 0) return;

    // Check if all are selected
    const allSelected = allEquipmentIds.every((id) => selected.has(id));

    const next = new Set(selected);
    if (allSelected) {
      // Deselect all
      allEquipmentIds.forEach((id) => next.delete(id));
    } else {
      // Select all
      allEquipmentIds.forEach((id) => next.add(id));
    }
    onAvailableEquipmentChange(Array.from(next));
  };

  // Check if all items in a category are selected
  const isCategoryAllSelected = (category: string): boolean => {
    const categoryItems = equipmentByCategory[category] || [];
    if (categoryItems.length === 0) return false;
    return categoryItems.every((item) => selected.has(item.id));
  };

  // Check if all items across all categories are selected
  const isAllSelected = (): boolean => {
    const allEquipmentIds = Object.values(equipmentByCategory)
      .flat()
      .map((item) => item.id);
    if (allEquipmentIds.length === 0) return false;
    return allEquipmentIds.every((id) => selected.has(id));
  };

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Equipment</h2>
          <p className="text-sm text-muted-foreground">
            Tell us what you have access to so we can tailor workouts.
          </p>
        </div>
      )}

      {/* Category selector - replaces the old enum dropdown */}
      <EquipmentCategorySelector
        selectedCategories={equipmentCategories}
        onCategoriesChange={onEquipmentCategoriesChange}
        fitnessLevel={fitnessLevel}
        disabled={loading || isMappingCategories}
      />

      <div className="space-y-4">
        {loading || isMappingCategories || isGroupingEquipment ? (
          <div className="text-sm text-muted-foreground">
            Loading equipment…
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : equipmentCategories.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Select equipment categories above to see matching equipment items.
            You&apos;ll receive bodyweight-only workouts if no categories are
            selected.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All / Deselect All for entire list */}
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAll}
                disabled={
                  Object.values(equipmentByCategory).flat().length === 0
                }
              >
                {isAllSelected() ? "Deselect All" : "Select All"}
              </Button>
            </div>
            {equipmentCategories.map((category) => {
              const categoryItems = equipmentByCategory[category] || [];
              const categoryLabel = getCategoryDisplayLabel(category);

              return (
                <Card key={category} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        {categoryLabel}
                      </CardTitle>
                      {categoryItems.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCategoryAll(category)}
                          className="h-8 text-xs"
                        >
                          {isCategoryAllSelected(category)
                            ? "Deselect All"
                            : "Select All"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {categoryItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">
                        No equipment in this category
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {categoryItems.map((item) => {
                          const isSelected = selected.has(item.id);
                          // Check if item belongs to multiple selected categories
                          const itemCategories = item.categories || [];
                          const belongsToMultipleCategories =
                            itemCategories.filter((cat) =>
                              equipmentCategories.includes(cat)
                            ).length > 1;

                          return (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggle(item.id)}
                              />
                              <div className="flex-1 flex items-center gap-2">
                                <Label className="cursor-pointer flex-1">
                                  {item.name}
                                </Label>
                                {belongsToMultipleCategories && (
                                  <span
                                    className="text-xs text-muted-foreground"
                                    title="This item appears in multiple categories"
                                  >
                                    •
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
