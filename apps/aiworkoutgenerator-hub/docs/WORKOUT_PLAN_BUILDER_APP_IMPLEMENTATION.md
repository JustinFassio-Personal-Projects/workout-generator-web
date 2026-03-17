# Workout Plan Builder - App-Side Implementation Guide

## Overview

This document provides instructions for implementing the app-side workflow that receives users from the website's Workout Plan Builder and completes the onboarding process. This is a **unique workflow** that bypasses the standard OnboardingWizard to avoid duplicating steps already completed on the website.

## Flow Diagram

```
Website (Phase A)                    App (Phase B)
─────────────────                   ──────────────
1. User fills form                  ──┐
2. Plan Preview shown                │
3. "Create account" clicked          │
4. Redirect to /signup?params...    ├─> 1. Parse URL params
                                      │   2. Show "What you've completed" summary
                                      │   3. Auth (signup/login)
                                      │   4. Save Phase A data to user profile
                                      │   5. Show Phase B form (remaining fields)
                                      │   6. Generate workout
                                      │   7. Redirect to dashboard/workout
                                      └──
```

## URL Parameters Received

When users arrive at `https://aiworkoutgen.app/signup?{params}`, the app will receive:

### Required Parameters (Always Present)

- `fitness_level`: `'beginner' | 'intermediate' | 'advanced' | 'athlete'`
- `activity_level`: `'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'`
- `fitness_goals`: Comma-separated string (e.g., `"Build muscle,Lose fat"`)
- `equipment_access`: `'none' | 'minimal' | 'home' | 'full_gym'`
- `units_weight`: `'lb' | 'kg'`
- `units_height`: `'in' | 'cm'`
- `units_distance`: `'mi' | 'km'` (default: `'mi'`)
- `units_temperature`: `'f' | 'c'` (default: `'f'`)

### Optional Parameters (May Be Missing)

- `gender`: `'male' | 'female' | 'non_binary' | 'prefer_not_to_say'` (only if provided)
- `age`: `number` (string in URL, e.g., `"28"`) (only if provided)

## Implementation Steps

### Step 1: Create URL Parameter Parser Utility

**File:** `lib/parseSignupParams.ts` (or similar)

```typescript
import type { WebsiteOnboardingData } from "@/types/onboarding";

interface SignupParams {
  fitness_level?: string;
  activity_level?: string;
  fitness_goals?: string;
  equipment_access?: string;
  units_weight?: string;
  units_height?: string;
  units_distance?: string;
  units_temperature?: string;
  gender?: string;
  age?: string;
}

/**
 * Parses URL search parameters from the signup redirect.
 * Validates and converts to WebsiteOnboardingData format.
 */
export function parseSignupParams(
  searchParams: URLSearchParams
): WebsiteOnboardingData | null {
  // Required fields validation
  const fitness_level = searchParams.get("fitness_level");
  const activity_level = searchParams.get("activity_level");
  const fitness_goals = searchParams.get("fitness_goals");
  const equipment_access = searchParams.get("equipment_access");
  const units_weight = searchParams.get("units_weight");
  const units_height = searchParams.get("units_height");

  // Validate required fields
  if (
    !fitness_level ||
    !activity_level ||
    !fitness_goals ||
    !equipment_access ||
    !units_weight ||
    !units_height
  ) {
    return null;
  }

  // Parse fitness_goals (comma-separated string to array)
  const goalsArray = fitness_goals
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  // Build the data object
  const data: WebsiteOnboardingData = {
    fitness_level: fitness_level as WebsiteOnboardingData["fitness_level"],
    current_activity_level:
      activity_level as WebsiteOnboardingData["current_activity_level"],
    fitness_goals: goalsArray as WebsiteOnboardingData["fitness_goals"],
    equipment_access:
      equipment_access as WebsiteOnboardingData["equipment_access"],
    preferred_units: {
      weight: (units_weight || "lb") as "lb" | "kg",
      height: (units_height || "in") as "in" | "cm",
      distance: (searchParams.get("units_distance") || "mi") as "mi" | "km",
      temperature: (searchParams.get("units_temperature") || "f") as "f" | "c",
    },
  };

  // Optional fields
  const gender = searchParams.get("gender");
  if (gender && gender !== "prefer_not_to_say") {
    data.gender = gender as WebsiteOnboardingData["gender"];
  }

  const ageParam = searchParams.get("age");
  if (ageParam) {
    const age = parseInt(ageParam, 10);
    if (!isNaN(age) && age >= 13 && age <= 120) {
      data.age = age;
    }
  }

  return data;
}
```

