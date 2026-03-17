# Onboarding Wizard Questions and Responses

This document lists all questions and available responses in the onboarding wizard.

## Overview

The onboarding wizard consists of **8 steps** that collect user profile information for personalized workout generation.

---

## Step 1: Basic Info

**Title**: Basic info  
**Description**: This helps personalize your experience.

### Questions

1. **First name**
   - **Type**: Text input
   - **Required**: Yes
   - **Placeholder**: "Jane"
   - **Validation**: Must not be empty (trimmed length > 0)

2. **Last name**
   - **Type**: Text input
   - **Required**: Yes
   - **Placeholder**: "Doe"
   - **Validation**: Must not be empty (trimmed length > 0)

3. **Gender**
   - **Type**: Dropdown select
   - **Required**: Yes (defaults to "prefer_not_to_say")
   - **Options**:
     - `male` - Male
     - `female` - Female
     - `non_binary` - Non-binary
     - `prefer_not_to_say` - Prefer not to say (default)

**Navigation**: Continue button (disabled until all required fields are filled)

---

## Step 2: Body Stats

**Title**: Body stats  
**Description**: Used for scaling workouts and recommendations.

### Questions

1. **Age**
   - **Type**: Number input
   - **Required**: Yes
   - **Placeholder**: "30"
   - **Validation**: Must be between 13 and 120 (inclusive)

2. **Height**
   - **Type**: Number input with unit selector
   - **Required**: Yes
   - **Placeholder**: "72"
   - **Unit Options**:
     - `in` - Inches (default)
     - `cm` - Centimeters
   - **Validation**: Must be greater than 0

3. **Weight**
   - **Type**: Number input with unit selector
   - **Required**: Yes
   - **Placeholder**: "180"
   - **Unit Options**:
     - `lb` - Pounds (default)
     - `kg` - Kilograms
   - **Validation**: Must be greater than 0

**Navigation**: Back button, Continue button (disabled until all fields are valid)

---

## Step 3: Fitness Level

**Title**: Fitness level  
**Description**: So workouts match your current ability and schedule.

### Questions

1. **Fitness level**
   - **Type**: Dropdown select
   - **Required**: Yes (defaults to "beginner")
   - **Options**:
     - `beginner` - Beginner (default)
     - `intermediate` - Intermediate
     - `advanced` - Advanced
     - `athlete` - Athlete

2. **Activity level**
   - **Type**: Dropdown select
   - **Required**: Yes (defaults to "moderately_active")
   - **Options**:
     - `sedentary` - Sedentary
     - `lightly_active` - Lightly active
     - `moderately_active` - Moderately active (default)
     - `very_active` - Very active
     - `extremely_active` - Extremely active

**Navigation**: Back button, Continue button (disabled until both fields are selected)

---

## Step 4: Goals

**Title**: Goals  
**Description**: Pick at least one—this steers workout recommendations.

### Questions

1. **Fitness goals** (multi-select)
   - **Type**: Checkboxes (grid layout)
   - **Required**: Yes (at least one must be selected)
   - **Options**:
     - "Build muscle"
     - "Lose fat"
     - "Improve endurance"
     - "Increase strength"
     - "Mobility & flexibility"
     - "General health"
   - **Note**: User can select multiple goals

**Navigation**: Back button, Continue button (disabled until at least one goal is selected)

---

## Step 5: Safety

**Title**: Safety  
**Description**: Help us avoid movements that might aggravate injuries or conditions.

### Questions

1. **Injuries** (optional, multi-select)
   - **Type**: Checkboxes (grid layout)
   - **Required**: No
   - **Options**:
     - "Knee"
     - "Shoulder"
     - "Back"
     - "Hip"
     - "Ankle"
     - "Wrist"
     - "Neck"
   - **Note**: User can select multiple injuries

2. **Injury details** (optional)
   - **Type**: Textarea
   - **Required**: No
   - **Placeholder**: "Any details? (optional)"
   - **Note**: Free-form text for additional injury information

3. **Medical conditions** (optional, multi-select)
   - **Type**: Checkboxes (grid layout)
   - **Required**: No
   - **Options**:
     - "None" (clears all selections)
     - "High blood pressure"
     - "Asthma"
     - "Diabetes"
     - "Heart condition"
     - "Pregnancy"
   - **Note**: User can select multiple conditions. Selecting "None" clears all selections.

4. **Medical notes** (optional)
   - **Type**: Textarea
   - **Required**: No
   - **Placeholder**: "Any notes? (optional)"
   - **Note**: Free-form text for additional medical information

**Navigation**: Back button, Continue button (always enabled - all fields are optional)

---

## Step 6: Equipment

**Title**: Equipment  
**Description**: Tell us what you have access to so we can tailor workouts.

### Questions

1. **Equipment Categories** (multi-select)
   - **Type**: Horizontal scrolling pill selector
   - **Required**: Yes (can be empty array for bodyweight-only)
   - **Note**: Categories available depend on fitness level selected in Step 3
   - **Category Options** (filtered by fitness level):

     **Beginner**:
     - `general` - General / Universal
     - `strength` - Strength Training
     - `functional` - Functional Training
     - `cardio` - Cardio

     **Intermediate** (includes all Beginner categories plus):
     - `calisthenics` - Calisthenics
     - `yoga` - Yoga
     - `pilates` - Pilates
     - `mobility` - Mobility

     **Advanced** (includes all Intermediate categories plus):
     - `strongman` - Strongman
     - `olympic` - Olympic Lifting
     - `recovery` - Recovery

     **Athlete** (includes all Advanced categories plus):
     - `combat` - Combat Sports
     - `rehab` - Rehabilitation
     - `outdoor` - Outdoor Training
     - `aquatic` - Aquatic Training
     - `smart` - Smart Equipment

