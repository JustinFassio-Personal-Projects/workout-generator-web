# Onboarding Integration Guide: Fitness Levels and Equipment Categories

## Overview

This document describes how the website (`aiworkoutgenerator.com`) passes onboarding data to the app (`aiworkoutgen.app`) via URL query parameters. The onboarding system uses a **cumulative fitness level model** where each fitness level unlocks additional equipment categories beyond those available at previous levels.

## URL Parameters

When users complete the onboarding wizard on the website, they are redirected to the app's signup page with the following query parameters:

| Parameter           | Type              | Description                                  | Example                                             |
| ------------------- | ----------------- | -------------------------------------------- | --------------------------------------------------- |
| `fitness_level`     | string            | User's fitness level                         | `beginner`, `intermediate`, `advanced`, `athlete`   |
| `equipment_access`  | string            | Comma-separated list of equipment categories | `general,strength,functional`                       |
| `activity_level`    | string            | Current activity level                       | `moderately_active`, `very_active`, etc.            |
| `fitness_goals`     | string            | Comma-separated list of fitness goals        | `Build muscle,Lose fat`                             |
| `age`               | number (optional) | User's age                                   | `30`                                                |
| `gender`            | string (optional) | User's gender                                | `male`, `female`, `non_binary`, `prefer_not_to_say` |
| `units_weight`      | string            | Weight unit preference                       | `lb`, `kg`                                          |
| `units_height`      | string            | Height unit preference                       | `in`, `cm`                                          |
| `units_distance`    | string            | Distance unit preference                     | `mi`, `km`                                          |
| `units_temperature` | string            | Temperature unit preference                  | `f`, `c`                                            |
| `source`            | string            | Analytics source                             | `website_builder`                                   |
| `theme`             | string            | UI theme                                     | `dark`                                              |
| `tab`               | string            | Initial tab                                  | `signup`                                            |

### Example URL

```
https://aiworkoutgen.app/signup?fitness_level=beginner&equipment_access=general,strength,functional&activity_level=moderately_active&fitness_goals=Build%20muscle,Lose%20fat&units_weight=lb&units_height=in&units_distance=mi&units_temperature=f&source=website_builder&theme=dark&tab=signup
```

## Fitness Levels

The system uses four fitness levels, each unlocking progressively more equipment categories:

### 1. Beginner

- **Description**: New to fitness or returning after a long break
- **Unlocked Categories**: `general`, `strength`, `functional`, `cardio`
- **Use Case**: Basic equipment and exercises suitable for someone starting their fitness journey

### 2. Intermediate

- **Description**: Regular exerciser with 6+ months of consistent training
- **Unlocked Categories**: All beginner categories plus:
  - `calisthenics`
  - `yoga`
  - `pilates`
  - `mobility`
- **Use Case**: Bodyweight progression, flexibility work, and foundational movement patterns

### 3. Advanced

- **Description**: Experienced lifter with years of training and solid technique
- **Unlocked Categories**: All intermediate categories plus:
  - `strongman`
  - `olympic` (Olympic lifting)
  - `recovery`
- **Use Case**: Specialized training modalities requiring advanced technique and equipment

### 4. Athlete

- **Description**: Competitive athlete or elite-level trainer
- **Unlocked Categories**: All advanced categories plus:
  - `combat` (combat sports)
  - `rehab` (rehabilitation)
  - `outdoor` (outdoor training)
  - `aquatic` (aquatic training)
  - `smart` (smart equipment)
- **Use Case**: Sport-specific training, rehabilitation protocols, and specialized equipment

## Equipment Categories

The `equipment_access` parameter contains a comma-separated list of category strings. Each category represents a type of equipment or training modality.

### Category Reference

