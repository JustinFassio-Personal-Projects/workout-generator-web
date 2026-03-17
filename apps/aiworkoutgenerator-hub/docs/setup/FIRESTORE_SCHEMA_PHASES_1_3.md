# Firestore Collections & Documents Schema (Phases 1-3)

## Overview

Complete Firestore schema for AI Workout Generator covering:

- **Phase 1:** Core profile data (fitness level, injuries, equipment)
- **Phase 2:** Enhanced profile data (preferences, experience, metrics)
- **Phase 3:** Real-time context data (daily state, session-specific)

This schema is designed for the multi-app architecture:

- **Hub:** Main app, authentication, user management, SSO orchestration
- **Trainer:** Workout generation and tracking
- **Chef:** Recipe generation and meal planning
- **Admin:** System administration and analytics

---

## 🗂️ **Top-Level Collections Structure**

```
firestore/
├── users/                          # User accounts (Firebase Auth sync)
├── user_profiles/                  # Core user profile data (Phases 1-2)
├── user_daily_state/               # Real-time context (Phase 3)
├── trainer_workouts/               # Generated workouts
├── trainer_workout_history/        # Completed workouts with feedback
├── chef_recipes/                   # Generated recipes
├── subscription_plans/             # Available subscription tiers
├── calendar_entries/               # Scheduled workouts/meals
├── wearable_connections/           # Connected wearables (Phase 4)
├── wearable_data/                  # Wearable sync data (Phase 4)
├── workout_focuses/                # Reference: Workout types
├── equipment_zones/                # Reference: Equipment categories
├── equipment_items/                # Reference: Equipment list
├── sso_tokens/                     # SSO authentication tokens
├── admin_users/                    # Admin team members
└── admin_activity_logs/            # Admin action audit trail
```

---

## 📄 **Collection: `users`**

**Purpose:** Sync with Firebase Authentication, track account status

**Document ID:** Firebase Auth UID

**Structure:**

```typescript
{
  id: string; // Firebase Auth UID (document ID)
  email: string;
  email_verified: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_sign_in_at: Timestamp | null;

  // Custom claims (set via Firebase Admin SDK)
  role: "member" | "coach" | "admin";
  subscription_tier: "free" | "pro" | "elite";
  subscription_status: "active" | "canceled" | "past_due" | null;

  // Account status
  is_active: boolean; // Can be disabled by admin
  disabled_reason: string | null;
  disabled_at: Timestamp | null;

  // Stripe integration
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}
```

**Security Rules:**

```javascript
match /users/{userId} {
  // Users can read their own document
  allow read: if request.auth.uid == userId;

  // Only Firebase Functions can write (triggered by Auth events)
  allow write: if false;
}
```

---

## 📄 **Collection: `user_profiles`**

**Purpose:** Core user profile data for workout personalization (Phases 1-2)

**Document ID:** Firebase Auth UID (matches users collection)

**Structure:**

