# Prompt Workflow Documentation

This document describes the complete data flow from user interaction through AI-powered workout generation to database storage.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ProfileSetup.tsx                        DailyCheckIn.tsx                  │
│   ┌──────────────────────┐               ┌──────────────────────┐          │
│   │ • Age, Gender        │               │ • Trainer Selection  │          │
│   │ • Weight, Height     │               │ • Focus Option       │          │
│   │ • Fitness Level      │               │ • Duration           │          │
│   │ • Goals, Injuries    │               │ • Sleep/Energy       │          │
│   │ • Medical Conditions │               │ • Target Muscles     │          │
│   │ • Preferences        │               │ • Equipment          │          │
│   └──────────┬───────────┘               └──────────┬───────────┘          │
│              │                                      │                       │
│              ▼                                      ▼                       │
│   ┌──────────────────────────────────────────────────────────────┐         │
│   │                        App.tsx                                │         │
│   │                   (Orchestration Layer)                       │         │
│   │                                                              │         │
│   │   handleProfileSave()              handleGenerate()          │         │
│   └──────────┬───────────────────────────────┬───────────────────┘         │
│              │                               │                              │
└──────────────┼───────────────────────────────┼──────────────────────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│     dbService.ts         │    │        geminiService.ts          │
│                          │    │                                  │
│ • saveUserProfile()      │    │ • generateWorkout()              │
│ • getUserProfile()       │    │   - System Instruction           │
│ • saveWorkoutToDb()      │    │   - User Prompt                  │
│ • getUserWorkouts()      │    │   - Response Schema              │
└──────────┬───────────────┘    └──────────────┬───────────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│        Supabase          │    │         Gemini 2.5 Flash         │
│                          │    │                                  │
│ • profile_attributes     │    │ • Structured JSON Response       │
│ • workouts               │    │ • WorkoutPlan Object             │
│ • workout_exercises      │    │                                  │
└──────────────────────────┘    └──────────────────────────────────┘
```

---

## 1. User Profile Data Flow

### Source Component: `ProfileSetup.tsx`

The profile form collects static user attributes that persist across sessions.

**Form Fields:**

- Age, Gender
- Weight (lbs or kg based on unit preference)
- Height (ft/in or cm based on unit preference)
- Fitness Level (Beginner, Intermediate, Advanced, Elite)
- Goals (comma-separated)
- Injuries (comma-separated)
- Medical Conditions (comma-separated)
- Preferences/Equipment (comma-separated)

**Handler:**

```typescript
// components/ProfileSetup.tsx (lines 33-44)
const handleSave = () => {
  const finalProfile: UserProfile = {
    ...localProfile,
    goals: rawGoals
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    injuries: rawInjuries
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    medicalConditions: rawMedical
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    preferences: rawPreferences
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  };
  onSave(finalProfile);
};
```

### Data Type: `UserProfile`

Defined in `types.ts` (lines 5-16):

```typescript
export interface UserProfile {
  age: number;
  gender: string;
  weight: number; // lbs if standard, kg if metric
  height: number; // inches if standard, cm if metric
  units: UnitSystem; // 'standard' | 'metric'
  goals: string[];
  medicalConditions: string[];
  injuries: string[];
  preferences: string[];
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
}
```

### Storage: EAV Pattern

Profile data uses an Entity-Attribute-Value (EAV) pattern in the `profile_attributes` table.

**Save Process** (`dbService.ts` lines 204-253):

1. Convert `UserProfile` object into individual attribute rows
2. Delete existing user attributes (clean slate)
3. Insert fresh rows for each attribute
4. Array fields (goals, injuries, etc.) are JSON-serialized

```typescript
const attributes = [
  { user_id: userId, attribute_name: 'age', attribute_value: profile.age?.toString() },
  { user_id: userId, attribute_name: 'gender', attribute_value: profile.gender },
  { user_id: userId, attribute_name: 'goals', attribute_value: JSON.stringify(profile.goals) },
  // ... etc
];
```

---

## 2. Daily Check-In Data Flow

### Source Component: `DailyCheckIn.tsx`

The daily check-in form collects dynamic context for today's workout.

**Form Elements:**

- **Trainer Selection**: 6 trainer personas with distinct philosophies
- **Focus Options**: 7 specialized objectives per trainer
- **Duration Slider**: 15-120 minutes
- **Sleep Quality Slider**: 1-10 scale
- **Energy Level Slider**: 1-10 scale
- **Target Muscles**: Optional comma-separated list
- **Equipment Available**: Optional comma-separated list

**Handler:**

```typescript
// components/DailyCheckIn.tsx (lines 90-103)
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const context: DailyContext = {
    duration,
    sleepQuality: sleep,
    energyLevel: energy,
    soreness: [],
    targetMuscleGroups: targetMuscles
      ? targetMuscles.split(',').map((s) => s.trim())
      : ['Full Body'],
    equipmentAvailable: equipment ? equipment.split(',').map((s) => s.trim()) : ['Gym Access'],
    workoutType: 'Mixed',
    selectedFocus: selectedFocus,
  };
  onSubmit(context, trainer);
};
```

### Data Type: `DailyContext`

Defined in `types.ts` (lines 19-28):

```typescript
export interface DailyContext {
  duration: number; // minutes
  sleepQuality: number; // 1-10
  energyLevel: number; // 1-10
  soreness: string[]; // specific muscles or 'None'
  targetMuscleGroups: string[];
  equipmentAvailable: string[];
  workoutType: string; // e.g., HIIT, Strength, Yoga
  selectedFocus: string; // The specific objective from trainer options
}
```

### Trainer Types & Focus Options

Defined in `types.ts` (lines 31-65):

| Trainer Type                           | Description               | Example Focus Options                                      |
| -------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| Functional Training Specialist         | Movement-based training   | Core Stability, Balance & Coordination, Movement Mechanics |
| Bodybuilding/Hypertrophy Coach         | Muscle building           | Muscle Growth, Aesthetics & Symmetry, Isolation Training   |
| Strength & Powerlifting Coach          | Maximum strength          | Maximal Strength, Power Output, Compound Lifts             |
| Yoga & Mobility Instructor             | Flexibility & mindfulness | Flexibility Training, Breathwork, Flow Sequences           |
| High-Intensity Interval Trainer        | Maximum intensity         | Fat Burn, Metabolic Conditioning, Tabata Circuits          |
| Rehabilitation & Corrective Specialist | Injury recovery           | Prehab, Postural Correction, Pain-Free Movement            |

---

## 3. Orchestration in App.tsx

### Workflow Entry Point

When the user submits the DailyCheckIn form:

```typescript
// App.tsx (lines 348-366)
const handleGenerate = async (dailyContext: DailyContext, trainer: TrainerType) => {
  setIsLoading(true);
  setError(null);
  setWorkoutPlan(null);

  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    const plan = await generateWorkout(profile, dailyContext, trainer);
    setWorkoutPlan(plan);
    setCurrentView('active-workout');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to generate workout.';
    setError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};
