# First-Time User Workflow: Signup to Workout Generation

This document outlines the complete workflow for first-time users from initial signup through workout generation.

## Overview

The application supports two primary entry paths for new users:

1. **Website Integration Flow** (Phase A → Phase B): Users start on the website's Workout Plan Builder, then complete onboarding in the app
2. **Direct App Signup Flow**: Users sign up directly in the app and complete full onboarding

Both paths converge at the same point: Daily Check-In → Workout Generation → Workout View.

---

## Entry Paths

### Path 1: Website Integration (Phase A → Phase B)

**Entry Point**: User arrives at `/signup` with URL parameters from the website

**Flow**:

1. User fills out Workout Plan Builder form on website
2. Website redirects to `/signup?{params}` with Phase A data
3. App parses and stores Phase A data in `sessionStorage`
4. User authenticates (signup/login)
5. App redirects to `/onboarding/continue` for Phase B wizard
6. User completes remaining fields (name, body stats, safety, equipment)
7. Profile saved → Redirect to Daily Check-In

**Phase A Data Collected** (from website):

- Fitness level
- Activity level
- Fitness goals
- Equipment access categories
- Unit preferences (weight, height, distance, temperature)
- Optional: Gender, age

**Phase B Data Collected** (in app):

- First name, Last name
- Body stats (weight, height)
- Safety (injuries, medical conditions)
- Equipment items (if equipment_access is not empty)

---

### Path 2: Direct App Signup

**Entry Point**: User navigates to `/signup` or `/login` without URL parameters

**Flow**:

1. User authenticates (signup/login)
2. App checks if user has completed onboarding
3. If not completed → Redirect to `/onboarding`
4. User completes full 8-step onboarding wizard
5. Profile saved → Redirect to Daily Check-In

**Full Onboarding Steps**:

1. Basic Info (name, gender)
2. Body Stats (age, weight, height, units)
3. Fitness (fitness level, activity level)
4. Goals (fitness goals)
5. Safety (injuries, medical conditions)
6. Equipment (categories and items)
7. Training Preferences (optional)
8. Experience (optional)

---

## Authentication

### Signup Page (`/signup`)

**Purpose**: Entry point for new users, handles both website redirects and direct signups

**Features**:

- Parses URL parameters from website (if present)
- Stores Phase A data in `sessionStorage`
- Shows summary banner if Phase A data exists
- Renders `AuthForm` component
- Redirects authenticated users:
  - With Phase A data → `/onboarding/continue`
  - Without Phase A data → `/onboarding`

**Auth Methods**:

- Email/password signup
- Google OAuth sign-in

**Post-Auth Redirect Logic**:

```typescript
if (hasCompletedOnboarding) {
  redirectPath = "/"; // Dashboard
} else {
  redirectPath = hasPhaseAData()
    ? "/onboarding/continue" // Phase B wizard
    : "/onboarding"; // Full wizard
}
```

---

## Onboarding Flows

### Phase B Wizard (`/onboarding/continue`)

**Purpose**: Streamlined onboarding for users coming from website

**Prerequisites**:

- User must be authenticated
- Phase A data must exist in `sessionStorage`

**Steps**:

1. **Summary** (read-only): Displays Phase A data collected from website
2. **Name**: First name, Last name
3. **Body Stats**: Weight, Height
4. **Safety**: Injuries, Medical conditions
5. **Equipment Items**: Only shown if `equipment_access` is not empty

**Completion**:

- Validates all required fields
- Saves complete profile to Firestore (`user_profiles` collection)
- Sets `onboarding_completed: true`
- Shows success toast: "Let's complete your daily check-in to personalize your first workout."
- Redirects to `/daily-checkin?from=signup`

**Auto-Population**:

- First/Last name: Auto-populated from Firebase `displayName` if available

---

### Full Onboarding Wizard (`/onboarding`)

**Purpose**: Complete onboarding for users signing up directly in the app

**Prerequisites**:

- User must be authenticated
- User must not have completed onboarding

**Steps** (8 total):

1. **Basic Info**: First name, Last name, Gender
2. **Body Stats**: Age, Weight, Height, Unit preferences
3. **Fitness**: Fitness level, Current activity level
4. **Goals**: Fitness goals (multi-select)
5. **Safety**: Injuries, Injury details, Medical conditions, Medical notes
6. **Equipment**: Equipment categories (filtered by fitness level), Equipment items
7. **Training Preferences** (optional): Workout duration, Frequency, Preferred times, Rest between sets
8. **Experience** (optional): Training experience years, Sports background, Previous training programs