### Step 2: Create "What You've Completed" Summary Component

**File:** `components/onboarding/PlanBuilderSummary.tsx`

This component shows users what they've already filled out on the website.

```typescript
'use client'

import React from 'react'
import { CheckCircle2, Target, Dumbbell, Activity, Wrench } from 'lucide-react'
import type { WebsiteOnboardingData } from '@/types/onboarding'
import {
  fitnessLevelOptions,
  activityLevelOptions,
  equipmentAccessOptions,
} from '@/data/onboarding-options'
import styles from './PlanBuilderSummary.module.scss'

interface PlanBuilderSummaryProps {
  data: WebsiteOnboardingData
}

export const PlanBuilderSummary: React.FC<PlanBuilderSummaryProps> = ({ data }) => {
  const levelLabel = fitnessLevelOptions.find(o => o.value === data.fitness_level)?.label || data.fitness_level
  const activityLabel = activityLevelOptions.find(o => o.value === data.current_activity_level)?.label || data.current_activity_level
  const equipmentLabel = equipmentAccessOptions.find(o => o.value === data.equipment_access)?.label || data.equipment_access

  const goalsDisplay = data.fitness_goals.length === 1
    ? data.fitness_goals[0]
    : data.fitness_goals.slice(0, -1).join(', ') + ' & ' + data.fitness_goals[data.fitness_goals.length - 1]

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader}>
        <CheckCircle2 size={24} className={styles.checkIcon} />
        <h3 className={styles.summaryTitle}>You've already completed:</h3>
      </div>

      <div className={styles.summaryList}>
        <div className={styles.summaryItem}>
          <Target size={18} className={styles.itemIcon} />
          <span className={styles.itemLabel}>Fitness Goals:</span>
          <span className={styles.itemValue}>{goalsDisplay}</span>
        </div>

        <div className={styles.summaryItem}>
          <Dumbbell size={18} className={styles.itemIcon} />
          <span className={styles.itemLabel}>Fitness Level:</span>
          <span className={styles.itemValue}>{levelLabel}</span>
        </div>

        <div className={styles.summaryItem}>
          <Activity size={18} className={styles.itemIcon} />
          <span className={styles.itemLabel}>Activity Level:</span>
          <span className={styles.itemValue}>{activityLabel}</span>
        </div>

        <div className={styles.summaryItem}>
          <Wrench size={18} className={styles.itemIcon} />
          <span className={styles.itemLabel}>Equipment Access:</span>
          <span className={styles.itemValue}>{equipmentLabel}</span>
        </div>

        {data.gender && data.gender !== 'prefer_not_to_say' && (
          <div className={styles.summaryItem}>
            <span className={styles.itemLabel}>Gender:</span>
            <span className={styles.itemValue}>{data.gender}</span>
          </div>
        )}

        {data.age && (
          <div className={styles.summaryItem}>
            <span className={styles.itemLabel}>Age:</span>
            <span className={styles.itemValue}>{data.age}</span>
          </div>
        )}

        <div className={styles.summaryItem}>
          <span className={styles.itemLabel}>Units:</span>
          <span className={styles.itemValue}>
            {data.preferred_units.weight}/{data.preferred_units.height}
          </span>
        </div>
      </div>
    </div>
  )
}
```