| Category String | Display Label       | Available At Level |
| --------------- | ------------------- | ------------------ |
| `general`       | General / Universal | Beginner           |
| `strength`      | Strength Training   | Beginner           |
| `functional`    | Functional Training | Beginner           |
| `cardio`        | Cardio              | Beginner           |
| `calisthenics`  | Calisthenics        | Intermediate       |
| `yoga`          | Yoga                | Intermediate       |
| `pilates`       | Pilates             | Intermediate       |
| `mobility`      | Mobility            | Intermediate       |
| `strongman`     | Strongman           | Advanced           |
| `olympic`       | Olympic Lifting     | Advanced           |
| `recovery`      | Recovery            | Advanced           |
| `combat`        | Combat Sports       | Athlete            |
| `rehab`         | Rehabilitation      | Athlete            |
| `outdoor`       | Outdoor Training    | Athlete            |
| `aquatic`       | Aquatic Training    | Athlete            |
| `smart`         | Smart Equipment     | Athlete            |

### Category Validation

**Important**: The app should validate that the categories provided in `equipment_access` are compatible with the user's `fitness_level`. The website enforces this, but validation on the app side is recommended for data integrity.

#### Validation Rules

1. **Beginner** users can only have: `general`, `strength`, `functional`, `cardio`
2. **Intermediate** users can have beginner categories plus: `calisthenics`, `yoga`, `pilates`, `mobility`
3. **Advanced** users can have intermediate categories plus: `strongman`, `olympic`, `recovery`
4. **Athlete** users can have all categories: `combat`, `rehab`, `outdoor`, `aquatic`, `smart`

#### Validation Example (TypeScript)

```typescript
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete'

const categoryMapping: Record<FitnessLevel, string[]> = {
  beginner: ['general', 'strength', 'functional', 'cardio'],
  intermediate: [
    'general',
    'strength',
    'functional',
    'cardio',
    'calisthenics',
    'yoga',
    'pilates',
    'mobility',
  ],
  advanced: [
    'general',
    'strength',
    'functional',
    'cardio',
    'calisthenics',
    'yoga',
    'pilates',
    'mobility',
    'strongman',
    'olympic',
    'recovery',
  ],
  athlete: [
    'general',
    'strength',
    'functional',
    'cardio',
    'calisthenics',
    'yoga',
    'pilates',
    'mobility',
    'strongman',
    'olympic',
    'recovery',
    'combat',
    'rehab',
    'outdoor',
    'aquatic',
    'smart',
  ],
}

function validateEquipmentAccess(fitnessLevel: FitnessLevel, equipmentAccess: string[]): boolean {
  const allowedCategories = categoryMapping[fitnessLevel]
  return equipmentAccess.every(category => allowedCategories.includes(category))
}

// Usage
const fitnessLevel = 'intermediate'
const equipmentAccess = ['general', 'strength', 'calisthenics'] // ✅ Valid
// const equipmentAccess = ['general', 'strength', 'olympic'] // ❌ Invalid (olympic requires advanced)
```

## Data Processing

### Parsing `equipment_access`

The `equipment_access` parameter is a comma-separated string. Parse it into an array:

```typescript
// Parse from URL parameter
const equipmentAccessParam = urlParams.get('equipment_access') || ''
const equipmentAccess = equipmentAccessParam
  .split(',')
  .map(cat => cat.trim())
  .filter(cat => cat.length > 0)
```

### Parsing `fitness_goals`

Similarly, `fitness_goals` is comma-separated:

```typescript
const fitnessGoalsParam = urlParams.get('fitness_goals') || ''
const fitnessGoals = fitnessGoalsParam
  .split(',')
  .map(goal => goal.trim())
  .filter(goal => goal.length > 0)
```

## Implementation Recommendations

### 1. Default Values

If `fitness_level` or `equipment_access` are missing or invalid, use safe defaults:

```typescript
const DEFAULT_FITNESS_LEVEL: FitnessLevel = 'beginner'
const DEFAULT_EQUIPMENT_ACCESS: string[] = ['general', 'strength']
```

### 2. Data Normalization

Normalize the data on receipt:

