# Plan: Update Equipment Selector for Trainer + Focus-Based Equipment

## Overview

Update the frontend equipment selection to display equipment based on trainer + focus associations, as managed by the admin. Equipment will be filtered to show only items relevant to the selected trainer and focus combination.

## Current State

- **Equipment Source**: Global `equipment_items` collection
- **EquipmentSelector**: Fetches all equipment items from `equipment_items` collection
- **User Profile**: Users have `equipment_access` and `available_equipment` in their profile
- **Generate Page**: Uses `EquipmentSelector` with user profile defaults, allows override per workout

## New Admin Structure

Based on the admin design plan, equipment is managed as **equipment sets** associated with trainer + focus combinations:

### Equipment Set Structure

The admin creates equipment sets for trainer+focus combinations via server actions. Each set contains references to equipment items from the global `equipment_items` collection.

**Admin Server Actions** (from admin repository):

- `listEquipmentItems()`: Fetch all equipment items from `equipment_items` collection, ordered by `display_order`
- `getTrainerEquipmentSets(trainerId: string)`: Fetch all equipment sets for a trainer from subcollection
- `updateTrainerEquipmentSet(trainerId: string, focusId: string, equipmentIds: string[])`: Create/update equipment set for a trainer+focus combination

**Firestore Structure** (based on admin server actions):

- Equipment sets stored in subcollection: `trainers/{trainerId}/equipment_sets/{focusId}`
- Each set document contains:
  - `equipment_item_ids: string[]` - Array of equipment item IDs from `equipment_items` collection
  - Standard metadata fields (`is_active`, `created_at`, `updated_at`, etc.)

**Frontend Access**:

- Frontend uses **client-side Firestore queries** (not server actions)
- Frontend is **READ-ONLY** - users cannot edit or delete equipment sets
- Firestore security rules must allow read access to `trainers/{trainerId}/equipment_sets` subcollection

### Frontend Consumption Pattern (From Admin Design Plan)

> **Frontend Consumption (Future)**
> The frontend will need to:
>
> 1. When user selects a trainer and focus, fetch equipment set for that trainer+focus combination
> 2. If equipment set exists, filter `equipment_items` to only show items in the set
> 3. If no equipment set exists, fall back to showing all equipment items (backward compatibility)

**Key Points**:

- Equipment sets contain references to `equipment_items` collection
- Frontend filters the global `equipment_items` collection based on the set
- Fallback to all equipment if no set exists for the trainer+focus combination

## Implementation Plan

### Phase 1: Type Definitions

#### 1.1 Update Firestore Types

- **File**: `src/types/firestore.ts`
- **Action**: Add `TrainerEquipmentSet` interface
- **Structure** (matches admin server actions structure):
  ```typescript
  export interface TrainerEquipmentSet {
    id: string; // doc id (focusId from subcollection path)
    trainer_id: string; // TrainerId (from parent collection path)
    focus_id: string; // Focus ID (document ID in subcollection)
    equipment_item_ids: string[]; // Array of equipment_item IDs from equipment_items collection
    is_active?: boolean; // Optional, defaults to true if not present
    created_at?: Timestamp; // Admin-managed timestamp
    updated_at?: Timestamp; // Admin-managed timestamp
  }
  ```
- **Note**: Document is stored at `trainers/{trainerId}/equipment_sets/{focusId}`, so `trainer_id` and `focus_id` can be derived from path or stored in document

### Phase 2: Update EquipmentSelector Component

#### 2.1 Add Trainer + Focus Props

- **File**: `src/components/shared/EquipmentSelector.tsx`
- **Changes**:
  - Add optional `trainerId?: TrainerId` prop
  - Add optional `focusId?: string` prop
  - Update component to fetch trainer-specific equipment when `trainerId` is provided
  - Filter by `focusId` when provided

#### 2.2 Update Fetch Logic (READ-ONLY)

- **Current**: Fetches all items from `equipment_items` collection
- **New Flow** (per admin design):
  1. **Fetch Equipment Set** (when `trainerId` and `focusId` are provided):
     - Query `trainers/{trainerId}/equipment_sets/{focusId}` document
     - Extract `equipment_item_ids` array from the set document
     - If document doesn't exist, proceed to fallback
  2. **Filter Equipment Items** (if equipment set exists):
     - Fetch all `equipment_items` from global collection (as before)
     - Filter to only include items whose `id` is in the set's `equipment_item_ids` array
     - Maintain `display_order` from `equipment_items` collection
  3. **Fallback** (if no equipment set exists):
     - Show all equipment items from `equipment_items` collection (backward compatibility)
  4. **No Trainer/Focus** (onboarding/profile):
     - Use current behavior: show all `equipment_items` (unchanged)