**Completion**:

- Validates all required fields
- Saves complete profile to Firestore
- Sets `onboarding_completed: true`
- Shows success toast: "Let's complete your daily check-in to personalize your first workout."
- Redirects to `/daily-checkin?from=signup`

**Auto-Population**:

- First/Last name: Auto-populated from Firebase `displayName` if available
- Equipment categories: Filtered based on selected fitness level (cumulative: beginner → intermediate → advanced → athlete)

**Navigation**:

- Progress bar shows current step
- Back button available (except step 1)
- Continue button disabled until required fields are filled
- Can navigate between steps freely

---

## Daily Check-In

### Daily Check-In Page (`/daily-checkin`)

**Purpose**: Collect daily context for personalized workout generation

**Prerequisites**:

- User must be authenticated
- User must have completed onboarding

**First-Time Flow** (`?from=signup`):

- Shows welcome message: "Welcome! Your profile is all set up."
- Customized copy: "Complete this quick check-in so we can personalize your first AI-generated workout based on how you're feeling today."
- Title: "Quick Check-In"

**Regular Flow**:

- Standard title: "Daily Check-In"
- Description: "Share today's context to generate a workout that matches how you feel."

**Data Collected**:

- **Energy level**: Slider (1-10), default: 6
- **Sleep quality**: Slider (1-10), default: 6
- **Sleep hours**: Number input (optional)
- **Stress level**: Slider (1-10), default: 4
- **Motivation level**: Slider (1-10), default: 6
- **Soreness areas**: Multi-select (optional)
- **Current location**: Dropdown (home, gym, outdoor, travel, other)
- **Available time**: Number input (minutes, optional)
- **Weather condition**: Dropdown (optional)
- **Temperature**: Number input (optional)
- **Cycle phase**: Dropdown (for users tracking menstrual cycle, optional)
- **Cycle symptoms**: Text input (optional)

**Storage**:

- Saved to Firestore `user_daily_state` collection
- Document ID format: `{userId}_{YYYY-MM-DD}`
- Includes server timestamps (`created_at`, `updated_at`)
- Includes human-readable `saved_at_datetime`

**Completion**:

- Validates form data
- Saves to Firestore using `DailyStateService.upsertUserDailyState()`
- Shows success toast: "Check-in saved successfully! Your daily check-in for {date} has been saved. Redirecting to workout generation..."
- After 1.5 second delay → Redirects to `/generate`

---

## Workout Generation

### Generate Workout Page (`/generate`)

**Purpose**: Configure and generate AI-powered personalized workouts

**Prerequisites**:

- User must be authenticated
- User must have completed onboarding
- User must have completed daily check-in (recommended, but not enforced)

**Steps** (4-step flow):

#### Step 1: Trainer Selection

- Displays trainer cards with:
  - Trainer profile image
  - Trainer banner image
  - Trainer name
  - Trainer bio
  - Available focuses
- Shows recommended trainer badge if user's fitness goals match trainer's specialties
- User selects a trainer
- **Next**: Proceeds to Focus selection

#### Step 2: Focus Selection

- Displays focus options for selected trainer
- Each focus shows:
  - Focus name
  - Focus description
- User selects a focus (or can skip if trainer has no focuses)
- **Next**: Proceeds to Waiver (if required) or Equipment selection

#### Step 3: Liability Waiver

- Checks if user has agreed to waiver for selected trainer
- If not agreed:
  - Displays waiver text
  - User must check "I agree" checkbox
  - User clicks "Agree and Continue"
  - Waiver agreement saved to Firestore
- If already agreed: Skips to Equipment selection
- **Next**: Proceeds to Equipment selection

#### Step 4: Equipment Selection

- **Equipment Categories**: Filtered based on user's `fitness_level` (same filtering as onboarding)
- **Available Equipment**:
  - Shows all equipment from trainer's equipment set (for selected trainer + focus)
  - Pre-selects intersection: equipment user has (`available_equipment`) AND is in trainer's set
  - User can add/remove equipment as needed
- **Select All / Deselect All**:
  - Global button for entire list
  - Per-category buttons for each category section
