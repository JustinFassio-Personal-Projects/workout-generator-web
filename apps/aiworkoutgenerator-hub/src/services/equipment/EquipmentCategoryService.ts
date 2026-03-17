import { TrainerEquipmentService } from "@/services/trainer/TrainerEquipmentService";
import type { EquipmentItem } from "@/types/firestore";

/**
 * Service for mapping equipment category strings to equipment item IDs.
 * Used to pre-populate equipment selections from website wizard categories.
 */
export class EquipmentCategoryService {
  /**
   * Get equipment items that match any of the provided category strings.
   * Matches are case-insensitive and check against the equipment item's `categories` array.
   *
   * @param categories - Array of category strings (e.g., ["general", "strength", "functional"])
   * @returns Array of matching equipment items, sorted by display_order
   */
  static async getEquipmentItemsByCategories(
    categories: string[]
  ): Promise<EquipmentItem[]> {
    if (categories.length === 0) {
      return [];
    }

    const allItems = await TrainerEquipmentService.getAllEquipmentItems();
    const categorySet = new Set(
      categories.map((c) => c.toLowerCase().trim()).filter((c) => c.length > 0)
    );

    const filtered = allItems
      .filter((item) =>
        item.categories?.some((cat) =>
          categorySet.has(cat.toLowerCase().trim())
        )
      )
      .sort((a, b) => a.display_order - b.display_order);

    return filtered;
  }

  /**
   * Get equipment item IDs that match any of the provided category strings.
   * Convenience wrapper that returns just the IDs.
   *
   * @param categories - Array of category strings (e.g., ["general", "strength", "functional"])
   * @returns Array of matching equipment item IDs
   */
  static async getEquipmentIdsByCategories(
    categories: string[]
  ): Promise<string[]> {
    const items = await this.getEquipmentItemsByCategories(categories);
    return items.map((item) => item.id);
  }
}