### Step 3: Create Phase B Form Component (Remaining Fields)

**File:** `components/onboarding/PhaseBForm.tsx`

This form collects the sensitive/identity fields that were NOT collected on the website:

**Fields to Collect:**

- `first_name`: string (required)
- `last_name`: string (required)
- `weight`: number (required, in user's preferred units)
- `height`: number (required, in user's preferred units)
- `injuries`: string[] (optional, multi-select)
- `injury_details`: string (optional, textarea, shown if injuries selected)
- `medical_conditions`: string[] (optional, multi-select)
- `medical_notes`: string (optional, textarea, shown if medical_conditions selected)
- `available_equipment`: number[] (optional, equipment IDs from your database)

```typescript
'use client'

import React, { useState } from 'react'
import type { WebsiteOnboardingData } from '@/types/onboarding'

interface PhaseBFormData {
  first_name: string
  last_name: string
  weight: number | null
  height: number | null
  injuries: string[]
  injury_details: string
  medical_conditions: string[]
  medical_notes: string
  available_equipment: number[]
}

interface PhaseBFormProps {
  phaseAData: WebsiteOnboardingData
  onSubmit: (phaseBData: PhaseBFormData) => Promise<void>
  onBack?: () => void
}

export const PhaseBForm: React.FC<PhaseBFormProps> = ({ phaseAData, onSubmit, onBack }) => {
  const [formData, setFormData] = useState<PhaseBFormData>({
    first_name: '',
    last_name: '',
    weight: null,
    height: null,
    injuries: [],
    injury_details: '',
    medical_conditions: [],
    medical_notes: '',
    available_equipment: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get unit labels for display
  const weightUnit = phaseAData.preferred_units.weight === 'lb' ? 'lbs' : 'kg'
  const heightUnit = phaseAData.preferred_units.height === 'in' ? 'inches' : 'cm'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.weight || formData.weight <= 0) newErrors.weight = `Weight is required (in ${weightUnit})`
    if (!formData.height || formData.height <= 0) newErrors.height = `Height is required (in ${heightUnit})`

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting Phase B form:', error)
      // Handle error (show toast, etc.)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>Complete Your Profile</h3>
      <p className={styles.formSubtitle}>
        We need a few more details to generate your personalized workout plan.
      </p>

      {/* First Name */}
      <div className={styles.formGroup}>
        <label htmlFor="first_name" className={styles.label}>
          First Name <span className={styles.required}>*</span>
        </label>
        <input
          id="first_name"
          type="text"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          className={styles.input}
          required
        />
        {errors.first_name && <span className={styles.error}>{errors.first_name}</span>}
      </div>

      {/* Last Name */}
      <div className={styles.formGroup}>
        <label htmlFor="last_name" className={styles.label}>
          Last Name <span className={styles.required}>*</span>
        </label>
        <input
          id="last_name"
          type="text"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          className={styles.input}
          required
        />
        {errors.last_name && <span className={styles.error}>{errors.last_name}</span>}
      </div>

      {/* Weight */}
      <div className={styles.formGroup}>
        <label htmlFor="weight" className={styles.label}>
          Weight <span className={styles.required}>*</span> ({weightUnit})
        </label>
        <input
          id="weight"
          type="number"
          step="0.1"
          min="0"
          value={formData.weight || ''}
          onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || null })}
          className={styles.input}
          required
        />
        {errors.weight && <span className={styles.error}>{errors.weight}</span>}
      </div>

      {/* Height */}
      <div className={styles.formGroup}>
        <label htmlFor="height" className={styles.label}>
          Height <span className={styles.required}>*</span> ({heightUnit})
        </label>
        <input
          id="height"
          type="number"
          step="0.1"
          min="0"
          value={formData.height || ''}
          onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || null })}
          className={styles.input}
          required
        />
        {errors.height && <span className={styles.error}>{errors.height}</span>}
      </div>

      {/* Injuries (optional) */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Injuries (optional)</label>
        <div className={styles.checkboxGroup}>
          {/* Render injury checkboxes from your data */}
          {/* Example: ['Knee', 'Shoulder', 'Back', 'Ankle', 'Wrist'] */}
        </div>
        {formData.injuries.length > 0 && (
          <textarea
            placeholder="Please provide details about your injuries..."
            value={formData.injury_details}
            onChange={(e) => setFormData({ ...formData, injury_details: e.target.value })}
            className={styles.textarea}
            rows={3}
          />
        )}
      </div>

      {/* Medical Conditions (optional) */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Medical Conditions (optional)</label>
        <div className={styles.checkboxGroup}>
          {/* Render medical condition checkboxes from your data */}
        </div>
        {formData.medical_conditions.length > 0 && (
          <textarea
            placeholder="Please provide details about your medical conditions..."
            value={formData.medical_notes}
            onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
            className={styles.textarea}
            rows={3}
          />
        )}
      </div>

      {/* Available Equipment (optional) */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Available Equipment (optional)</label>
        <div className={styles.checkboxGroup}>
          {/* Render equipment checkboxes from your database */}
          {/* Map equipment items with IDs */}
        </div>
      </div>

      <div className={styles.formActions}>
        {onBack && (
          <button type="button" onClick={onBack} className={styles.backButton}>
            Back
          </button>
        )}
        <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
          {isSubmitting ? 'Generating...' : 'Generate My Workout'}
        </button>
      </div>
    </form>
  )
}
```

### Step 4: Update Signup Page to Handle URL Parameters

**File:** `app/signup/page.tsx` (or your existing signup route)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { parseSignupParams } from '@/lib/parseSignupParams'
import type { WebsiteOnboardingData } from '@/types/onboarding'
import { PlanBuilderSummary } from '@/components/onboarding/PlanBuilderSummary'
import { PhaseBForm } from '@/components/onboarding/PhaseBForm'
import { AuthForm } from '@/components/auth/AuthForm' // Your existing auth component

type WorkflowStep = 'auth' | 'summary' | 'phaseB' | 'generating'

export default function SignupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('auth')
  const [phaseAData, setPhaseAData] = useState<WebsiteOnboardingData | null>(null)
  const [user, setUser] = useState<any>(null) // Your user type

  useEffect(() => {
    // Parse URL parameters on mount
    const params = parseSignupParams(searchParams)
    if (params) {
      setPhaseAData(params)
      // If user is already authenticated, skip to summary
      // Otherwise, show auth first
      // setWorkflowStep('auth')
    }
  }, [searchParams])

  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser)
    if (phaseAData) {
      // Save Phase A data to user profile
      savePhaseADataToProfile(authenticatedUser.id, phaseAData)
      setWorkflowStep('summary')
    } else {
      // No URL params, use standard onboarding
      router.push('/onboarding')
    }
  }

  const handleSummaryContinue = () => {
    setWorkflowStep('phaseB')
  }

  const handlePhaseBSubmit = async (phaseBData: any) => {
    setWorkflowStep('generating')

    // Combine Phase A and Phase B data
    const completeOnboardingData = {
      ...phaseAData!,
      ...phaseBData,
    }

    // Save complete profile
    await saveCompleteProfile(user.id, completeOnboardingData)

    // Generate workout
    const workout = await generateWorkout(completeOnboardingData)

    // Redirect to workout/dashboard
    router.push(`/workouts/${workout.id}`)
  }

  // Render based on workflow step
  if (workflowStep === 'auth') {
    return (
      <div className={styles.container}>
        <AuthForm onSuccess={handleAuthSuccess} />
        {phaseAData && (
          <div className={styles.infoBanner}>
            <p>You&apos;ve already started building your workout plan. Sign up to continue.</p>
          </div>
        )}
      </div>
    )
  }

  if (workflowStep === 'summary' && phaseAData) {
    return (
      <div className={styles.container}>
        <PlanBuilderSummary data={phaseAData} />
        <button onClick={handleSummaryContinue} className={styles.continueButton}>
          Continue to Complete Profile
        </button>
      </div>
    )
  }

  if (workflowStep === 'phaseB' && phaseAData) {
    return (
      <div className={styles.container}>
        <PhaseBForm phaseAData={phaseAData} onSubmit={handlePhaseBSubmit} />
      </div>
    )
  }

  if (workflowStep === 'generating') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <h2>Generating Your Workout Plan...</h2>
          <p>This may take a few moments.</p>
          {/* Loading spinner */}
        </div>
      </div>
    )
  }

  // Fallback: standard signup (no URL params)
  return (
    <div className={styles.container}>
      <AuthForm onSuccess={() => router.push('/onboarding')} />
    </div>
  )
}

