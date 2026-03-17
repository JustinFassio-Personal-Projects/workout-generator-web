import { useState, useCallback, useEffect, useRef } from 'react'
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
import { getPreselectData } from '@/lib/equipmentPreselect'
import {
  parseOnboardingFromSearchParams,
  onboardingToSearchParams,
  equipmentAccessToArray,
  equipmentArrayToAccess,
} from '@/lib/urlOnboarding'
import { IntroScreen } from './IntroScreen'
import { StepOne } from './StepOne'
import { StepTwo } from './StepTwo'
import { PlanPreview } from './PlanPreview'
import { trackFunnelEvent } from '@/lib/analytics-funnel'

type FormErrors = Record<string, string>

export interface WorkoutPlanBuilderProps {
  skipIntro?: boolean
  /** Preselect value from URL ?preselect= (e.g. dumbbells, kettlebells); pre-fills fitness level and equipment. */
  preselect?: string | null
}

function mergeWithDefaults(partial: Partial<WebsiteOnboardingData>): WebsiteOnboardingData {
  const base = { ...DEFAULT_ONBOARDING_DATA }
  if (partial.fitness_level) base.fitness_level = partial.fitness_level
  if (partial.current_activity_level) base.current_activity_level = partial.current_activity_level
  if (partial.fitness_goals?.length) base.fitness_goals = partial.fitness_goals
  if (partial.equipment_access?.length) base.equipment_access = partial.equipment_access
  if (partial.preferred_units)
    base.preferred_units = { ...base.preferred_units, ...partial.preferred_units }
  if (partial.gender !== undefined) base.gender = partial.gender
  if (partial.age !== undefined && partial.age !== null) base.age = partial.age
  return base
}