```

**Key Inputs to `generateWorkout()`:**

1. `profile` - Static `UserProfile` from React state (loaded from DB on authentication)
2. `dailyContext` - Fresh `DailyContext` from the form submission
3. `trainer` - Selected `TrainerType` enum value

---

## 4. Gemini API Prompt Construction

### Service: `geminiService.ts`

The AI workout generation uses Google's Gemini 2.5 Flash model with structured output.

### System Instruction (lines 80-94)

Sets the AI persona and behavioral constraints:

```typescript
const systemInstruction = `
  You are an expert Personal Trainer specialized in ${trainerType}. 
  Your goal is to generate a highly specific, safe, and effective workout plan based on the user's static profile and their daily bio-feedback.
  
  TONE AND STYLE:
  - Adopt the persona of a ${trainerType}.
  - If sleep or energy is low, adjust intensity accordingly and be encouraging.
  - If injuries are present, strictly avoid aggravating exercises and suggest alternatives.
  - Be precise with numbers (reps, sets, rest).
  - **CRITICAL**: The user prefers ${profile.units} units. All weights must be implied to be in ${weightUnit} unless specifying RPE.
  
  OUTPUT FORMAT:
  - You must return valid JSON conforming to the provided schema.
  - No markdown formatting outside the JSON structure.
`;
```

### User Prompt (lines 96-114)

Structures user data for the AI:

```typescript
const prompt = `
  USER PROFILE:
  - Age: ${profile.age}, Gender: ${profile.gender}
  - Stats: ${profile.weight}${weightUnit}, ${profile.height}${profile.units === 'standard' ? 'in' : 'cm'}
  - Level: ${profile.fitnessLevel}
  - Injuries: ${profile.injuries.join(', ') || 'None'}
  - Goals: ${profile.goals.join(', ')}
  
  DAILY CONTEXT (Use this to adjust today's workout):
  - Primary Objective/Focus: ${daily.selectedFocus} (Crucial: Design the entire plan around this)
  - Available Time: ${daily.duration} mins
  - Sleep Quality: ${daily.sleepQuality}/10
  - Energy Level: ${daily.energyLevel}/10
  - Soreness: ${daily.soreness.join(', ') || 'None'}
  - Specific Target Muscles: ${daily.targetMuscleGroups.join(', ')}
  - Equipment: ${daily.equipmentAvailable.join(', ')}
  
  Generate the workout now.
`;
```

### Response Schema (lines 20-66)

Enforces structured JSON output:

```typescript
const workoutSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    trainerNotes: { type: Type.STRING },
    totalDuration: { type: Type.NUMBER },
    estimatedCalories: { type: Type.NUMBER },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['Warmup', 'Main Workout', 'Cooldown', 'Finisher'] },
          durationEstimate: { type: Type.STRING },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                sets: { type: Type.NUMBER },
                muscleTarget: { type: Type.STRING },
                tempo: { type: Type.STRING },
                cues: { type: Type.ARRAY, items: { type: Type.STRING } },
                setDetails: {
                  type: Type.ARRAY,
                  items: {
                    /* reps, weight, duration, rest, notes */
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
```

### API Call (lines 116-140)

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
  config: {
    systemInstruction: systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: workoutSchema,
    temperature: 0.7, // Some creativity for variety
  },
});

const plan = JSON.parse(response.text) as WorkoutPlan;
plan.trainerType = trainerType;
plan.focus = daily.selectedFocus;
return plan;
```

---

## 5. Workout Storage Flow

### Trigger: `WorkoutDisplay.tsx`

Two save mechanisms exist:

1. **Full Save** - `handleFullSave()` (lines 195-206)
   - Saves entire workout including all exercises
   - Triggered by "Save Workout" button
2. **Weight Save** - `handleSaveWeights()` (lines 180-193)
   - Saves workout with user-logged actual weights
   - Triggered from exercise detail modal

Both call `saveWorkoutToDb(localPlan, userId)`.

### Service: `dbService.ts` - `saveWorkoutToDb()` (lines 258-423)

#### Step 1: Prepare Workouts Table Payload

```typescript
const payload = {
  user_id: userId,
  title: workout.title,
  description: workout.description,
  difficulty: workout.difficulty,
  trainer_notes: workout.trainerNotes,
  total_duration: safeDuration,
  duration: safeDuration, // Legacy column support
  estimated_calories: workout.estimatedCalories,
  created_at: workout.createdAt || new Date().toISOString(),
  trainer_type: workout.trainerType || null,
  focus: safeFocus,
  exercises: exerciseNames, // Array of exercise names for quick reference
};
```

#### Step 2: Insert/Update Workout Record

The service uses a retry loop with schema compatibility handling:

- Attempts INSERT for new workouts
- Falls back to UPDATE if ID exists
- Automatically removes missing columns if schema mismatch

#### Step 3: Insert Exercise Records

```typescript
// Delete existing exercises for this workout (if updating)
await supabase.from('workout_exercises').delete().eq('workout_id', workoutId);

// Prepare exercise records
workout.sections.forEach((section) => {
  section.exercises.forEach((exercise) => {
    exercisesToInsert.push({
      workout_id: workoutId,
      section_type: section.type,
      name: exercise.name,
      muscle_target: exercise.muscleTarget,
      sets_count: exercise.sets,
      tempo: exercise.tempo || null,
      cues: exercise.cues || [],
      set_details: exercise.setDetails || [],
    });
  });
});

// Insert all exercises
await supabase.from('workout_exercises').insert(exercisesToInsert);
```

---

## 6. Database Schema (Supabase)

### Tables Overview

| Table                | Purpose                   | Key Columns                                             |
| -------------------- | ------------------------- | ------------------------------------------------------- |
| `profile_attributes` | User profile (EAV format) | user_id, attribute_name, attribute_value                |
| `workouts`           | Workout metadata          | id, user_id, title, duration, trainer_type, focus       |
| `workout_exercises`  | Individual exercises      | workout_id, section_type, name, sets_count, set_details |

### Table: `profile_attributes`

```
┌─────────────────────────────────────────────────────────────┐
│ user_id (UUID)  │ attribute_name │ attribute_value          │
├─────────────────┼────────────────┼──────────────────────────┤
│ abc-123         │ age            │ "30"                     │
│ abc-123         │ gender         │ "Male"                   │
│ abc-123         │ weight         │ "175"                    │
│ abc-123         │ goals          │ '["Hypertrophy","Strength"]' │
│ abc-123         │ injuries       │ '["Left Shoulder Impingement"]' │
└─────────────────────────────────────────────────────────────┘
```

### Table: `workouts`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ id       │ user_id  │ title           │ duration │ trainer_type  │ focus     │
├──────────┼──────────┼─────────────────┼──────────┼───────────────┼───────────┤
│ wk-001   │ abc-123  │ "Power Builder" │ 60       │ "Powerlifting"│ "Maximal" │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Table: `workout_exercises`

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ workout_id │ section_type  │ name          │ muscle_target │ sets_count │ ...  │
├────────────┼───────────────┼───────────────┼───────────────┼────────────┼──────┤
│ wk-001     │ Main Workout  │ Barbell Squat │ Quadriceps    │ 5          │ ...  │
│ wk-001     │ Main Workout  │ Romanian DL   │ Hamstrings    │ 4          │ ...  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

- `profile_attributes.user_id` → Auth user ID (Supabase Auth)
- `workouts.user_id` → Auth user ID
- `workout_exercises.workout_id` → `workouts.id` (Foreign Key)

---

## Summary Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. PROFILE SETUP (One-time or occasional)                                  │
│                                                                             │
│  User edits profile → ProfileSetup.tsx → App.handleProfileSave()            │
│                            ↓                                                │
│                    dbService.saveUserProfile()                              │
│                            ↓                                                │
│                    Supabase: profile_attributes table                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  2. WORKOUT GENERATION (Each session)                                       │
│                                                                             │
│  User submits DailyCheckIn → App.handleGenerate()                           │
│                            ↓                                                │
│         geminiService.generateWorkout(profile, dailyContext, trainer)       │
│                            ↓                                                │
│                    Gemini 2.5 Flash API                                     │
│                            ↓                                                │
│                    Returns: WorkoutPlan object                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  3. WORKOUT DISPLAY & LOGGING                                               │
│                                                                             │
│  WorkoutPlan rendered in WorkoutDisplay.tsx                                 │
│                            ↓                                                │
│  User logs actual weights for each set                                      │
│                            ↓                                                │
│  localPlan state updated with actualWeight values                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  4. WORKOUT SAVE (User action)                                              │
│                                                                             │
│  User clicks "Save Workout" → WorkoutDisplay.handleFullSave()               │
│                            ↓                                                │
│                    dbService.saveWorkoutToDb(localPlan, userId)             │
│                            ↓                                                │
│  Supabase: workouts table (metadata) + workout_exercises table (details)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Parent-child app architecture and multi-mode authentication
- [AUTH_SETUP.md](./AUTH_SETUP.md) - Authentication setup and RLS policies