```typescript
{
  id: string;                       // Firebase Auth UID (document ID)
  user_id: string;                  // Redundant but helpful for queries

  // ============================================
  // PHASE 1: Core Profile Data (Required)
  // ============================================

  // Basic Info
  first_name: string;
  last_name: string;
  display_name: string;             // Computed: "first_name last_name"

  // Body Stats
  age: number;                      // Years
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  weight: number;                   // In user's preferred unit
  height: number;                   // In user's preferred unit

  // Preferred Units
  preferred_units: {
    weight: 'lb' | 'kg';
    height: 'in' | 'cm';
    distance: 'mi' | 'km';
    temperature: 'f' | 'c';
  };

  // Fitness Level (CRITICAL for workout generation)
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | 'athlete';
  current_activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';

  // Primary Goals (array of goal IDs)
  fitness_goals: string[];          // ['lose_weight', 'build_muscle', 'improve_endurance', 'increase_flexibility', 'improve_athletic_performance']

  // Safety-Critical Data (HIGHEST PRIORITY)
  injuries: string[];               // ['knee', 'lower_back', 'shoulder', 'ankle', 'wrist', 'hip', 'neck', 'elbow']
  injury_details: string | null;    // Free-form text for injury descriptions
  medical_conditions: string[];     // ['asthma', 'high_blood_pressure', 'diabetes', 'heart_condition', 'arthritis', 'none']
  medical_notes: string | null;     // Additional medical information

  // Equipment Access (determines exercise selection)
  equipment_access: 'none' | 'minimal' | 'home' | 'full_gym';
  available_equipment: string[];    // Array of equipment item IDs (references equipment_items collection)

  // ============================================
  // PHASE 2: Enhanced Profile Data (Optional)
  // ============================================

  // Training Preferences
  preferred_workout_duration: number | null;        // Minutes (30, 45, 60, 90)
  workout_frequency_per_week: number | null;        // 3-7 days
  preferred_workout_times: string[] | null;         // ['morning', 'afternoon', 'evening']
  preferred_rest_between_sets: number | null;       // Seconds (30, 60, 90, 120)

  // Experience & Background
  training_experience_years: number | null;         // Years training
  sports_background: string[] | null;               // ['basketball', 'swimming', 'running', 'cycling', 'martial_arts']
  previous_training_programs: string[] | null;      // ['crossfit', 'bodybuilding', 'powerlifting', 'calisthenics']

  // Exercise Preferences
  favorite_exercises: string[] | null;              // Exercise names user enjoys
  disliked_exercises: string[] | null;              // Exercise names user wants to avoid
  exercise_restrictions: string[] | null;           // Exercises user cannot do (due to injury/limitation)

  // Strength Metrics (for advanced users)
  current_bench_press_max: number | null;           // Weight in preferred unit (1RM)
  current_squat_max: number | null;
  current_deadlift_max: number | null;
  current_overhead_press_max: number | null;

  // Cardio Metrics
  current_mile_time: number | null;                 // Seconds
  current_5k_time: number | null;                   // Seconds
  resting_heart_rate: number | null;                // BPM

  // Body Composition Goals
  target_weight: number | null;
  target_body_fat_percentage: number | null;
  current_body_fat_percentage: number | null;

  // Workout Style Preferences
  workout_music_preference: 'upbeat' | 'calm' | 'none' | null;
  workout_intensity_preference: 'low' | 'moderate' | 'high' | 'variable' | null;
  prefers_group_workouts: boolean | null;
  prefers_outdoor_workouts: boolean | null;

  // Nutrition Integration (for Chef app)
  dietary_restrictions: string[] | null;            // ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'keto', 'paleo']
  food_allergies: string[] | null;                  // ['nuts', 'shellfish', 'dairy', 'eggs', 'soy']
  daily_calorie_target: number | null;
  macro_targets: {
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  } | null;

  // ============================================
  // Metadata & Status
  // ============================================

  onboarding_completed: boolean;
  onboarding_completed_at: Timestamp | null;
  profile_completeness: number;     // 0-100 (percentage of fields filled)

  created_at: Timestamp;
  updated_at: Timestamp;
  last_workout_generated_at: Timestamp | null;
}
```

**TypeScript Type Definition:**

```typescript
// types/firestore.ts

export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "athlete";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extremely_active";

export type EquipmentAccess = "none" | "minimal" | "home" | "full_gym";

export interface PreferredUnits {
  weight: "lb" | "kg";
  height: "in" | "cm";
  distance: "mi" | "km";
  temperature: "f" | "c";
}

export interface MacroTargets {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export interface UserProfile {
  id: string;
  user_id: string;

  // Phase 1: Core Data
  first_name: string;
  last_name: string;
  display_name: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  preferred_units: PreferredUnits;
  fitness_level: FitnessLevel;
  current_activity_level: ActivityLevel;
  fitness_goals: string[];
  injuries: string[];
  injury_details: string | null;
  medical_conditions: string[];
  medical_notes: string | null;
  equipment_access: EquipmentAccess;
  available_equipment: string[];

  // Phase 2: Enhanced Data
  preferred_workout_duration: number | null;
  workout_frequency_per_week: number | null;
  preferred_workout_times: string[] | null;
  preferred_rest_between_sets: number | null;
  training_experience_years: number | null;
  sports_background: string[] | null;
  previous_training_programs: string[] | null;
  favorite_exercises: string[] | null;
  disliked_exercises: string[] | null;
  exercise_restrictions: string[] | null;
  current_bench_press_max: number | null;
  current_squat_max: number | null;
  current_deadlift_max: number | null;
  current_overhead_press_max: number | null;
  current_mile_time: number | null;
  current_5k_time: number | null;
  resting_heart_rate: number | null;
  target_weight: number | null;
  target_body_fat_percentage: number | null;
  current_body_fat_percentage: number | null;
  workout_music_preference: "upbeat" | "calm" | "none" | null;
  workout_intensity_preference: "low" | "moderate" | "high" | "variable" | null;
  prefers_group_workouts: boolean | null;
  prefers_outdoor_workouts: boolean | null;
  dietary_restrictions: string[] | null;
  food_allergies: string[] | null;
  daily_calorie_target: number | null;
  macro_targets: MacroTargets | null;

  // Metadata
  onboarding_completed: boolean;
  onboarding_completed_at: Timestamp | null;
  profile_completeness: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_workout_generated_at: Timestamp | null;
}
```

