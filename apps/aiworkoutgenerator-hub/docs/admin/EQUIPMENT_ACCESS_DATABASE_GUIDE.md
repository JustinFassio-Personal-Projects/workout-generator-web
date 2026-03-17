# Equipment Access Database Guide for Admins

## Overview

This guide explains how the Equipment Step retrieves and displays the "Equipment Access" selection from the Firestore database.

## Database Structure

### Collection: `user_profiles`

- **Path**: `user_profiles/{userId}`
- **Document ID**: User's Firebase Auth UID

### Field: `equipment_access`

- **Type**: `string[]` (array of category strings)
- **Example**: `["general", "strength", "functional", "cardio"]`
- **Empty Array**: `[]` (represents bodyweight-only workouts)

### Field: `available_equipment`

- **Type**: `string[]` (array of equipment item IDs)
- **Example**: `["dumbbells", "barbell", "kettlebell"]`
- **Relationship**: These IDs reference documents in the `equipment_items` collection

## Data Flow

### 1. Retrieval from Database

**Service**: `ProfileService.getUserProfile(uid: string)`

**Location**: `src/services/profile/ProfileService.ts`

**Query**:

```typescript
const docRef = doc(getDbInstance(), "user_profiles", uid);
const snap = await getDoc(docRef);
const profile = snap.data() as UserProfile;
```

**Field Access**:

```typescript
const equipmentAccess = profile.equipment_access; // string[]
const availableEquipment = profile.available_equipment; // string[]
```

### 2. Legacy Data Migration

The system automatically migrates legacy enum values to the new `string[]` format:

**Legacy Format** (old):

- `"none"` → `[]`
- `"minimal"` → `["general"]`
- `"home"` → `["general", "strength", "functional"]`
- `"full_gym"` → All categories for user's fitness level

**New Format** (current):

- `string[]` of category identifiers (e.g., `["general", "strength", "functional"]`)

**Migration Logic**: `ProfileService.migrateEquipmentAccess()`

### 3. Equipment Step Display

**Component**: `StepEquipment` (`src/components/onboarding/steps/StepEquipment.tsx`)

**Data Flow**:

1. Receives `equipment_access` from wizard state (initially from Phase A data or profile)
2. Passes `equipmentCategories` (string[]) to `EquipmentSelector`
3. `EquipmentSelector` displays:
   - Category selector (multi-select pills)
   - Equipment items grouped by selected categories

**Code**:

```typescript
const equipment_categories = value.equipment_access ?? []; // string[]
const available_equipment = value.available_equipment ?? []; // string[]

<EquipmentSelector
  equipmentCategories={equipment_categories}
  availableEquipment={available_equipment}
  onEquipmentCategoriesChange={(categories) =>
    onChange({ ...value, equipment_access: categories })
  }
  onAvailableEquipmentChange={(equipment) =>
    onChange({ ...value, available_equipment: equipment })
  }
  fitnessLevel={fitness_level}
/>
```

## Equipment Categories Reference

### Category Strings (used in `equipment_access` array)

| Category String | Display Label       | Unlocked At Level |
| --------------- | ------------------- | ----------------- |
| `general`       | General / Universal | Beginner          |
| `strength`      | Strength Training   | Beginner          |
| `functional`    | Functional Training | Beginner          |
| `cardio`        | Cardio              | Beginner          |
| `calisthenics`  | Calisthenics        | Intermediate      |
| `yoga`          | Yoga                | Intermediate      |
| `pilates`       | Pilates             | Intermediate      |
| `mobility`      | Mobility            | Intermediate      |
| `strongman`     | Strongman           | Advanced          |
| `olympic`       | Olympic Lifting     | Advanced          |
| `recovery`      | Recovery            | Advanced          |
| `combat`        | Combat Sports       | Athlete           |
| `rehab`         | Rehabilitation      | Athlete           |
| `outdoor`       | Outdoor Training    | Athlete           |
| `aquatic`       | Aquatic Training    | Athlete           |
| `smart`         | Smart Equipment     | Athlete           |

## Admin Queries

### Query User's Equipment Access

**Using Firebase Admin SDK**:

```typescript
import { admin } from "firebase-admin";

const db = admin.firestore();
const userId = "user-uid-here";

const profileDoc = await db.collection("user_profiles").doc(userId).get();

if (profileDoc.exists) {
  const profile = profileDoc.data();
  const equipmentAccess = profile?.equipment_access || []; // string[]
  const availableEquipment = profile?.available_equipment || []; // string[]

  console.log("Equipment Categories:", equipmentAccess);
  console.log("Available Equipment IDs:", availableEquipment);
}
```

### Query All Users with Specific Category

**Using Firebase Admin SDK**:

```typescript
const category = "strength";
const usersWithCategory = await db
  .collection("user_profiles")
  .where("equipment_access", "array-contains", category)
  .get();

usersWithCategory.forEach((doc) => {
  console.log(`User ${doc.id} has ${category} category`);
});
```