- **Important**: All operations are READ-ONLY - no writes or deletes to equipment sets

#### 2.3 Update Component Interface

```typescript
type EquipmentSelectorProps = {
  equipmentAccess: EquipmentAccess;
  availableEquipment: string[];
  onEquipmentAccessChange: (access: EquipmentAccess) => void;
  onAvailableEquipmentChange: (equipment: string[]) => void;
  loading?: boolean;
  error?: string | null;
  showTitle?: boolean;
  // NEW PROPS
  trainerId?: TrainerId; // Filter equipment by trainer
  focusId?: string; // Filter equipment by focus (requires trainerId)
};
```

### Phase 3: Update Generate Page

#### 3.1 Pass Trainer + Focus to EquipmentSelector

- **File**: `src/app/generate/page.tsx`
- **Changes**:
  - Pass `selectedTrainerId` as `trainerId` prop to `EquipmentSelector`
  - Pass `selectedFocusId` as `focusId` prop to `EquipmentSelector` (if not null)
  - Ensure equipment selector only shows when trainer is selected

#### 3.2 Handle Edge Cases

- **No Trainer Selected**: Don't show equipment selector (shouldn't happen as equipment step comes after trainer selection)
- **No Focus Selected (Blend Mode)**:
  - Attempt to fetch equipment set for `trainerId` + `null`/`"blend"` focus
  - If set exists, filter equipment_items by that set
  - If no set exists, fall back to all equipment_items (backward compatibility)
- **Focus Selected**:
  - Fetch equipment set for `trainerId` + `focusId` combination
  - If set exists, filter equipment_items to only show items in the set
  - If no set exists, fall back to all equipment_items (backward compatibility)

### Phase 4: Service Layer (Optional Enhancement)

#### 4.1 Create TrainerEquipmentService

- **File**: `src/services/trainer/TrainerEquipmentService.ts` (new)
- **Purpose**: Centralize logic for fetching trainer-specific equipment
- **Methods**:
  - `getTrainerEquipment(trainerId: TrainerId, focusId?: string): Promise<EquipmentItem[]>`
  - `getTrainerEquipmentForFocus(trainerId: TrainerId, focusId: string): Promise<EquipmentItem[]>`
  - `getAllTrainerEquipment(trainerId: TrainerId): Promise<EquipmentItem[]>`

### Phase 5: Update Other Equipment Selector Usages

#### 5.1 Onboarding Flow

- **File**: `src/components/onboarding/steps/StepEquipment.tsx`
- **Note**: Keep current behavior (no trainer/focus filtering) as this is user profile setup

#### 5.2 Phase B Equipment Step

- **File**: `src/components/onboarding/steps/StepPhaseBEquipment.tsx`
- **Note**: Keep current behavior (no trainer/focus filtering) as this is user profile setup

### Phase 6: Error Handling & Loading States

#### 6.1 Handle Missing Data Gracefully

- If trainer equipment set document doesn't exist, fall back to global `equipment_items`
- Show appropriate loading states while fetching trainer equipment set
- Display error messages if fetch fails
- Handle cases where `equipment_item_ids` references invalid equipment items (skip missing items)

#### 6.2 Fallback Strategy

- **Primary**: Fetch equipment set for trainer+focus combination, then filter `equipment_items` by set
- **Fallback**: If equipment set doesn't exist (or fetch fails), show all items from `equipment_items` collection
- **User Experience**:
  - No special message needed - fallback is seamless (shows all equipment)
  - This maintains backward compatibility until admin populates equipment sets

### Phase 7: Security & Read-Only Enforcement

#### 7.1 Read-Only Operations

- **All Firestore operations are READ-ONLY**:
  - Use `getDoc()` to read equipment set documents
  - Use `getDocs()` with `query()` to read equipment items
  - **Never use**: `setDoc()`, `updateDoc()`, `deleteDoc()`, `addDoc()` for equipment sets