**Security Rules:**

```javascript
match /user_profiles/{userId} {
  // Users can read and write their own profile
  allow read, write: if request.auth.uid == userId;

  // Coaches can read profiles of their assigned clients
  allow read: if request.auth.token.role == 'coach'
                 && exists(/databases/$(database)/documents/coach_clients/$(request.auth.uid + '_' + userId));

  // Admins can read all profiles
  allow read: if request.auth.token.role == 'admin';

  // Validate required fields on create
  allow create: if request.auth.uid == userId
                   && request.resource.data.user_id == userId
                   && request.resource.data.first_name is string
                   && request.resource.data.last_name is string
                   && request.resource.data.age is number
                   && request.resource.data.age >= 13
                   && request.resource.data.age <= 120;
}
```

---

## 📄 **Collection: `user_daily_state`**

**Purpose:** Real-time context for adaptive workout generation (Phase 3)

**Document ID:** `{userId}_{date}` (e.g., `abc123_2025-12-28`)

**Structure:**

```typescript
{
  id: string;                       // Document ID: userId_YYYY-MM-DD
  user_id: string;
  date: string;                     // ISO date: YYYY-MM-DD

  // ============================================
  // PHASE 3: Real-Time Context
  // ============================================

  // Daily State (captured at workout generation)
  energy_level: number;             // 1-10 scale
  sleep_quality: number;            // 1-10 scale
  sleep_hours: number | null;       // Actual hours slept
  stress_level: number;             // 1-10 scale
  motivation_level: number;         // 1-10 scale

  // Soreness Assessment
  soreness_areas: Array<{
    area: string;                   // 'legs', 'chest', 'back', 'shoulders', 'arms', 'core'
    level: number;                  // 1-10 scale
  }>;
  overall_soreness: number;         // 1-10 scale (average of all areas)

  // Location & Time Context
  current_location: 'home' | 'gym' | 'outdoor' | 'hotel' | 'office' | 'other';
  available_time: number | null;    // Minutes available for workout
  time_of_day: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';

  // Weather (if outdoor workout)
  weather_condition: string | null; // 'sunny', 'cloudy', 'rainy', 'snowy'
  temperature: number | null;       // In user's preferred unit

  // Menstrual Cycle Tracking (optional, for women)
  cycle_phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
  cycle_symptoms: string[] | null;  // ['cramps', 'fatigue', 'bloating', 'mood_changes']

  // Recent Activity Context
  days_since_last_workout: number | null;
  workouts_this_week: number;
  consecutive_workout_days: number;

  // Source of data
  data_source: 'manual' | 'wearable' | 'hybrid';
  wearable_connection_id: string | null; // Reference to wearable_connections

  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;

  // Workout generated with this state
  workout_id: string | null;        // Reference to trainer_workouts
  workout_generated_at: Timestamp | null;
}
```

**TypeScript Type Definition:**

```typescript
// types/firestore.ts

export interface SorenessArea {
  area: string;
  level: number;
}

export type LocationType =
  | "home"
  | "gym"
  | "outdoor"
  | "hotel"
  | "office"
  | "other";
export type TimeOfDay =
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "night";
export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";
export type DataSource = "manual" | "wearable" | "hybrid";

export interface UserDailyState {
  id: string;
  user_id: string;
  date: string;

  // Daily metrics
  energy_level: number;
  sleep_quality: number;
  sleep_hours: number | null;
  stress_level: number;
  motivation_level: number;

  // Soreness
  soreness_areas: SorenessArea[];
  overall_soreness: number;

  // Context
  current_location: LocationType;
  available_time: number | null;
  time_of_day: TimeOfDay;
  weather_condition: string | null;
  temperature: number | null;

  // Women's health
  cycle_phase: CyclePhase | null;
  cycle_symptoms: string[] | null;

  // Activity context
  days_since_last_workout: number | null;
  workouts_this_week: number;
  consecutive_workout_days: number;

  // Metadata
  data_source: DataSource;
  wearable_connection_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  workout_id: string | null;
  workout_generated_at: Timestamp | null;
}
```

**Security Rules:**

```javascript
match /user_daily_state/{stateId} {
  // State ID must be in format userId_YYYY-MM-DD
  function isValidStateId() {
    return stateId.matches('^' + request.auth.uid + '_[0-9]{4}-[0-9]{2}-[0-9]{2}$');
  }

  // Users can read and write their own daily state
  allow read, write: if isValidStateId()
                        && request.resource.data.user_id == request.auth.uid;

  // Validate data ranges
  allow write: if request.resource.data.energy_level >= 1
                  && request.resource.data.energy_level <= 10
                  && request.resource.data.sleep_quality >= 1
                  && request.resource.data.sleep_quality <= 10
                  && request.resource.data.stress_level >= 1
                  && request.resource.data.stress_level <= 10;
}
```

