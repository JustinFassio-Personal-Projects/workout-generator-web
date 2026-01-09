'use client'

import React, { useState, useCallback } from 'react'
import { CreditCard, Lock, RefreshCw } from 'lucide-react'
import type {
  WebsiteOnboardingData,
  FitnessGoal,
  FitnessLevel,
  ActivityLevel,
  EquipmentAccess,
  Gender,
  PreferredUnits,
} from '@/types/onboarding'
import { DEFAULT_ONBOARDING_DATA } from '@/types/onboarding'
import { buildSignupUrl } from '@/lib/buildSignupUrl'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import { Card } from '@/components/ui/Card/Card'
import { StepOne } from './StepOne'
import { StepTwo } from './StepTwo'
import { PlanPreview } from './PlanPreview'
import { IntroScreen } from './IntroScreen'
import styles from './WorkoutPlanBuilder.module.scss'

type FormErrors = Record<string, string>

export const WorkoutPlanBuilder: React.FC = () => {
  // Intro screen state
  const [showIntro, setShowIntro] = useState(true)

  // Form state
  const [formData, setFormData] = useState<WebsiteOnboardingData>(DEFAULT_ONBOARDING_DATA)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Validation functions
  const validateStepOne = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (formData.fitness_goals.length === 0) {
      newErrors.fitness_goals = 'Please select at least one fitness goal'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData.fitness_goals])

  const validateStepTwo = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (formData.age !== undefined) {
      if (!Number.isInteger(formData.age) || formData.age < 13 || formData.age > 120) {
        newErrors.age = 'Age must be between 13 and 120'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData.age])

  // Step 1 handlers
  const handleGoalsChange = useCallback((goals: FitnessGoal[]) => {
    setFormData(prev => ({ ...prev, fitness_goals: goals }))
    setErrors(prev => ({ ...prev, fitness_goals: '' }))
  }, [])

  const handleLevelChange = useCallback((level: FitnessLevel) => {
    setFormData(prev => ({ ...prev, fitness_level: level }))
  }, [])

  const handleEquipmentChange = useCallback((equipment: EquipmentAccess) => {
    setFormData(prev => ({ ...prev, equipment_access: equipment }))
  }, [])

  const handleContinue = useCallback(() => {
    if (validateStepOne()) {
      setCurrentStep(2)
    }
  }, [validateStepOne])

  // Step 2 handlers
  const handleActivityChange = useCallback((level: ActivityLevel) => {
    setFormData(prev => ({ ...prev, current_activity_level: level }))
  }, [])

  const handleGenderChange = useCallback((gender: Gender | undefined) => {
    setFormData(prev => ({ ...prev, gender }))
  }, [])

  const handleAgeChange = useCallback((age: number | undefined) => {
    setFormData(prev => ({ ...prev, age }))
    setErrors(prev => ({ ...prev, age: '' }))
  }, [])

  const handleUnitsChange = useCallback((units: Partial<PreferredUnits>) => {
    setFormData(prev => ({
      ...prev,
      preferred_units: { ...prev.preferred_units, ...units },
    }))
  }, [])

  const handleBack = useCallback(() => {
    setCurrentStep(1)
    setErrors({})
  }, [])

  const handleSubmit = useCallback(() => {
    if (validateStepTwo()) {
      setShowPreview(true)
    }
  }, [validateStepTwo])

  // Preview handlers
  const handleEdit = useCallback(() => {
    setShowPreview(false)
    setCurrentStep(1)
  }, [])

  const handleCreateAccount = useCallback(() => {
    const signupUrl = buildSignupUrl(formData)
    window.location.href = signupUrl
  }, [formData])

  return (
    <section id="workout-builder" className={styles.section}>
      {showIntro ? (
        <IntroScreen onComplete={() => setShowIntro(false)} />
      ) : (
        <>
          <LogoWatermark position="bottom-left" opacity={0.04} size={350} rotation={15} />
          <div className={styles.container}>
            {/* Section Header */}
            <div className={styles.header} data-aos="fade-up">
              <span className={styles.eyebrow}>Workout Plan Builder</span>
              <h2 className={styles.title}>
                Build your AI workout plan
                <span className={styles.gradientText}> in 2 minutes</span>
              </h2>
              <p className={styles.subtitle}>
                Choose your goal, fitness level, activity, and equipment. Then create your account
                to generate and save your personalized workout.
              </p>
            </div>

            {/* Form Card */}
            <div className={styles.formWrapper} data-aos="fade-up" data-aos-delay="100">
              <Card variant="strong" hover={false} className={styles.formCard}>
                {/* Progress Indicator */}
                {!showPreview && (
                  <div className={styles.progressBar}>
                    <span className={styles.progressText}>Step {currentStep} of 2</span>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ width: currentStep === 1 ? '50%' : '100%' }}
                      />
                    </div>
                  </div>
                )}

                {/* Form Steps / Preview */}
                {showPreview ? (
                  <PlanPreview
                    data={formData}
                    onEdit={handleEdit}
                    onCreateAccount={handleCreateAccount}
                  />
                ) : currentStep === 1 ? (
                  <StepOne
                    fitnessGoals={formData.fitness_goals}
                    fitnessLevel={formData.fitness_level}
                    equipmentAccess={formData.equipment_access}
                    errors={errors}
                    onGoalsChange={handleGoalsChange}
                    onLevelChange={handleLevelChange}
                    onEquipmentChange={handleEquipmentChange}
                    onContinue={handleContinue}
                  />
                ) : (
                  <StepTwo
                    activityLevel={formData.current_activity_level}
                    gender={formData.gender}
                    age={formData.age}
                    preferredUnits={formData.preferred_units}
                    errors={errors}
                    onActivityChange={handleActivityChange}
                    onGenderChange={handleGenderChange}
                    onAgeChange={handleAgeChange}
                    onUnitsChange={handleUnitsChange}
                    onBack={handleBack}
                    onSubmit={handleSubmit}
                  />
                )}
              </Card>
            </div>

            {/* Trust Microcopy */}
            <div className={styles.trustBadges} data-aos="fade-up" data-aos-delay="200">
              <div className={styles.trustItem}>
                <CreditCard size={18} className={styles.trustIcon} />
                <span>No credit card required</span>
              </div>
              <div className={styles.trustItem}>
                <Lock size={18} className={styles.trustIcon} />
                <span>We don&apos;t store answers until you create an account</span>
              </div>
              <div className={styles.trustItem}>
                <RefreshCw size={18} className={styles.trustIcon} />
                <span>Edit anytime</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