- **User selections are local state only**:
  - Equipment selections stored in component state (`availableEquipment` array)
  - Passed to workout generation API, not written to Firestore
  - No mutations to `trainers/{trainerId}/equipment_sets` subcollection

#### 7.2 Firestore Security Rules

- Ensure security rules allow READ access for authenticated users:
  ```javascript
  match /trainers/{trainerId}/equipment_sets/{focusId} {
    allow read: if request.auth != null;
    // No write rules needed - frontend never writes
  }
  ```
- Equipment items collection already has read access (verify in existing rules)

## Data Flow

```
User selects trainer → User selects focus → Equipment step loads
  ↓
EquipmentSelector receives trainerId + focusId
  ↓
[READ-ONLY] Query trainers/{trainerId}/equipment_sets/{focusId} document
  ↓
  ├─→ Equipment set document exists?
  │   ├─→ YES: Extract equipment_item_ids array from set document
  │   │   ↓
  │   │   [READ-ONLY] Fetch all equipment_items from global collection
  │   │   (query with orderBy("display_order", "asc"))
  │   │   ↓
  │   │   Filter equipment_items to only include IDs in equipment_item_ids array
  │   │   ↓
  │   │   Display filtered equipment list (user can select)
  │   │
  │   └─→ NO: Fallback to all equipment_items
  │       ↓
  │       [READ-ONLY] Fetch all equipment_items from global collection
  │       ↓
  │       Display all equipment items (backward compatibility)
  ↓
User selects equipment (checkboxes)
  ↓
Selected equipment IDs stored in workout state (local component state)
  ↓
Equipment IDs sent to workout generation API (no direct Firestore writes)
```

**Note**: All Firestore operations are READ-ONLY. User selections are stored in local component state and passed to workout generation, not written directly to equipment sets.

## Testing Considerations

1. **Unit Tests**: Test EquipmentSelector with/without trainerId and focusId
2. **Integration Tests**: Test generate page flow with trainer + focus selection
3. **Edge Cases**:
   - Trainer with no equipment configured
   - Focus with no equipment configured
   - Blend mode (no focus selected)
   - Equipment subcollection missing
4. **Backward Compatibility**: Ensure onboarding/profile equipment selection still works without trainer/focus

## Migration Notes

- **Admin Side**: Must populate equipment sets for trainer+focus combinations before this feature is usable
- **Backward Compatibility**: Frontend will gracefully fall back to showing all equipment items if no equipment set exists for a trainer+focus combination
- **User Profile**: User profile equipment settings remain unchanged (used as defaults, can be overridden per workout)
- **Gradual Rollout**: Admin can populate equipment sets incrementally - frontend will show filtered equipment where sets exist, and all equipment where sets don't exist yet

## Files to Modify

1. `src/types/firestore.ts` - Add `TrainerEquipmentSet` interface
2. `src/components/shared/EquipmentSelector.tsx` - Add trainer/focus filtering logic (READ-ONLY operations only)
3. `src/app/generate/page.tsx` - Pass `trainerId` and `focusId` to `EquipmentSelector`
4. `src/services/trainer/TrainerEquipmentService.ts` - (Recommended) New service for READ-ONLY fetching of equipment sets and filtering equipment items
5. `firestore.rules` - (Verify) Ensure read access to `trainers/{trainerId}/equipment_sets/{focusId}` documents

## Dependencies

- Admin must populate `trainers/{trainerId}/equipment` subcollection
- Firestore security rules must allow read access to trainer equipment subcollection
- Equipment items must exist in `equipment_items` collection (referenced by `equipment_item_id`)

## Success Criteria

- ✅ Equipment selector shows only equipment relevant to selected trainer
- ✅ When focus is selected, equipment is further filtered by focus
- ✅ When no focus is selected (blend mode), shows all trainer equipment
- ✅ Graceful fallback to global equipment if trainer equipment is unavailable
- ✅ Onboarding/profile equipment selection remains unchanged
- ✅ Loading and error states are handled appropriately
- ✅ **All frontend operations are READ-ONLY** - users cannot edit or delete equipment sets
- ✅ Frontend uses client-side Firestore queries (not server actions)
- ✅ Equipment set structure matches admin server actions: `trainers/{trainerId}/equipment_sets/{focusId}`