---

## 📄 **Collection: `trainer_workouts`**

**Purpose:** AI-generated workouts (referenced from Trainer app)

**Document ID:** Auto-generated

**Structure:**

```typescript
{
  id: string;                       // Auto-generated document ID
  user_id: string;

  // Workout metadata
  title: string;
  focus: string;                    // 'strength', 'cardio', 'hiit', 'flexibility', 'yoga'
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Exercises
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;                   // '10-12' or 'To failure'
    rest_seconds: number;
    duration_seconds?: number;      // For cardio/flexibility
    weight_kg?: number;             // Suggested weight
    notes: string | null;
    equipment_needed: string[];
    muscle_groups: string[];
  }>;

  // Generation context (snapshot of user state at generation time)
  generation_context: {
    profile_snapshot: {
      fitness_level: string;
      injuries: string[];
      equipment_access: string;
    };
    daily_state_snapshot: {
      energy_level: number;
      sleep_quality: number;
      stress_level: number;
      soreness_areas: Array<{ area: string; level: number }>;
    } | null;
    used_profile_data: boolean;     // Whether profile was used in generation
    used_daily_state: boolean;      // Whether daily state was used
  };

  // AI metadata
  generated_by: 'genkit' | 'openai' | 'anthropic';
  genkit_trace_id: string | null;
  ai_model: string | null;          // 'gemini-2.0-flash-exp'
  generation_tokens: number | null;
  generation_cost_usd: number | null;

  // Workout status
  completed: boolean;
  completed_at: Timestamp | null;
  scheduled_for: Timestamp | null;  // Link to calendar_entries

  // User feedback (after completion)
  difficulty_rating: number | null; // 1-10 (how hard was it?)
  enjoyment_rating: number | null;  // 1-10 (did you enjoy it?)
  completion_percentage: number | null; // 0-100 (% of exercises completed)
  user_notes: string | null;

  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

**Security Rules:**

```javascript
match /trainer_workouts/{workoutId} {
  // Users can read and write their own workouts
  allow read, write: if request.auth.uid == resource.data.user_id;

  // Validate workout structure on create
  allow create: if request.resource.data.user_id == request.auth.uid
                   && request.resource.data.title is string
                   && request.resource.data.exercises is list
                   && request.resource.data.exercises.size() > 0;
}
```

---

## 📄 **Collection: `trainer_workout_history`**

**Purpose:** Track completed workouts with detailed metrics

**Document ID:** Auto-generated

**Structure:**

```typescript
{
  id: string;
  user_id: string;
  workout_id: string; // Reference to trainer_workouts

  // Completion details
  completed_at: Timestamp;
  completion_duration_minutes: number; // Actual time taken
  completion_percentage: number; // 0-100

  // Exercise-by-exercise tracking
  exercises_completed: Array<{
    exercise_name: string;
    sets_completed: number;
    reps_completed: number[]; // Array of reps per set
    weight_used_kg: number | null;
    rest_taken_seconds: number[]; // Array of rest between sets
    skipped: boolean;
    skip_reason: string | null;
  }>;

  // Post-workout state
  post_workout_energy: number | null; // 1-10
  post_workout_satisfaction: number | null; // 1-10
  post_workout_soreness_prediction: number | null; // 1-10

  // User feedback
  difficulty_rating: number; // 1-10
  enjoyment_rating: number; // 1-10
  would_repeat: boolean | null;
  feedback_notes: string | null;

  // Performance metrics
  total_weight_lifted_kg: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  calories_burned_estimate: number | null;

  created_at: Timestamp;
}
```

**Security Rules:**

```javascript
match /trainer_workout_history/{historyId} {
  // Users can read their own history
  allow read: if request.auth.uid == resource.data.user_id;

  // Users can create history entries for their workouts
  allow create: if request.auth.uid == request.resource.data.user_id;

  // Users cannot modify history after creation (immutable)
  allow update, delete: if false;
}
```

---

## 📄 **Reference Collection: `workout_focuses`**

**Purpose:** Available workout focus types (read-only reference data)

**Document ID:** Focus slug (e.g., `strength`, `cardio`)

**Structure:**

```typescript
{
  id: string;                       // 'strength', 'cardio', 'hiit', 'flexibility', 'yoga'
  name: string;                     // Display name
  description: string;
  icon: string;                     // Icon name (Lucide React)
  color: string;                    // Hex color code
  typical_duration: number[];       // [30, 45, 60] minutes
  difficulty_levels: string[];      // ['beginner', 'intermediate', 'advanced']
  equipment_required: boolean;
  is_active: boolean;
  display_order: number;
  created_at: Timestamp;
}
```

**Example Documents:**

```typescript
// strength
{
  id: 'strength',
  name: 'Strength Training',
  description: 'Build muscle and increase strength with resistance exercises',
  icon: 'Dumbbell',
  color: '#ef4444',
  typical_duration: [30, 45, 60],
  difficulty_levels: ['beginner', 'intermediate', 'advanced'],
  equipment_required: true,
  is_active: true,
  display_order: 1,
  created_at: Timestamp.now(),
}