- **Workout Duration**: Dropdown (15, 20, 30, 45, 60, 75, 90 minutes), default: 45
- **Generate Button**:
  - Validates selections
  - Checks subscription limits
  - Shows pricing modal if limit exceeded
  - Calls API to generate workout

**Subscription Limits**:

- Free tier: Limited workouts per month
- Checks `canGenerate` from `useSubscription` hook
- If limit exceeded, shows `PricingModal` with upgrade options

**Workout Generation**:

- API endpoint: `/api/workouts/generate`
- Payload includes:
  - `trainerId`
  - `focus` (focus name, if selected)
  - `duration_minutes`
  - `equipment_access` (categories, if provided)
  - `available_equipment` (equipment IDs, if provided)
- Backend combines:
  - User profile data (from `user_profiles`)
  - Daily check-in data (from `user_daily_state`)
  - Workout generation input
- Generates workout via Firebase Cloud Function
- Returns workout ID

**Success**:

- Shows success toast: "Workout generated successfully!"
- Refreshes workout count
- Redirects to `/workouts?id={workoutId}`

**Error Handling**:

- Transient rate limit errors: Shows error with retry suggestion
- Other errors: Shows standard error message
- Returns to Equipment step on error

---

## Workout View

### Workout Details Page (`/workouts`)

**Purpose**: Display generated workout with full details

**URL**: `/workouts?id={workoutId}`

**Features**:

- **Workout Display**: Full workout details with sections, exercises, sets, reps, rest periods
- **Edit Mode**: User can edit workout sections (saves to Firestore)
- **Certification**:
  - Submit workout for trainer certification
  - View certification status (pending, approved, rejected, certified)
  - Certification status badge displayed if certified
- **Workout Player** (linked from this page): users log sets, mark exercise progress, and open the completion modal there; workout details here are for review and editing only.
- **Navigation**:
  - Back to Dashboard button
  - **Workout Player** (opens `/workouts/{workoutId}/player` for the live session)
  - "Try Different Settings" button (returns to `/generate` with same selections)
  - "Generate Another Workout" button (returns to `/generate` with fresh state)

**Mobile**:

- Sticky bottom bar with "Try Again" and "New Workout" buttons

---

## Dashboard

### Dashboard Page (`/`)

**Purpose**: Main landing page after authentication and onboarding

**Features**:

- **Recent Workouts**: Shows last 3 workouts with links to view details
- **Workout Stats**: Total workouts, completion rate, etc.
- **Subscription Status**: Current tier, remaining workouts, upgrade options
- **Board Section**: Displays board items (announcements, features, etc.)
- **Certification Messages**: Alerts for certification status updates
- **Quick Actions**:
  - "Generate Workout" button
  - "View All Workouts" link to history

**Access Control**:

- Redirects unauthenticated users to `/login`
- Redirects users who haven't completed onboarding to `/onboarding`

---

## Data Flow Summary

### Profile Data (`user_profiles` collection)

**Created During**:

- Phase B wizard completion (website flow)
- Full onboarding wizard completion (direct signup flow)

**Fields**:

- Basic info: `first_name`, `last_name`, `gender`
- Body stats: `age`, `weight`, `height`, `preferred_units`
- Fitness: `fitness_level`, `current_activity_level`, `fitness_goals`
- Safety: `injuries`, `injury_details`, `medical_conditions`, `medical_notes`
- Equipment: `equipment_access` (categories), `available_equipment` (item IDs)
- Training preferences: `preferred_workout_duration`, `workout_frequency_per_week`, etc.
- Experience: `training_experience_years`, `sports_background`, etc.
- Metadata: `onboarding_completed`, `onboarding_completed_at`, `created_at`, `updated_at`

---

### Daily State Data (`user_daily_state` collection)

**Created During**:

- Daily check-in submission

**Document ID**: `{userId}_{YYYY-MM-DD}`

**Fields**:

- `energy_level`, `sleep_quality`, `sleep_hours`
- `stress_level`, `motivation_level`
- `soreness_areas` (array)
- `current_location`
- `available_time` (minutes)
- `weather_condition`, `temperature`
- `cycle_phase`, `cycle_symptoms`
- `data_source` ("manual")
- `date` (ISO date string)
- `saved_at_datetime` (ISO 8601 datetime)
- `time_of_day` (computed: early_morning, morning, afternoon, evening, night)
- `created_at`, `updated_at` (server timestamps)