2. **Available Equipment Items** (multi-select)
   - **Type**: Checkboxes grouped by selected categories
   - **Required**: No (auto-populated based on selected categories)
   - **Note**:
     - Equipment items are displayed in cards grouped by category
     - Items are automatically selected when categories are chosen
     - User can deselect specific equipment items they don't have
     - Shows "Select All / Deselect All" buttons for each category and entire list
   - **Source**: Fetched from `equipment_items` collection in Firestore

**Navigation**: Back button, Continue button (enabled as long as equipment_access is a valid array)

---

## Step 7: Training Preferences

**Title**: Training preferences  
**Description**: Help us customize your workout schedule. All fields are optional.

### Questions

1. **Preferred workout duration** (optional)
   - **Type**: Dropdown select
   - **Required**: No
   - **Placeholder**: "Select duration (optional)"
   - **Options**:
     - `15` - 15 minutes
     - `30` - 30 minutes
     - `45` - 45 minutes
     - `60` - 60 minutes
     - `90` - 90 minutes

2. **Workouts per week** (optional)
   - **Type**: Dropdown select
   - **Required**: No
   - **Placeholder**: "Select frequency (optional)"
   - **Options**:
     - `3` - 3 days
     - `4` - 4 days
     - `5` - 5 days
     - `6` - 6 days
     - `7` - 7 days

3. **Preferred workout times** (optional, multi-select)
   - **Type**: Checkboxes (grid layout)
   - **Required**: No
   - **Options**:
     - `morning` - Morning
     - `afternoon` - Afternoon
     - `evening` - Evening
   - **Note**: User can select multiple times

4. **Rest between sets** (optional)
   - **Type**: Dropdown select
   - **Required**: No
   - **Placeholder**: "Select rest time (optional)"
   - **Options**:
     - `30` - 30 seconds
     - `60` - 60 seconds
     - `90` - 90 seconds
     - `120` - 120 seconds

**Navigation**: Back button, Continue button (always enabled - all fields are optional)

---

## Step 8: Experience & Background

**Title**: Experience & background  
**Description**: Tell us about your training history. All fields are optional.

### Questions

1. **Years of training experience** (optional)
   - **Type**: Number input
   - **Required**: No
   - **Placeholder**: "e.g., 5"
   - **Min**: 0
   - **Max**: 50
   - **Note**: Enter 0 if just starting out

2. **Sports background** (optional, multi-select)
   - **Type**: Checkboxes (scrollable grid)
   - **Required**: No
   - **Options**:
     - Basketball
     - Swimming
     - Running
     - Cycling
     - Martial Arts
     - Soccer
     - Tennis
     - Volleyball
     - Baseball
     - Football
     - Hockey
     - Gymnastics
     - Dancing
     - Yoga
     - Pilates
     - CrossFit
     - Powerlifting
     - Bodybuilding
     - Calisthenics
     - Rock Climbing
     - Surfing
     - Skiing
     - Snowboarding
     - None
   - **Note**: User can select multiple sports

3. **Previous training programs** (optional, multi-select)
   - **Type**: Checkboxes (scrollable grid)
   - **Required**: No
   - **Options**:
     - CrossFit
     - Bodybuilding
     - Powerlifting
     - Calisthenics
     - Strongman
     - Olympic Lifting
     - Powerbuilding
     - P90X
     - Insanity
     - Beachbody
     - Orange Theory
     - F45
     - Barry's Bootcamp
     - Peloton
     - Nike Training Club
     - Freeletics
     - None
   - **Note**: User can select multiple programs

**Navigation**: Back button, Finish button (always enabled - all fields are optional)

---

## Data Collected Summary

### Required Fields

- First name
- Last name
- Gender (defaults to "prefer_not_to_say")
- Age (13-120)
- Height (with unit)
- Weight (with unit)
- Fitness level (defaults to "beginner")
- Activity level (defaults to "moderately_active")
- Fitness goals (at least one)
- Equipment access (array, can be empty for bodyweight-only)

### Optional Fields

- Injury details (text)
- Medical conditions (array)
- Medical notes (text)
- Preferred workout duration
- Workout frequency per week
- Preferred workout times (array)
- Preferred rest between sets
- Training experience years
- Sports background (array)
- Previous training programs (array)

### Default Values

- `gender`: "prefer_not_to_say"
- `fitness_level`: "beginner"
- `current_activity_level`: "moderately_active"
- `preferred_units.weight`: "lb"
- `preferred_units.height`: "in"
- `preferred_units.distance`: "mi"
- `preferred_units.temperature`: "f"
- `equipment_access`: [] (empty array)
- `injuries`: [] (empty array)
- `medical_conditions`: [] (empty array)
- `fitness_goals`: [] (empty array)
- `available_equipment`: [] (empty array)

---

## Notes

- The wizard auto-populates first and last name from the user's Firebase `displayName` if available
- Equipment categories are filtered based on the fitness level selected in Step 3
- Equipment items are auto-selected when categories are chosen, but users can deselect items they don't have
- All optional fields can be skipped by clicking Continue/Finish
- The wizard validates required fields before allowing progression to the next step