// cardio
{
  id: 'cardio',
  name: 'Cardio',
  description: 'Improve cardiovascular endurance and burn calories',
  icon: 'Activity',
  color: '#3b82f6',
  typical_duration: [20, 30, 45],
  difficulty_levels: ['beginner', 'intermediate', 'advanced'],
  equipment_required: false,
  is_active: true,
  display_order: 2,
  created_at: Timestamp.now(),
}

// hiit
{
  id: 'hiit',
  name: 'HIIT',
  description: 'High-intensity interval training for maximum results',
  icon: 'Zap',
  color: '#f59e0b',
  typical_duration: [15, 20, 30],
  difficulty_levels: ['intermediate', 'advanced'],
  equipment_required: false,
  is_active: true,
  display_order: 3,
  created_at: Timestamp.now(),
}

// flexibility
{
  id: 'flexibility',
  name: 'Flexibility & Mobility',
  description: 'Improve range of motion and reduce injury risk',
  icon: 'Waypoints',
  color: '#8b5cf6',
  typical_duration: [15, 30, 45],
  difficulty_levels: ['beginner', 'intermediate', 'advanced'],
  equipment_required: false,
  is_active: true,
  display_order: 4,
  created_at: Timestamp.now(),
}

// yoga
{
  id: 'yoga',
  name: 'Yoga',
  description: 'Mind-body practice for strength, flexibility, and relaxation',
  icon: 'PersonStanding',
  color: '#06b6d4',
  typical_duration: [30, 45, 60, 90],
  difficulty_levels: ['beginner', 'intermediate', 'advanced'],
  equipment_required: false,
  is_active: true,
  display_order: 5,
  created_at: Timestamp.now(),
}
```

**Security Rules:**

```javascript
match /workout_focuses/{focusId} {
  // Anyone can read
  allow read: if request.auth != null;

  // Only admins can write
  allow write: if request.auth.token.role == 'admin';
}
```

---

## 📄 **Reference Collection: `equipment_items`**

**Purpose:** Available equipment for workout generation

**Document ID:** Auto-generated or equipment slug

**Structure:**

```typescript
{
  id: string;
  name: string;                     // 'Dumbbells', 'Barbell', 'Pull-up Bar'
  category: string;                 // 'weights', 'cardio', 'bodyweight', 'accessories'
  icon: string | null;
  requires_gym: boolean;
  typical_for_home: boolean;
  can_adjust_weight: boolean;       // For dumbbells, barbells
  weight_range_kg: {
    min: number | null;
    max: number | null;
  } | null;
  is_active: boolean;
  display_order: number;
  created_at: Timestamp;
}
```

**Example Documents:**

```typescript
// Dumbbells
{
  id: 'dumbbells',
  name: 'Dumbbells',
  category: 'weights',
  icon: 'Dumbbell',
  requires_gym: false,
  typical_for_home: true,
  can_adjust_weight: true,
  weight_range_kg: { min: 2, max: 50 },
  is_active: true,
  display_order: 1,
  created_at: Timestamp.now(),
}

// Pull-up Bar
{
  id: 'pullup_bar',
  name: 'Pull-up Bar',
  category: 'bodyweight',
  icon: null,
  requires_gym: false,
  typical_for_home: true,
  can_adjust_weight: false,
  weight_range_kg: null,
  is_active: true,
  display_order: 2,
  created_at: Timestamp.now(),
}