---

### Workout Data (`trainer_workouts` collection)

**Created During**:

- Workout generation API call

**Fields**:

- `trainer_id`, `focus` (optional)
- `title`, `description`
- `duration_minutes`
- `sections` (array of workout sections with exercises)
- `equipment_access` (categories used)
- `available_equipment` (equipment IDs used)
- `user_id`
- `created_at`, `updated_at`
- `completed_at` (when user marks as complete)
- `certification_status` (if submitted for certification)

---

## Redirect Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Entry Points                              │
├─────────────────────────────────────────────────────────────┤
│ 1. /signup?{params} (from website)                         │
│ 2. /signup (direct)                                          │
│ 3. /login (existing user)                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Authentication                                  │
│  - Email/password or Google OAuth                           │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Has Phase A Data?│    │ No Phase A Data  │
│ (from website)   │    │ (direct signup)   │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ /onboarding/     │    │ /onboarding      │
│ continue         │    │ (full wizard)     │
│ (Phase B)        │    │                   │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Profile Saved                                        │
│         onboarding_completed: true                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         /daily-checkin?from=signup                          │
│         (Daily Check-In)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Check-In Saved                                       │
│         Redirects to /generate                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         /generate                                            │
│         (Workout Generation)                                 │
│         1. Select Trainer                                     │
│         2. Select Focus                                       │
│         3. Agree to Waiver                                   │
│         4. Select Equipment                                  │
│         5. Generate Workout                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         /workouts?id={workoutId}                            │
│         (Workout View)                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         / (Dashboard)                                        │
│         (Main landing page)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key User States

### Unauthenticated User

- Can access: Landing page, `/signup`, `/login`
- Redirected from: Protected routes (`/onboarding`, `/generate`, `/dashboard`, etc.)

### Authenticated, Incomplete Onboarding

- Can access: `/onboarding` or `/onboarding/continue`
- Redirected from: All other routes (except `/signup`, `/login`)

### Authenticated, Completed Onboarding

- Can access: All routes
- Required before workout generation: Daily check-in (recommended, not enforced)

---

## Error Handling

### Authentication Errors

- Invalid credentials: Error message displayed in auth form
- OAuth errors: Error message displayed

### Onboarding Errors

- Missing required fields: Error message, cannot proceed to next step
- Validation errors: Field-level error messages
- Save errors: Toast notification with error message

### Daily Check-In Errors

- Save errors: Toast notification with error message
- No navigation on error (user stays on check-in page)

### Workout Generation Errors

- Rate limit errors: Toast with retry suggestion
- Other errors: Toast with error message
- Returns to Equipment step on error
- Subscription limit: Shows pricing modal

---

## Notes

### Phase A Data Storage

- Stored in `sessionStorage` (not persisted to Firestore)
- Intentional design: Session-specific, not cross-device
- If user abandons Phase B and logs in from different device → Falls back to standard onboarding

### Equipment Filtering

- Equipment categories filtered by `fitness_level`:
  - Beginner: Only beginner categories
  - Intermediate: Beginner + intermediate categories
  - Advanced: Beginner + intermediate + advanced categories
  - Athlete: All categories
- Applied in both onboarding and workout generation

### Equipment Pre-Selection

- In workout generation, equipment is pre-selected based on intersection:
  - User's `available_equipment` (from profile)
  - Trainer's equipment set (for selected trainer + focus)
- User can add/remove equipment before generating

### Subscription Limits

- Enforced at workout generation time
- Free tier has monthly limits
- Premium tiers have higher limits
- Limits checked via `useSubscription` hook

### Daily Check-In

- Not strictly required for workout generation
- Recommended for personalized workouts
- Can be skipped (user can navigate directly to `/generate`)
- Data persists per day (one check-in per day)

---

## Related Documentation

- [Onboarding Wizard Questions](./../landing-page/ONBOARDING_WIZARD_QUESTIONS.md) - Detailed breakdown of all onboarding questions
- [Daily Check-In Data Config](../../DAILY_CHECKIN_DATA_CONFIG.md) - Daily check-in data structure and storage
- [Onboarding Integration](../../plans/ONBOARDING_INTEGRATION.md) - Website integration details
- [AI Prompts and Data Flow](../../AI_PROMPTS_AND_DATA_FLOW.md) - How data flows into AI prompts
