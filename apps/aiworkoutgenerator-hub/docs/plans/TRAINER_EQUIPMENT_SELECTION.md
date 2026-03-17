# Trainer Equipment Selection - Frontend Implementation Guide

## Overview

This document describes how to implement the equipment selection UI for frontend users. The system allows users to select equipment they have available based on their chosen trainer and focus area.

## Data Structure

### Equipment Items

Equipment items are stored in the `equipment_items` collection with the following structure:

```typescript
interface EquipmentItem {
  id: string; // Unique equipment ID (e.g., "barbell", "dumbbells")
  name: string; // Display name (e.g., "Barbell", "Dumbbells")
  display_order: number; // Sort order for display
  categories: string[]; // Array of category tags (e.g., ["strength", "general"])
  primary_category?: string; // Main category (e.g., "Free Weights", "Cardio")
  sub_category?: string; // Sub-category (e.g., "Olympic Barbell", "Adjustable")
  description?: string; // Optional description
}
```

### Trainer Equipment Sets

Trainer-specific equipment sets are stored in `trainers/{trainerId}/equipment_sets/{focusId}` subcollections:

```typescript
interface TrainerEquipmentSet {
  focus_id: string; // ID of the focus (e.g., "strength", "yoga")
  focus_name: string; // Display name (e.g., "Strength Training", "Hatha Yoga")
  equipment_ids: string[]; // Array of equipment_item IDs available for this focus
}
```

## API Endpoints

### Get Trainer Equipment Sets

**Server Action**: `getTrainerEquipmentSets(request: GetTrainerEquipmentSetsRequest)`

```typescript
// Request
interface GetTrainerEquipmentSetsRequest {
  trainerId: string;
}

// Response
interface GetTrainerEquipmentSetsResponse {
  success: boolean;
  equipmentSets?: Array<{
    focus_id: string;
    focus_name: string;
    equipment_ids: string[];
  }>;
  error?: string;
}
```

**Usage**:

```typescript
import { getTrainerEquipmentSets } from "@/app/actions/ai-trainer-manager";

const result = await getTrainerEquipmentSets({ trainerId: "trainer-123" });
if (result.success && result.equipmentSets) {
  // Process equipment sets
}
```

### List Equipment Items

**Server Action**: `listEquipmentItems(request?: ListEquipmentItemsRequest)`

```typescript
// Request (optional)
interface ListEquipmentItemsRequest {
  category?: string; // Optional category filter
}

// Response
interface ListEquipmentItemsResponse {
  success: boolean;
  equipment?: Array<{
    id: string;
    name: string;
    display_order: number;
    categories: string[];
    primary_category?: string;
    sub_category?: string;
  }>;
  error?: string;
}
```

**Usage**:

```typescript
import { listEquipmentItems } from "@/app/actions/ai-trainer-manager";

// Get all equipment
const allEquipment = await listEquipmentItems();

// Get equipment filtered by category
const strengthEquipment = await listEquipmentItems({ category: "strength" });
```

## Filtering Logic

### Step 1: Determine Available Equipment

The available equipment depends on whether a focus is selected:

#### Case A: No Focus Selected

When no focus is selected, show the **union** of all equipment from all focus sets for the trainer:

```typescript
function getAvailableEquipmentNoFocus(
  equipmentSets: TrainerEquipmentSet[]
): string[] {
  // Union of all equipment_ids across all focus sets
  const allEquipmentIds = new Set<string>();

  equipmentSets.forEach((set) => {
    set.equipment_ids.forEach((id) => allEquipmentIds.add(id));
  });

  return Array.from(allEquipmentIds);
}
```

**Example**:

- Trainer has 3 focuses: "Strength", "Cardio", "Yoga"
- Strength equipment: `["barbell", "dumbbells", "bench"]`
- Cardio equipment: `["treadmill", "bike", "dumbbells"]`
- Yoga equipment: `["yoga_mat", "blocks", "strap"]`
- **Result**: `["barbell", "dumbbells", "bench", "treadmill", "bike", "yoga_mat", "blocks", "strap"]`

#### Case B: Focus Selected

When a focus is selected, show only the equipment for that specific focus:

```typescript
function getAvailableEquipmentForFocus(
  equipmentSets: TrainerEquipmentSet[],
  focusId: string
): string[] {
  const focusSet = equipmentSets.find((set) => set.focus_id === focusId);
  return focusSet?.equipment_ids || [];
}
```

