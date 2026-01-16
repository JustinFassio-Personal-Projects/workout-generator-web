'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import posthog from 'posthog-js'
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
import { Dumbbell } from 'lucide-react'
import { StepOne } from './StepOne'
import { StepTwo } from './StepTwo'
import { PlanPreview } from './PlanPreview'
import Loading from './Loading'

type FormErrors = Record<string, string>

export const OnboardingWizard: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<WebsiteOnboardingData>(DEFAULT_ONBOARDING_DATA)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(1)
  const [loadingMessage, setLoadingMessage] = useState('Preparing your profile...')
  const loadingFacts = [
    'Analyzing biomechanical research chain...',
    'Mapping kinetic chains and movement patterns...',
    'Establishing neural pathways for optimal form...',
    'Calculating load distribution and joint angles...',
    'Processing anatomical adaptation protocols...',
    'Synthesizing exercise selection algorithms...',
    'Optimizing technique parameters for safety and efficacy...',
    'Finalizing biomechanical logic stream...',
  ]

  // Store timeout IDs for cleanup
  const timeoutRefs = useRef<NodeJS.Timeout[]>([])

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

  // Cleanup timeouts on unmount or when loading stops
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current = []
    }
  }, [])

  // Clear timeouts when loading is cancelled
  useEffect(() => {
    if (!isLoading) {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current = []
    }
  }, [isLoading])

  const handleCreateAccount = useCallback(() => {
    // Clear any existing timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
    timeoutRefs.current = []

    // PostHog: Track create account click - key conversion event
    posthog.capture('onboarding_create_account_clicked', {
      fitness_goals: formData.fitness_goals,
      fitness_level: formData.fitness_level,
      equipment_access: formData.equipment_access,
      activity_level: formData.current_activity_level,
      location: 'onboarding_wizard',
    })

    const signupUrl = buildSignupUrl(formData)

    // Start loading sequence - slowed down animation
    setIsLoading(true)
    setLoadingStep(1)
    setLoadingMessage('Analyzing Biomechanics...')

    // Step 1: Analyzing biomechanics (0-2s)
    const timeout1 = setTimeout(() => {
      setLoadingStep(2)
      setLoadingMessage('Mapping Kinetic Chains...')
    }, 2000)
    timeoutRefs.current.push(timeout1)

    // Step 2: Mapping kinetic chains (2-4s)
    const timeout2 = setTimeout(() => {
      setLoadingStep(3)
      setLoadingMessage('Optimizing Technique...')
    }, 4000)
    timeoutRefs.current.push(timeout2)

    // Step 3: Optimizing technique (4-6s)
    const timeout3 = setTimeout(() => {
      setLoadingStep(4)
      setLoadingMessage('Establishing Connection...')
    }, 6000)
    timeoutRefs.current.push(timeout3)

    // Step 4: Establishing connection (6-8s)
    const timeout4 = setTimeout(() => {
      setLoadingStep(5)
      setLoadingMessage('Almost ready...')
    }, 8000)
    timeoutRefs.current.push(timeout4)

    // Step 5: Almost ready (8-10s), then redirect
    const timeout5 = setTimeout(() => {
      window.location.href = signupUrl
    }, 10000)
    timeoutRefs.current.push(timeout5)
  }, [formData])

  // Dark mode is always on - no light mode support
  return (
    <div className="min-h-screen bg-brand-dark text-slate-200 font-sans selection:bg-brand-green selection:text-white pb-20 relative overflow-x-hidden animate-in fade-in duration-1000">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-green/5 via-brand-dark to-black z-0"></div>

      <main className="px-3 sm:px-6 py-4 md:py-8 relative z-10">
        <div className="max-w-6xl mx-auto transition-all duration-500 min-h-[50vh] md:min-h-[70vh] flex flex-col justify-center">
          {/* Header Section - EXACT match to fitcopilot-vision App.tsx (lines 295-310) */}
          <div className="text-center mb-6 md:mb-16 space-y-3 md:space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-lime text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm backdrop-blur-sm">
              <Dumbbell className="w-3 h-3 md:w-4 md:h-4" /> Professional Kinetic Analysis Engine
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-8xl font-display font-bold text-white tracking-tight leading-[0.95] md:leading-[0.9]">
              Master the Science of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green via-brand-lime to-emerald-400">
                Human Motion.
              </span>
            </h1>
            <p className="text-sm md:text-2xl text-slate-400 max-w-3xl mx-auto font-light leading-relaxed px-4">
              Built to understand complex kinetic movements, biomechanics, and technical cues. From
              foundational lifts to elite-level performance.
            </p>
          </div>

          {/* Form Container - EXACT match to fitcopilot-vision App.tsx (lines 313-414) */}
          <form
            onSubmit={e => {
              e.preventDefault()
              if (currentStep === 1) {
                handleContinue()
              } else if (!showPreview) {
                handleSubmit()
              }
            }}
            className="relative z-20 transition-all duration-300 scale-100"
          >
            <div className="relative group">
              {/* Glow Effect - Dark mode only */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-green via-brand-lime to-emerald-500 rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur-xl"></div>
              {/* Main Container - Dark mode only */}
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl">
                <div className="relative flex flex-col min-h-[400px] md:min-h-[500px]">
                  {/* Progress Indicator */}
                  {!showPreview && (
                    <div className="mb-4 md:mb-6 px-4">
                      <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Step {currentStep} of 2
                      </span>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-brand-green via-brand-lime to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: currentStep === 1 ? '50%' : '100%' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Loading Overlay */}
                  {isLoading && (
                    <>
                      {/* Background overlay - fully opaque */}
                      <div className="absolute inset-0 bg-slate-900 rounded-3xl z-40 animate-in fade-in duration-300" />
                      {/* Loading component */}
                      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
                        <Loading status={loadingMessage} step={loadingStep} facts={loadingFacts} />
                      </div>
                    </>
                  )}

                  {/* Form Steps / Preview */}
                  {showPreview ? (
                    <div className={isLoading ? 'opacity-30 pointer-events-none' : ''}>
                      <PlanPreview
                        data={formData}
                        onEdit={handleEdit}
                        onCreateAccount={handleCreateAccount}
                      />
                    </div>
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
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