export function WorkoutPlanBuilder({ skipIntro = false, preselect }: WorkoutPlanBuilderProps = {}) {
  const [showIntro, setShowIntro] = useState(() => !skipIntro)
  const [formData, setFormData] = useState<WebsiteOnboardingData>(() => {
    if (typeof window === 'undefined') return DEFAULT_ONBOARDING_DATA
    const params = new URLSearchParams(window.location.search)
    const partial = parseOnboardingFromSearchParams(params)
    return mergeWithDefaults(partial)
  })
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const hasSentStarted = useRef(false)

  // Apply ?preselect= from URL (e.g. /onboard?preselect=dumbbells)
  useEffect(() => {
    if (preselect) {
      const { fitnessLevel, categories } = getPreselectData(preselect)
      setFormData(prev => ({
        ...prev,
        fitness_level: fitnessLevel,
        equipment_access: categories,
      }))
    }
  }, [preselect])

  // Sync form state to URL (replaceState so we don't flood history)
  const pushStateFromForm = useCallback((data: WebsiteOnboardingData) => {
    if (typeof window === 'undefined') return
    const params = onboardingToSearchParams(data)
    const url = new URL(window.location.href)
    url.search = params.toString()
    window.history.replaceState({}, '', url.toString())
  }, [])

  // On popstate, restore form from URL (e.g. user clicked browser back)
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const partial = parseOnboardingFromSearchParams(params)
      if (Object.keys(partial).length > 0) {
        setFormData(mergeWithDefaults(partial))
      }
    }
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  const updateFormAndUrl = useCallback(
    (updater: (prev: WebsiteOnboardingData) => WebsiteOnboardingData) => {
      setFormData(prev => {
        const next = updater(prev)
        pushStateFromForm(next)
        return next
      })
    },
    [pushStateFromForm]
  )

  const validateStepOne = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    if (formData.fitness_goals.length === 0)
      newErrors.fitness_goals = 'Please select at least one fitness goal'
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

  const handleGoalsChange = useCallback(
    (goals: FitnessGoal[]) => {
      if (!hasSentStarted.current) {
        hasSentStarted.current = true
        trackFunnelEvent('onboarding_builder_started', {
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          source: 'workout_plan_builder',
          preselect: preselect ?? undefined,
        })
      }
      updateFormAndUrl(prev => ({ ...prev, fitness_goals: goals }))
    },
    [updateFormAndUrl, preselect]
  )
  const handleLevelChange = useCallback(
    (level: FitnessLevel) => {
      if (!hasSentStarted.current) {
        hasSentStarted.current = true
        trackFunnelEvent('onboarding_builder_started', {
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          source: 'workout_plan_builder',
          preselect: preselect ?? undefined,
        })
      }
      updateFormAndUrl(prev => ({ ...prev, fitness_level: level }))
    },
    [updateFormAndUrl, preselect]
  )
  const handleEquipmentChange = useCallback(
    (equipment: EquipmentAccess) => {
      if (!hasSentStarted.current) {
        hasSentStarted.current = true
        trackFunnelEvent('onboarding_builder_started', {
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          source: 'workout_plan_builder',
          preselect: preselect ?? undefined,
        })
      }
      updateFormAndUrl(prev => ({ ...prev, equipment_access: equipmentAccessToArray(equipment) }))
    },
    [updateFormAndUrl, preselect]
  )
  const handleContinue = useCallback(() => {
    if (validateStepOne()) {
      trackFunnelEvent('onboarding_builder_step_1_completed', {
        fitness_goals: formData.fitness_goals,
        fitness_level: formData.fitness_level,
        equipment_count: formData.equipment_access.length,
      })
      setCurrentStep(2)
    }
  }, [validateStepOne, formData.fitness_goals, formData.fitness_level, formData.equipment_access.length])

  const handleActivityChange = useCallback(
    (level: ActivityLevel) =>
      updateFormAndUrl(prev => ({ ...prev, current_activity_level: level })),
    [updateFormAndUrl]
  )
  const handleGenderChange = useCallback(
    (gender: Gender | undefined) => updateFormAndUrl(prev => ({ ...prev, gender })),
    [updateFormAndUrl]
  )
  const handleAgeChange = useCallback(
    (age: number | undefined) => updateFormAndUrl(prev => ({ ...prev, age })),
    [updateFormAndUrl]
  )
  const handleUnitsChange = useCallback(
    (units: Partial<PreferredUnits>) =>
      updateFormAndUrl(prev => ({
        ...prev,
        preferred_units: { ...prev.preferred_units, ...units },
      })),
    [updateFormAndUrl]
  )
  const handleBack = useCallback(() => {
    setCurrentStep(1)
    setErrors({})
  }, [])
  const handleSubmit = useCallback(() => {
    if (validateStepTwo()) {
      trackFunnelEvent('onboarding_builder_step_2_completed', {
        activity_level: formData.current_activity_level,
        has_age: formData.age !== undefined && formData.age !== null,
        has_gender: formData.gender !== undefined,
      })
      setShowPreview(true)
      trackFunnelEvent('onboarding_builder_preview_shown', {
        fitness_goals: formData.fitness_goals,
        fitness_level: formData.fitness_level,
        equipment_count: formData.equipment_access.length,
        activity_level: formData.current_activity_level,
      })
    }
  }, [validateStepTwo, formData.current_activity_level, formData.age, formData.gender, formData.fitness_goals, formData.fitness_level, formData.equipment_access.length])
  const handleEdit = useCallback(() => {
    setShowPreview(false)
    setCurrentStep(1)
  }, [])
  const handleCreateAccount = useCallback(() => {
    trackFunnelEvent('onboarding_create_account_clicked', {
      fitness_goals: formData.fitness_goals,
      fitness_level: formData.fitness_level,
      equipment_access: formData.equipment_access,
      activity_level: formData.current_activity_level,
      location: 'workout_plan_builder',
    })
    const signupUrl = buildSignupUrl(formData)
    window.location.href = signupUrl
  }, [formData])

  const equipmentAccess: EquipmentAccess =
    formData.equipment_access.includes('cardio') && formData.equipment_access.length >= 4
      ? 'full_gym'
      : formData.equipment_access.includes('functional') && formData.equipment_access.length >= 3
        ? 'home'
        : formData.equipment_access.length >= 2
          ? 'minimal'
          : 'none'

  return (
    <section id="workout-builder" className="py-16 md:py-24 relative">
      <div className="relative z-10 max-w-[720px] mx-auto px-4 md:px-6">
        {showIntro ? (
          <IntroScreen onComplete={() => setShowIntro(false)} />
        ) : (
          <>
            <div className="text-center mb-12">
              <span className="text-[var(--color-accent)] font-bold tracking-wider uppercase text-sm">
                Workout Plan Builder
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-white">
                Build your AI workout plan{' '}
                <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary-400)] bg-clip-text text-transparent">
                  in 2 minutes
                </span>
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-[560px] mx-auto">
                Choose your goal, fitness level, activity, and equipment. Then create your account
                to generate and save your personalized workout.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[var(--glass-bg-base)] p-6 md:p-8 shadow-xl">
              {!showPreview && (
                <div className="mb-6">
                  <span className="block text-sm text-white/60 mb-1">Step {currentStep} of 2</span>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary-400)] rounded-full transition-all duration-300"
                      style={{ width: currentStep === 1 ? '50%' : '100%' }}
                    />
                  </div>
                </div>
              )}

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
                  equipmentAccess={equipmentAccess}
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

            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-8 text-sm text-white/60">
              <span className="inline-flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--color-accent)]" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--color-accent)]" />
                We don&apos;t store answers until you create an account
              </span>
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[var(--color-accent)]" />
                Edit anytime
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