### Query Equipment Items by Category

**Collection**: `equipment_items`

**Query**:

```typescript
const equipmentItems = await db
  .collection("equipment_items")
  .where("categories", "array-contains", "strength")
  .orderBy("display_order", "asc")
  .get();

equipmentItems.forEach((doc) => {
  const item = doc.data();
  console.log(`${item.name}: ${item.categories}`);
});
```

## Data Relationships

### Equipment Items Collection

**Path**: `equipment_items/{itemId}`

**Relevant Fields**:

- `categories`: `string[]` - Array of category tags (e.g., `["strength", "functional", "general"]`)
- `display_order`: `number` - Sort order for display
- `is_active`: `boolean` - Whether item is available

**Example Document**:

```json
{
  "id": "dumbbells",
  "name": "Dumbbells",
  "categories": ["strength", "functional", "general"],
  "display_order": 2,
  "is_active": true,
  "category": "weights",
  "requires_gym": false,
  "typical_for_home": true
}
```

### Mapping Categories to Equipment

**Service**: `EquipmentCategoryService.getEquipmentItemsByCategories(categories: string[])`

**Logic**:

1. Fetches all equipment items from `equipment_items` collection
2. Filters items where `item.categories` array contains any of the provided categories
3. Returns sorted by `display_order`

**Example**:

```typescript
const categories = ["general", "strength"];
const matchingItems =
  await EquipmentCategoryService.getEquipmentItemsByCategories(categories);
// Returns all equipment items that have "general" OR "strength" in their categories array
```

## Auto-Population Flow

### From Website Wizard (Phase A)

1. **Source**: URL parameters from website redirect
   - Parameter: `equipment_access=general,strength,functional`
   - Parsed: `["general", "strength", "functional"]`

2. **Storage**: Stored in `localStorage` as Phase A data

3. **Auto-Population**: When user reaches Equipment Step:
   - Categories are pre-selected: `["general", "strength", "functional"]`
   - Equipment items matching those categories are auto-selected
   - User can deselect items they don't have

### From Existing Profile

1. **Source**: Firestore `user_profiles/{userId}` document
2. **Retrieval**: `ProfileService.getUserProfile(uid)`
3. **Display**: Equipment Step shows existing selections

## Validation Rules

### Fitness Level Restrictions

Categories are validated against the user's `fitness_level`:

- **Beginner**: `["general", "strength", "functional", "cardio"]`
- **Intermediate**: All beginner + `["calisthenics", "yoga", "pilates", "mobility"]`
- **Advanced**: All intermediate + `["strongman", "olympic", "recovery"]`
- **Athlete**: All advanced + `["combat", "rehab", "outdoor", "aquatic", "smart"]`

**Validation Function**: `validateCategories(categories: string[], fitnessLevel: FitnessLevel)`

**Location**: `src/lib/equipment-categories.ts`

## Common Admin Tasks

### 1. View User's Equipment Access

```typescript
const profile = await ProfileService.getUserProfile(userId);
console.log("Categories:", profile?.equipment_access);
console.log("Equipment IDs:", profile?.available_equipment);
```

### 2. Update User's Equipment Access

**Note**: Users update this through the onboarding wizard. Admins should use the Admin SDK:

```typescript
await db
  .collection("user_profiles")
  .doc(userId)
  .update({
    equipment_access: ["general", "strength", "functional"],
    available_equipment: ["dumbbells", "barbell"],
  });
```

### 3. Find Users by Equipment Category

```typescript
const users = await db
  .collection("user_profiles")
  .where("equipment_access", "array-contains", "olympic")
  .get();
```

### 4. Get Equipment Items for a Category

```typescript
const items = await db
  .collection("equipment_items")
  .where("categories", "array-contains", "strength")
  .where("is_active", "==", true)
  .orderBy("display_order", "asc")
  .get();
```

## Important Notes

1. **Empty Array is Valid**: `equipment_access: []` means bodyweight-only workouts
2. **Case-Insensitive Matching**: Category comparisons are normalized to lowercase
3. **Backward Compatibility**: Legacy enum values are automatically migrated to `string[]`
4. **Read-Only for Users**: Equipment items are read-only; users can only select/deselect
5. **Admin-Only Writes**: Equipment items are managed via Admin SDK in the admin repository

## Related Files

- **Service**: `src/services/profile/ProfileService.ts`
- **Component**: `src/components/onboarding/steps/StepEquipment.tsx`
- **Selector**: `src/components/shared/EquipmentSelector.tsx`
- **Category Service**: `src/services/equipment/EquipmentCategoryService.ts`
- **Category Definitions**: `src/lib/equipment-categories.ts`
- **Types**: `src/types/firestore.ts` (UserProfile interface)