```typescript
function normalizeOnboardingData(urlParams: URLSearchParams) {
  const fitnessLevel = (urlParams.get('fitness_level') as FitnessLevel) || DEFAULT_FITNESS_LEVEL

  // Parse and validate equipment access
  const equipmentAccessParam = urlParams.get('equipment_access') || ''
  const equipmentAccess = equipmentAccessParam
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0)

  // Validate and filter invalid categories
  const allowedCategories = categoryMapping[fitnessLevel]
  const validEquipmentAccess = equipmentAccess.filter(cat => allowedCategories.includes(cat))

  // Ensure at least one category
  const normalizedEquipmentAccess =
    validEquipmentAccess.length > 0 ? validEquipmentAccess : DEFAULT_EQUIPMENT_ACCESS

  return {
    fitnessLevel,
    equipmentAccess: normalizedEquipmentAccess,
    // ... other fields
  }
}
```

### 3. Storage

Store the normalized data in your user profile or onboarding state:

```typescript
interface UserOnboardingData {
  fitness_level: FitnessLevel
  equipment_access: string[]
  activity_level: ActivityLevel
  fitness_goals: string[]
  // ... other fields
}
```

### 4. Usage in Workout Generation

When generating workouts, filter available equipment based on the user's `equipment_access` categories:

```typescript
function getAvailableEquipment(userCategories: string[]): Equipment[] {
  return allEquipment.filter(equipment =>
    equipment.categories.some(cat => userCategories.includes(cat))
  )
}
```

## Examples

### Example 1: Beginner User

**URL Parameters:**

```
fitness_level=beginner
equipment_access=general,strength,functional
```

**Interpretation:**

- User is a beginner
- Has access to general, strength, and functional training equipment
- Cannot access calisthenics, yoga, pilates, or mobility categories (unlocked at intermediate)
- Cannot access olympic lifting, strongman, or recovery categories (unlocked at advanced)

### Example 2: Advanced User

**URL Parameters:**

```
fitness_level=advanced
equipment_access=general,strength,functional,olympic,recovery
```

**Interpretation:**

- User is advanced
- Has access to olympic lifting and recovery equipment
- Has access to all beginner and intermediate categories
- Cannot access combat, rehab, outdoor, aquatic, or smart categories (unlocked at athlete level)

### Example 3: Equipment Selection from Website

When users click on equipment from the Equipment Hub page, the website:

1. Determines the equipment's categories
2. Finds the minimum fitness level that includes all those categories
3. Pre-selects both the fitness level and equipment categories in the wizard

**Example Flow:**

- User clicks "Barbell" on Equipment Hub
- Barbell has categories: `['olympic', 'strength']`
- Minimum fitness level for `olympic` category is `advanced`
- Wizard pre-selects: `fitness_level=advanced`, `equipment_access=olympic,strength`

## Edge Cases

### 1. Invalid Category in URL

If a category appears in `equipment_access` that isn't allowed for the `fitness_level`:

- **Action**: Filter out invalid categories
- **Fallback**: If no valid categories remain, use default categories for that level

### 2. Missing Parameters

If `fitness_level` or `equipment_access` are missing:

- **Action**: Use default values (`beginner` and `['general', 'strength']`)

### 3. Empty `equipment_access`

If `equipment_access` is empty or contains only whitespace:

- **Action**: Use default categories for the specified fitness level (or beginner if fitness_level is also missing)

### 4. Invalid `fitness_level`

If `fitness_level` is not one of the four valid values:

- **Action**: Default to `beginner`

## Testing Checklist

- [ ] Parse `equipment_access` comma-separated string correctly
- [ ] Validate categories against fitness level
- [ ] Handle missing `equipment_access` parameter
- [ ] Handle invalid categories gracefully
- [ ] Handle invalid `fitness_level` gracefully
- [ ] Store normalized data correctly
- [ ] Use categories to filter equipment in workout generation
- [ ] Display categories correctly in UI (if applicable)

## Questions or Issues?

If you need clarification on any aspect of this integration, please refer to the source code:

- **Website Implementation**: `aiworkoutgenerator.com` repository
  - Equipment categories: `data/equipment-categories.ts`
  - URL building: `lib/buildSignupUrl.ts`
  - Types: `types/onboarding.ts`

---

**Last Updated**: January 2026  
**Version**: 1.0