// Squat Rack
{
  id: 'squat_rack',
  name: 'Squat Rack',
  category: 'weights',
  icon: null,
  requires_gym: true,
  typical_for_home: false,
  can_adjust_weight: false,
  weight_range_kg: null,
  is_active: true,
  display_order: 10,
  created_at: Timestamp.now(),
}
```

**Security Rules:**

```javascript
match /equipment_items/{itemId} {
  // Anyone can read
  allow read: if request.auth != null;

  // Only admins can write
  allow write: if request.auth.token.role == 'admin';
}
```

---

## 🔐 **Complete Firestore Security Rules**

**`firestore.rules`:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================
    // Helper Functions
    // ============================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function hasRole(role) {
      return isAuthenticated() && request.auth.token.role == role;
    }

    function isAdmin() {
      return hasRole('admin');
    }

    function isCoach() {
      return hasRole('coach');
    }

    // ============================================
    // User Collections
    // ============================================

    // Users collection (synced with Firebase Auth)
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if false; // Only Cloud Functions can write
    }

    // User profiles
    match /user_profiles/{userId} {
      allow read: if isOwner(userId)
                     || isAdmin()
                     || (isCoach() && exists(/databases/$(database)/documents/coach_clients/$(request.auth.uid + '_' + userId)));

      allow create: if isOwner(userId)
                       && request.resource.data.user_id == userId
                       && request.resource.data.age >= 13
                       && request.resource.data.age <= 120;

      allow update: if isOwner(userId);
      allow delete: if isAdmin();
    }

    // User daily state
    match /user_daily_state/{stateId} {
      function isValidStateId() {
        return stateId.matches('^' + request.auth.uid + '_[0-9]{4}-[0-9]{2}-[0-9]{2}$');
      }

      allow read: if isValidStateId() && isOwner(resource.data.user_id);

      allow create, update: if isValidStateId()
                               && isOwner(request.resource.data.user_id)
                               && request.resource.data.energy_level >= 1
                               && request.resource.data.energy_level <= 10
                               && request.resource.data.sleep_quality >= 1
                               && request.resource.data.sleep_quality <= 10;

      allow delete: if isValidStateId() && isOwner(resource.data.user_id);
    }

    // ============================================
    // Trainer Collections
    // ============================================

    // Trainer workouts
    match /trainer_workouts/{workoutId} {
      allow read: if isOwner(resource.data.user_id) || isAdmin();

      allow create: if isOwner(request.resource.data.user_id)
                       && request.resource.data.exercises.size() > 0;

      allow update: if isOwner(resource.data.user_id);
      allow delete: if isOwner(resource.data.user_id) || isAdmin();
    }

    // Trainer workout history
    match /trainer_workout_history/{historyId} {
      allow read: if isOwner(resource.data.user_id) || isAdmin();
      allow create: if isOwner(request.resource.data.user_id);
      allow update, delete: if false; // Immutable
    }

    // ============================================
    // Reference Collections (Public Read)
    // ============================================

    match /workout_focuses/{focusId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /equipment_items/{itemId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // ============================================
    // SSO & Authentication
    // ============================================

    match /sso_tokens/{tokenId} {
      allow read: if isAuthenticated() && isOwner(resource.data.user_id);
      allow create: if isAuthenticated() && isOwner(request.resource.data.user_id);
      allow delete: if isAuthenticated(); // Anyone can cleanup expired tokens
    }

    // ============================================
    // Admin Collections
    // ============================================

    match /admin_users/{adminId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /admin_activity_logs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only Cloud Functions
    }

    // Deny all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 📊 **Firestore Indexes**

**`firestore.indexes.json`:**

```json
{
  "indexes": [
    {
      "collectionGroup": "user_profiles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "fitness_level", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "user_daily_state",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "trainer_workouts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "trainer_workouts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "completed", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "trainer_workout_history",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "completed_at", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 🚀 **Deployment Script**

**`scripts/seed-firestore-schema.ts`:**

```typescript
import { db } from "../lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

async function seedWorkoutFocuses() {
  const focuses = [
    {
      id: "strength",
      name: "Strength Training",
      description:
        "Build muscle and increase strength with resistance exercises",
      icon: "Dumbbell",
      color: "#ef4444",
      typical_duration: [30, 45, 60],
      difficulty_levels: ["beginner", "intermediate", "advanced"],
      equipment_required: true,
      is_active: true,
      display_order: 1,
    },
    {
      id: "cardio",
      name: "Cardio",
      description: "Improve cardiovascular endurance and burn calories",
      icon: "Activity",
      color: "#3b82f6",
      typical_duration: [20, 30, 45],
      difficulty_levels: ["beginner", "intermediate", "advanced"],
      equipment_required: false,
      is_active: true,
      display_order: 2,
    },
    {
      id: "hiit",
      name: "HIIT",
      description: "High-intensity interval training for maximum results",
      icon: "Zap",
      color: "#f59e0b",
      typical_duration: [15, 20, 30],
      difficulty_levels: ["intermediate", "advanced"],
      equipment_required: false,
      is_active: true,
      display_order: 3,
    },
    {
      id: "flexibility",
      name: "Flexibility & Mobility",
      description: "Improve range of motion and reduce injury risk",
      icon: "Waypoints",
      color: "#8b5cf6",
      typical_duration: [15, 30, 45],
      difficulty_levels: ["beginner", "intermediate", "advanced"],
      equipment_required: false,
      is_active: true,
      display_order: 4,
    },
    {
      id: "yoga",
      name: "Yoga",
      description:
        "Mind-body practice for strength, flexibility, and relaxation",
      icon: "PersonStanding",
      color: "#06b6d4",
      typical_duration: [30, 45, 60, 90],
      difficulty_levels: ["beginner", "intermediate", "advanced"],
      equipment_required: false,
      is_active: true,
      display_order: 5,
    },
  ];

  const batch = db.batch();

  for (const focus of focuses) {
    const ref = db.collection("workout_focuses").doc(focus.id);
    batch.set(ref, {
      ...focus,
      created_at: Timestamp.now(),
    });
  }

  await batch.commit();
  console.log("✅ Seeded workout focuses");
}

async function seedEquipmentItems() {
  const equipment = [
    {
      id: "dumbbells",
      name: "Dumbbells",
      category: "weights",
      icon: "Dumbbell",
      requires_gym: false,
      typical_for_home: true,
      can_adjust_weight: true,
      weight_range_kg: { min: 2, max: 50 },
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
      weight_range_kg: { min: 20, max: 200 },
      is_active: true,
      display_order: 2,
    },
    {
      id: "pullup_bar",
      name: "Pull-up Bar",
      category: "bodyweight",
      icon: null,
      requires_gym: false,
      typical_for_home: true,
      can_adjust_weight: false,
      weight_range_kg: null,
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
      id: "kettlebell",
      name: "Kettlebell",
      category: "weights",
      icon: null,
      requires_gym: false,
      typical_for_home: true,
      can_adjust_weight: false,
      weight_range_kg: { min: 4, max: 32 },
      is_active: true,
      display_order: 5,
    },
    {
      id: "bench",
      name: "Workout Bench",
      category: "accessories",
      icon: null,
      requires_gym: false,
      typical_for_home: true,
      can_adjust_weight: false,
      weight_range_kg: null,
      is_active: true,
      display_order: 6,
    },
    {
      id: "squat_rack",
      name: "Squat Rack",
      category: "weights",
      icon: null,
      requires_gym: true,
      typical_for_home: false,
      can_adjust_weight: false,
      weight_range_kg: null,
      is_active: true,
      display_order: 10,
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
      display_order: 11,
    },
  ];

  const batch = db.batch();

  for (const item of equipment) {
    const ref = db.collection("equipment_items").doc(item.id);
    batch.set(ref, {
      ...item,
      created_at: Timestamp.now(),
    });
  }

  await batch.commit();
  console.log("✅ Seeded equipment items");
}

async function main() {
  try {
    await seedWorkoutFocuses();
    await seedEquipmentItems();
    console.log("✅ Firestore schema seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding Firestore:", error);
    process.exit(1);
  }
}

main();
```

**Run:**

```bash
npx tsx scripts/seed-firestore-schema.ts
```

---

## 📝 **Usage Examples**

### **Example 1: Creating a User Profile (Phase 1)**

```typescript
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";

async function createUserProfile(data: {
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  fitness_level: string;
  fitness_goals: string[];
  injuries: string[];
  equipment_access: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const profileRef = doc(db, "user_profiles", user.uid);

  await setDoc(profileRef, {
    id: user.uid,
    user_id: user.uid,
    ...data,
    display_name: `${data.first_name} ${data.last_name}`,
    preferred_units: {
      weight: "lb",
      height: "in",
      distance: "mi",
      temperature: "f",
    },
    injury_details: null,
    medical_conditions: [],
    medical_notes: null,
    available_equipment: [],

    // Phase 2 fields (null by default)
    preferred_workout_duration: null,
    workout_frequency_per_week: null,
    preferred_workout_times: null,
    preferred_rest_between_sets: null,
    training_experience_years: null,
    sports_background: null,
    previous_training_programs: null,
    favorite_exercises: null,
    disliked_exercises: null,
    exercise_restrictions: null,
    current_bench_press_max: null,
    current_squat_max: null,
    current_deadlift_max: null,
    current_overhead_press_max: null,
    current_mile_time: null,
    current_5k_time: null,
    resting_heart_rate: null,
    target_weight: null,
    target_body_fat_percentage: null,
    current_body_fat_percentage: null,
    workout_music_preference: null,
    workout_intensity_preference: null,
    prefers_group_workouts: null,
    prefers_outdoor_workouts: null,
    dietary_restrictions: null,
    food_allergies: null,
    daily_calorie_target: null,
    macro_targets: null,

    onboarding_completed: true,
    onboarding_completed_at: Timestamp.now(),
    profile_completeness: 70,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    last_workout_generated_at: null,
  });

  console.log("✅ User profile created");
}
```

### **Example 2: Recording Daily State (Phase 3)**

```typescript
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";

async function recordDailyState(data: {
  energy_level: number;
  sleep_quality: number;
  sleep_hours: number;
  stress_level: number;
  motivation_level: number;
  soreness_areas: Array<{ area: string; level: number }>;
  current_location: string;
  available_time: number;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const stateId = `${user.uid}_${today}`;

  const stateRef = doc(db, "user_daily_state", stateId);

  await setDoc(stateRef, {
    id: stateId,
    user_id: user.uid,
    date: today,
    ...data,
    overall_soreness:
      data.soreness_areas.reduce((sum, s) => sum + s.level, 0) /
      data.soreness_areas.length,
    time_of_day: getTimeOfDay(),
    weather_condition: null,
    temperature: null,
    cycle_phase: null,
    cycle_symptoms: null,
    days_since_last_workout: await calculateDaysSinceLastWorkout(user.uid),
    workouts_this_week: await getWorkoutsThisWeek(user.uid),
    consecutive_workout_days: await getConsecutiveWorkoutDays(user.uid),
    data_source: "manual",
    wearable_connection_id: null,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    workout_id: null,
    workout_generated_at: null,
  });

  console.log("✅ Daily state recorded");
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 9) return "early_morning";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}
```

### **Example 3: Generating Workout with Profile & Daily State**

```typescript
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";

async function generateWorkout(input: { focus: string; duration: number }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  // Fetch user profile
  const profileRef = doc(db, "user_profiles", user.uid);
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.data();

  // Fetch today's daily state
  const today = new Date().toISOString().split("T")[0];
  const stateRef = doc(db, "user_daily_state", `${user.uid}_${today}`);
  const stateSnap = await getDoc(stateRef);
  const dailyState = stateSnap.exists() ? stateSnap.data() : null;

  // Call AI generation (Genkit)
  const workout = await generateWorkoutWithAI({
    focus: input.focus,
    duration: input.duration,
    profile: profile,
    dailyState: dailyState,
  });

  // Save workout to Firestore
  const workoutRef = await addDoc(collection(db, "trainer_workouts"), {
    user_id: user.uid,
    title: workout.title,
    focus: input.focus,
    duration_minutes: input.duration,
    difficulty: profile?.fitness_level || "beginner",
    exercises: workout.exercises,
    generation_context: {
      profile_snapshot: {
        fitness_level: profile?.fitness_level || "beginner",
        injuries: profile?.injuries || [],
        equipment_access: profile?.equipment_access || "none",
      },
      daily_state_snapshot: dailyState
        ? {
            energy_level: dailyState.energy_level,
            sleep_quality: dailyState.sleep_quality,
            stress_level: dailyState.stress_level,
            soreness_areas: dailyState.soreness_areas,
          }
        : null,
      used_profile_data: !!profile,
      used_daily_state: !!dailyState,
    },
    generated_by: "genkit",
    genkit_trace_id: workout.trace_id,
    ai_model: "gemini-2.0-flash-exp",
    generation_tokens: null,
    generation_cost_usd: null,
    completed: false,
    completed_at: null,
    scheduled_for: null,
    difficulty_rating: null,
    enjoyment_rating: null,
    completion_percentage: null,
    user_notes: null,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });

  console.log("✅ Workout generated:", workoutRef.id);
  return workoutRef.id;
}
```

---

## 🎯 **Summary**

**Phase 1 Collections (Core):**

- ✅ `users` - Account status
- ✅ `user_profiles` - Core profile data (fitness level, injuries, equipment)
- ✅ `workout_focuses` - Reference data
- ✅ `equipment_items` - Reference data

**Phase 2 Enhancements (Same Collections):**

- ✅ `user_profiles` - Add preferences, experience, metrics (all nullable)

**Phase 3 Collections (Real-time):**

- ✅ `user_daily_state` - Daily state for adaptive workouts
- ✅ `trainer_workouts` - Generated workouts with context
- ✅ `trainer_workout_history` - Completed workouts with feedback

**Total Collections:** 10 core collections (expandable to 15+ with Coach, Chef, Calendar, Wearables)

**Security:** Comprehensive Firestore rules with role-based access

**TypeScript:** Fully typed interfaces for all documents

**Ready to Deploy:** Includes seed script for reference data

---

**Blueprint Version:** 1.0  
**Last Updated:** December 28, 2025  
**Status:** Production-Ready