// Helper functions (implement based on your backend)
async function savePhaseADataToProfile(userId: string, data: WebsiteOnboardingData) {
  // API call to save Phase A data
  // POST /api/users/{userId}/onboarding/phase-a
}

async function saveCompleteProfile(userId: string, data: any) {
  // API call to save complete profile
  // POST /api/users/{userId}/onboarding/complete
}

async function generateWorkout(data: any) {
  // API call to generate workout
  // POST /api/workouts/generate
  // Returns workout object with ID
}
```

### Step 5: API Endpoints (Backend Implementation)

You'll need to create/update these API endpoints:

#### 5.1 Save Phase A Data

**Endpoint:** `POST /api/users/{userId}/onboarding/phase-a`

```typescript
// Save Phase A data to user profile
// This allows users to complete Phase B later if they navigate away
```

#### 5.2 Save Complete Profile

**Endpoint:** `POST /api/users/{userId}/onboarding/complete`

```typescript
// Save complete onboarding data (Phase A + Phase B)
// Mark user as onboarding_complete: true
```

#### 5.3 Generate Workout

**Endpoint:** `POST /api/workouts/generate`

```typescript
// Generate workout based on complete onboarding data
// Return workout object with ID
```

### Step 6: Database Schema Updates

Ensure your user/profile table supports:

```sql
-- Add columns if they don't exist
ALTER TABLE users ADD COLUMN onboarding_phase_a_data JSONB;
ALTER TABLE users ADD COLUMN onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP;
```

### Step 7: Handle Edge Cases

1. **User already authenticated**: Skip auth step, go directly to summary
2. **Invalid/missing URL params**: Fall back to standard onboarding wizard
3. **User navigates away**: Save Phase A data so they can resume
4. **User already completed onboarding**: Redirect to dashboard
5. **Workout generation fails**: Show error, allow retry

## Testing Checklist

- [ ] URL parameters are correctly parsed
- [ ] Phase A data is displayed in summary
- [ ] Auth flow works (signup and login)
- [ ] Phase A data is saved to profile after auth
- [ ] Phase B form validates correctly
- [ ] Complete profile is saved
- [ ] Workout is generated successfully
- [ ] User is redirected to workout/dashboard
- [ ] Edge cases are handled (invalid params, already authenticated, etc.)
- [ ] Mobile responsive design

## Key Differences from Standard OnboardingWizard

1. **No duplicate questions**: Phase A fields are pre-filled from URL params
2. **Summary step**: Shows what user already completed
3. **Auth-first**: User must authenticate before completing Phase B
4. **Streamlined flow**: Only collects remaining sensitive fields
5. **Direct to workout**: After completion, goes straight to generated workout

## Notes

- This workflow is **separate** from the standard OnboardingWizard
- Users coming from the website will use this workflow
- Users signing up directly in the app will use the standard OnboardingWizard
- Both workflows should save data to the same database schema
- Consider adding analytics to track conversion from website → app → workout generation
