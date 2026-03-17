import { collection, getDocs, query, orderBy } from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import type { TrainerId } from "@/types/trainer";
import type { EquipmentItem, TrainerEquipmentSet } from "@/types/firestore";

/**
 * Service for fetching and filtering trainer-specific equipment sets.
 * All operations are READ-ONLY - users cannot edit or delete equipment sets.
 */
export class TrainerEquipmentService {
  /**
   * Fetch all equipment sets for a trainer from the subcollection.
   * @param trainerId - The trainer ID
   * @returns Array of equipment sets (one per focus)
   */
  static async getTrainerEquipmentSets(
    trainerId: TrainerId
  ): Promise<TrainerEquipmentSet[]> {
    try {
      const db = getDbInstance();
      const equipmentSetsRef = collection(
        db,
        "trainers",
        trainerId,
        "equipment_sets"
      );
      const snap = await getDocs(equipmentSetsRef);

      const sets: TrainerEquipmentSet[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        sets.push({
          focus_id: doc.id, // Document ID is the focus_id
          focus_name: data.focus_name || "",
          equipment_ids: data.equipment_ids || [],
        });
      });

      return sets;
    } catch (error) {
      console.error(
        `[TrainerEquipmentService] Failed to fetch equipment sets for trainer ${trainerId}:`,
        error
      );
      // Return empty array on error (will trigger fallback to all equipment)
      return [];
    }
  }

  /**
   * Determine available equipment IDs based on focus selection.
   * @param sets - All equipment sets for the trainer
   * @param focusId - Selected focus ID, or null/undefined for blend mode
   * @returns Array of equipment item IDs
   */
  static getAvailableEquipmentIds(
    sets: TrainerEquipmentSet[],
    focusId?: string | null
  ): string[] {
    if (focusId) {
      // Focus selected: get equipment for that specific focus
      const focusSet = sets.find((set) => set.focus_id === focusId);
      return focusSet?.equipment_ids || [];
    } else {
      // No focus (blend mode): UNION of all equipment from all focuses
      const allIds = new Set<string>();
      sets.forEach((set) => {
        set.equipment_ids.forEach((id) => allIds.add(id));
      });
      return Array.from(allIds);
    }
  }

  /**
   * Fetch all equipment items from the global collection.
   * @returns Array of all equipment items, sorted by display_order
   */
  static async getAllEquipmentItems(): Promise<EquipmentItem[]> {
    try {
      const db = getDbInstance();
      const q = query(
        collection(db, "equipment_items"),
        orderBy("display_order", "asc")
      );
      const snap = await getDocs(q);

      const items: EquipmentItem[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as unknown as Omit<EquipmentItem, "id">;
        items.push({ id: doc.id, ...data });
      });

      return items;
    } catch (error) {
      console.error(
        "[TrainerEquipmentService] Failed to fetch equipment items:",
        error
      );
      throw error;
    }
  }

  /**
   * Filter equipment items to only include items whose IDs are in the available IDs list.
   * @param availableIds - Array of equipment item IDs to include
   * @param allItems - All equipment items from the collection
   * @returns Filtered and sorted equipment items
   */
  static getFilteredEquipmentItems(
    availableIds: string[],
    allItems: EquipmentItem[]
  ): EquipmentItem[] {
    const availableIdsSet = new Set(availableIds);
    return allItems
      .filter((item) => availableIdsSet.has(item.id))
      .sort((a, b) => a.display_order - b.display_order);
  }

  /**
   * Main method: Get filtered equipment items for a trainer and optional focus.
   * @param trainerId - The trainer ID
   * @param focusId - Optional focus ID (null/undefined for blend mode)
   * @returns Filtered equipment items, or all items if no sets exist (fallback)
   */
  static async getFilteredEquipmentForTrainer(
    trainerId: TrainerId,
    focusId?: string | null
  ): Promise<EquipmentItem[]> {
    try {
      // Fetch all equipment sets for trainer
      const sets = await this.getTrainerEquipmentSets(trainerId);

      // If no sets exist, fallback to all equipment
      if (sets.length === 0) {
        return await this.getAllEquipmentItems();
      }

      // Determine available equipment IDs
      const availableIds = this.getAvailableEquipmentIds(sets, focusId);

      // If no available IDs, return empty array (no equipment for this focus)
      if (availableIds.length === 0) {
        return [];
      }

      // Fetch all equipment items
      const allItems = await this.getAllEquipmentItems();

      // Filter to available items
      return this.getFilteredEquipmentItems(availableIds, allItems);
    } catch (error) {
      console.error(
        `[TrainerEquipmentService] Failed to get filtered equipment for trainer ${trainerId}:`,
        error
      );
      // Fallback to all equipment on error
      return await this.getAllEquipmentItems();
    }
  }
}