**Example**:

- User selects "Strength" focus
- **Result**: `["barbell", "dumbbells", "bench"]`

### Step 2: Filter Equipment Items

After determining the available equipment IDs, fetch the full equipment item details:

```typescript
async function getFilteredEquipmentItems(
  availableEquipmentIds: string[],
  allEquipmentItems: EquipmentItem[]
): Promise<EquipmentItem[]> {
  // Filter to only include equipment that is available
  return allEquipmentItems.filter((item) =>
    availableEquipmentIds.includes(item.id)
  );
}
```

### Step 3: User Selection

Display the filtered equipment items and allow the user to select what they have available:

```typescript
interface UserEquipmentSelection {
  selectedEquipmentIds: string[]; // Equipment the user has available
}
```

## Implementation Flow

### Complete Example

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getTrainerEquipmentSets, listEquipmentItems } from '@/app/actions/ai-trainer-manager';
import type { EquipmentItem } from '@/types/firestore';

interface EquipmentSelectorProps {
  trainerId: string;
  selectedFocusId?: string | null;  // null or undefined = no focus selected
}

export function EquipmentSelector({ trainerId, selectedFocusId }: EquipmentSelectorProps) {
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEquipment() {
      setIsLoading(true);

      try {
        // 1. Fetch trainer equipment sets
        const setsResult = await getTrainerEquipmentSets({ trainerId });
        if (!setsResult.success || !setsResult.equipmentSets) {
          throw new Error(setsResult.error || 'Failed to load equipment sets');
        }

        // 2. Determine available equipment IDs based on focus selection
        let availableEquipmentIds: string[];

        if (!selectedFocusId) {
          // No focus selected: union of all equipment from all focuses
          const allIds = new Set<string>();
          setsResult.equipmentSets.forEach(set => {
            set.equipment_ids.forEach(id => allIds.add(id));
          });
          availableEquipmentIds = Array.from(allIds);
        } else {
          // Focus selected: equipment for that specific focus
          const focusSet = setsResult.equipmentSets.find(
            set => set.focus_id === selectedFocusId
          );
          availableEquipmentIds = focusSet?.equipment_ids || [];
        }

        // 3. Fetch all equipment items
        const equipmentResult = await listEquipmentItems();
        if (!equipmentResult.success || !equipmentResult.equipment) {
          throw new Error(equipmentResult.error || 'Failed to load equipment items');
        }

        // 4. Filter to only available equipment
        const filtered = equipmentResult.equipment.filter(item =>
          availableEquipmentIds.includes(item.id)
        );

        // Sort by display_order
        filtered.sort((a, b) => a.display_order - b.display_order);

        setAvailableEquipment(filtered);
      } catch (error) {
        console.error('Error loading equipment:', error);
        // Handle error (show error message to user)
      } finally {
        setIsLoading(false);
      }
    }

    loadEquipment();
  }, [trainerId, selectedFocusId]);

  const handleEquipmentToggle = (equipmentId: string) => {
    setSelectedEquipmentIds(prev => {
      if (prev.includes(equipmentId)) {
        return prev.filter(id => id !== equipmentId);
      } else {
        return [...prev, equipmentId];
      }
    });
  };

  if (isLoading) {
    return <div>Loading equipment...</div>;
  }

  return (
    <div>
      <h3>Select Equipment You Have Available</h3>
      {availableEquipment.length === 0 ? (
        <p>No equipment available for this trainer{focus ? ` and ${focus.name} focus` : ''}.</p>
      ) : (
        <div>
          {availableEquipment.map(equipment => (
            <label key={equipment.id}>
              <input
                type="checkbox"
                checked={selectedEquipmentIds.includes(equipment.id)}
                onChange={() => handleEquipmentToggle(equipment.id)}
              />
              {equipment.name}
              {equipment.sub_category && (
                <span className="text-muted"> - {equipment.sub_category}</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
```

## UI/UX Considerations

### 1. Grouping by Category

Consider grouping equipment by `primary_category` for better organization:

```typescript
function groupByCategory(
  equipment: EquipmentItem[]
): Record<string, EquipmentItem[]> {
  return equipment.reduce(
    (acc, item) => {
      const category = item.primary_category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, EquipmentItem[]>
  );
}
```

### 2. Search Functionality

Add search to filter equipment by name, category, or sub-category:

```typescript
const [searchQuery, setSearchQuery] = useState("");

const filteredEquipment = availableEquipment.filter((item) => {
  if (!searchQuery.trim()) return true;
  const query = searchQuery.toLowerCase();
  return (
    item.name.toLowerCase().includes(query) ||
    item.primary_category?.toLowerCase().includes(query) ||
    item.sub_category?.toLowerCase().includes(query) ||
    item.categories.some((cat) => cat.toLowerCase().includes(query))
  );
});
```

### 3. Empty States

Handle different empty state scenarios:

- **No equipment sets configured**: "This trainer hasn't configured equipment sets yet."
- **No equipment for selected focus**: "No equipment available for this focus area."
- **No equipment selected by user**: "Select at least one piece of equipment to continue."

### 4. Loading States

Show loading indicators while fetching data:

```typescript
{isLoading ? (
  <div className="flex items-center gap-2">
    <Spinner />
    <span>Loading available equipment...</span>
  </div>
) : (
  // Equipment list
)}
```

### 5. Selection Persistence

Persist user selections (e.g., in localStorage or state management):

```typescript
// Save to localStorage
useEffect(() => {
  if (selectedEquipmentIds.length > 0) {
    localStorage.setItem(
      `equipment_selection_${trainerId}_${selectedFocusId || "all"}`,
      JSON.stringify(selectedEquipmentIds)
    );
  }
}, [selectedEquipmentIds, trainerId, selectedFocusId]);

// Load from localStorage
useEffect(() => {
  const saved = localStorage.getItem(
    `equipment_selection_${trainerId}_${selectedFocusId || "all"}`
  );
  if (saved) {
    try {
      setSelectedEquipmentIds(JSON.parse(saved));
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
}, [trainerId, selectedFocusId]);
```

## Data Flow Diagram

```
┌─────────────────┐
│  User selects   │
│  Trainer        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User selects   │
│  Focus (opt)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Fetch Trainer Equipment Sets   │
│  getTrainerEquipmentSets()     │
└────────┬────────────────────────┘
         │
         ▼
    ┌─────────┐
    │ Focus   │
    │Selected?│
    └────┬────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────┐
│Filter  │ │ Union all        │
│by focus│ │ equipment_ids    │
│        │ │ from all focuses │
└───┬────┘ └────────┬──────────┘
    │               │
    └───────┬───────┘
            │
            ▼
┌──────────────────────────────┐
│  Fetch Equipment Items       │
│  listEquipmentItems()        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Filter to available items   │
│  (match equipment_ids)       │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Display Equipment List      │
│  User selects what they have │
└──────────────────────────────┘
```

## Error Handling

Handle common error scenarios:

```typescript
try {
  const setsResult = await getTrainerEquipmentSets({ trainerId });

  if (!setsResult.success) {
    // Handle error
    if (setsResult.error?.includes("not found")) {
      // Trainer doesn't exist
    } else if (setsResult.error?.includes("permission")) {
      // Permission denied
    } else {
      // Generic error
    }
    return;
  }

  // Continue with success case
} catch (error) {
  // Network error or unexpected error
  console.error("Unexpected error:", error);
  // Show user-friendly error message
}
```

## Performance Considerations

1. **Cache Equipment Items**: Equipment items rarely change, so cache them:

   ```typescript
   const equipmentCache = new Map<string, EquipmentItem[]>();
   ```

2. **Memoize Filtered Results**: Use `useMemo` to avoid recalculating filtered equipment:

   ```typescript
   const filteredEquipment = useMemo(() => {
     return availableEquipment.filter((item) =>
       availableEquipmentIds.includes(item.id)
     );
   }, [availableEquipment, availableEquipmentIds]);
   ```

3. **Lazy Load**: Only fetch equipment sets when trainer is selected, not on initial page load.

## Testing Checklist

- [ ] No focus selected shows union of all equipment
- [ ] Focus selected shows only that focus's equipment
- [ ] Empty equipment sets handled gracefully
- [ ] Loading states display correctly
- [ ] Error states display user-friendly messages
- [ ] Equipment selection persists across focus changes
- [ ] Search functionality works correctly
- [ ] Category grouping displays correctly
- [ ] Equipment sorted by display_order

## Related Documentation

- [Equipment Seed Research](../equipment/FITNESS_EQUIPMENT_SEED_RESEARCH.md) - Equipment catalog structure
- [AI Trainer Manager Implementation](../plans/ADMIN_AI_TRAINER_MANAGER_IMPLEMENTATION.md) - Admin-side equipment configuration
