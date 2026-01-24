'use client'

import React, { useState, useCallback } from 'react'
import { LucideIcon, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import { trackVercelEvent } from '@/lib/analytics'
import { StepOne } from '@/components/landing/WorkoutPlanBuilder/StepOne'
import { StepTwo } from '@/components/landing/WorkoutPlanBuilder/StepTwo'
import type {
  FitnessGoal,
  FitnessLevel,
  EquipmentAccess,
  ActivityLevel,
  Gender,
  PreferredUnits,
} from '@/types/onboarding'
import { DEFAULT_ONBOARDING_DATA } from '@/types/onboarding'
import styles from './Journey.module.scss'
import builderStyles from '@/components/landing/WorkoutPlanBuilder/WorkoutPlanBuilder.module.scss'

export interface JourneyStepCardProps {
  number: number
  title: string
  description: string
  icon: LucideIcon
  features: string[]
  accentColor: string
  index: number
  isLast: boolean
}

export const JourneyStepCard: React.FC<JourneyStepCardProps> = ({
  number,
  title,
  description,
  icon: Icon,
  features,
  accentColor,
  index,
  isLast,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Form state for step 1 only
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoal[]>(
    number === 1 ? DEFAULT_ONBOARDING_DATA.fitness_goals : []
  )
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(
    number === 1 ? DEFAULT_ONBOARDING_DATA.fitness_level : 'beginner'
  )
  const [equipmentAccess, setEquipmentAccess] = useState<EquipmentAccess>(
    number === 1
      ? DEFAULT_ONBOARDING_DATA.equipment_access.includes('cardio') &&
        DEFAULT_ONBOARDING_DATA.equipment_access.length >= 4
        ? 'full_gym'
        : DEFAULT_ONBOARDING_DATA.equipment_access.includes('functional') &&
            DEFAULT_ONBOARDING_DATA.equipment_access.length >= 3
          ? 'home'
          : DEFAULT_ONBOARDING_DATA.equipment_access.length >= 2
            ? 'minimal'
            : 'none'
      : 'none'
  )
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Form state for step 2 only
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    number === 2 ? DEFAULT_ONBOARDING_DATA.current_activity_level : 'moderately_active'
  )
  const [gender, setGender] = useState<Gender | undefined>(
    number === 2 ? DEFAULT_ONBOARDING_DATA.gender : undefined
  )
  const [age, setAge] = useState<number | undefined>(
    number === 2 ? DEFAULT_ONBOARDING_DATA.age : undefined
  )
  const [preferredUnits, setPreferredUnits] = useState<PreferredUnits>(
    number === 2 ? DEFAULT_ONBOARDING_DATA.preferred_units : DEFAULT_ONBOARDING_DATA.preferred_units
  )
  const [stepTwoErrors, setStepTwoErrors] = useState<Record<string, string>>({})

  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    trackVercelEvent('Journey Step Expand', {
      step_number: number,
      step_title: title.substring(0, 255), // Ensure within limit
      action: newState ? 'expand' : 'collapse',
    })
  }

  // Prevent card toggle when clicking inside the form
  const handleFormClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Step 1 form handlers
  const handleGoalsChange = useCallback((goals: FitnessGoal[]) => {
    setFitnessGoals(goals)
    setFormErrors(prev => ({ ...prev, fitness_goals: '' }))
  }, [])

  const handleLevelChange = useCallback((level: FitnessLevel) => {
    setFitnessLevel(level)
  }, [])

  const handleEquipmentChange = useCallback((equipment: EquipmentAccess) => {
    setEquipmentAccess(equipment)
  }, [])

  const handleContinue = useCallback(() => {
    // Validate and handle continue - could scroll to workout builder or show next step
    if (fitnessGoals.length === 0) {
      setFormErrors({ fitness_goals: 'Please select at least one fitness goal' })
      return
    }
    setFormErrors({})
    // Scroll to workout builder section
    const workoutBuilderSection = document.getElementById('workout-builder')
    if (workoutBuilderSection) {
      workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [fitnessGoals])

  // Step 2 form handlers
  const handleActivityChange = useCallback((level: ActivityLevel) => {
    setActivityLevel(level)
  }, [])

  const handleGenderChange = useCallback((genderValue: Gender | undefined) => {
    setGender(genderValue)
  }, [])

  const handleAgeChange = useCallback((ageValue: number | undefined) => {
    setAge(ageValue)
    setStepTwoErrors(prev => ({ ...prev, age: '' }))
  }, [])

  const handleUnitsChange = useCallback((units: Partial<PreferredUnits>) => {
    setPreferredUnits(prev => ({ ...prev, ...units }))
  }, [])

  const handleBack = useCallback(() => {
    // Scroll back to step 1 or just clear errors
    setStepTwoErrors({})
  }, [])

  const handleSubmit = useCallback(() => {
    // Validate step 2
    if (age !== undefined) {
      if (!Number.isInteger(age) || age < 13 || age > 120) {
        setStepTwoErrors({ age: 'Age must be between 13 and 120' })
        return
      }
    }
    setStepTwoErrors({})
    // Scroll to workout builder section to see preview
    const workoutBuilderSection = document.getElementById('workout-builder')
    if (workoutBuilderSection) {
      workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [age])

  return (
    <div className={styles.stepWrapper} data-aos="fade-up" data-aos-delay={index * 100}>
      <div className={styles.stepNumber}>{number}</div>
      {!isLast && <div className={styles.connector} />}
      <Card
        variant="default"
        hover={true}
        className={`${styles.stepCard} ${isExpanded ? styles['stepCard--expanded'] : ''} ${number === 1 || number === 2 || number === 3 ? styles['stepCard--withForm'] : ''}`}
        onClick={handleToggle}
      >
        <div className={styles.stepHeader}>
          <div
            className={styles.iconWrapper}
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
            }}
          >
            <Icon size={24} />
          </div>
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>{title}</h3>
            <p className={styles.stepDescription}>{description}</p>
          </div>
          <button
            className={`${styles.expandButton} ${isExpanded ? styles['expandButton--expanded'] : ''}`}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown size={20} />
          </button>
        </div>
        <div
          className={`${styles.stepFeatures} ${isExpanded ? styles['stepFeatures--expanded'] : ''}`}
        >
          <ul className={styles.featuresList}>
            {features.map((feature, idx) => {
              return (
                <li key={idx} className={styles.featureItem}>
                  <span className={styles.checkmark}>✓</span>
                  <span>{feature}</span>
                </li>
              )
            })}
          </ul>
          {/* Step 1 Form - Only show for step 1 when expanded */}
          {number === 1 && isExpanded && (
            <>
              <div className={styles.formSeparator} />
              <div onClick={handleFormClick} className={builderStyles.stepContent}>
                <StepOne
                  fitnessGoals={fitnessGoals}
                  fitnessLevel={fitnessLevel}
                  equipmentAccess={equipmentAccess}
                  errors={formErrors}
                  onGoalsChange={handleGoalsChange}
                  onLevelChange={handleLevelChange}
                  onEquipmentChange={handleEquipmentChange}
                  onContinue={handleContinue}
                />
              </div>
            </>
          )}
          {/* Step 2 Form - Only show for step 2 when expanded */}
          {number === 2 && isExpanded && (
            <>
              <div className={styles.formSeparator} />
              <div onClick={handleFormClick} className={builderStyles.stepContent}>
                <StepTwo
                  activityLevel={activityLevel}
                  gender={gender}
                  age={age}
                  preferredUnits={preferredUnits}
                  errors={stepTwoErrors}
                  onActivityChange={handleActivityChange}
                  onGenderChange={handleGenderChange}
                  onAgeChange={handleAgeChange}
                  onUnitsChange={handleUnitsChange}
                  onBack={handleBack}
                  onSubmit={handleSubmit}
                />
              </div>
            </>
          )}
          {/* Step 3 Workout Preview - Only show for step 3 when expanded */}
          {number === 3 && isExpanded && (
            <>
              <div className={styles.formSeparator} />
              <div onClick={handleFormClick} className={styles.workoutPreview}>
                <h4 className={styles.workoutPreviewTitle}>See Your Workout in Action</h4>
                <p className={styles.workoutPreviewDescription}>
                  Here's an example of what your personalized workout plan will look like:
                </p>
                <div className={styles.workoutIframeWrapper}>
                  <iframe
                    src="https://aiworkoutgen.app/workouts?id=ItBV7oyoqVHmjLRN4USV"
                    className={styles.workoutIframe}
                    title="Sample Workout Plan"
                    allow="fullscreen"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
                <a
                  href="https://aiworkoutgen.app/workouts?id=ItBV7oyoqVHmjLRN4USV"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.workoutLink}
                  onClick={e => e.stopPropagation()}
                >
                  Open in New Tab →
                </a>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
