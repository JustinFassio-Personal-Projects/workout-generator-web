import { useState, useCallback, useRef, useEffect } from 'react'
import { Dumbbell } from 'lucide-react'
import type {
  WebsiteOnboardingData,
  FitnessGoal,
  FitnessLevel,
  ActivityLevel,
  Gender,
  PreferredUnits,
} from '@/types/onboarding'
import { DEFAULT_ONBOARDING_DATA } from '@/types/onboarding'
import { buildSignupUrl } from '@/lib/buildSignupUrl'
import { getPreselectData } from '@/lib/equipmentPreselect'
import { trackGA4Event, capturePostHog } from '@/lib/analytics'
import { StepOne } from './StepOne'
import { StepTwo } from './StepTwo'
import { PlanPreview } from './PlanPreview'
import Loading from './Loading'
import styles from './OnboardingWizard.module.scss'

type FormErrors = Record<string, string>

interface OnboardingWizardProps {
  /** Optional tenant ID for multi-tenant signup URLs */
  tenantId?: string
  /** Preselect value from URL ?preselect= (e.g. dumbbells, kettlebells) */
  preselect?: string | null
}

export function OnboardingWizard({ tenantId, preselect }: OnboardingWizardProps) {
  const [formData, setFormData] = useState<WebsiteOnboardingData>(DEFAULT_ONBOARDING_DATA)

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

  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

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

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])
  const hasTrackedFirstInteraction = useRef(false)

  const handleFirstInteraction = useCallback(() => {
    if (!hasTrackedFirstInteraction.current) {
      trackGA4Event('onboarding_start', {
        event_category: 'Onboarding',
        event_label: 'First Interaction',
      })
      hasTrackedFirstInteraction.current = true
    }
  }, [])

  const validateStepOne = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    if (formData.fitness_goals.length === 0) {
      newErrors.fitness_goals = 'Please select at least one fitness goal'
    }
    if (formData.equipment_access.length === 0) {
      newErrors.equipment_access = 'Please select at least one equipment category'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData.fitness_goals, formData.equipment_access])

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
      handleFirstInteraction()
      setFormData(prev => ({ ...prev, fitness_goals: goals }))
      setErrors(prev => ({ ...prev, fitness_goals: '' }))
    },
    [handleFirstInteraction]
  )

  const handleLevelChange = useCallback(
    (level: FitnessLevel) => {
      handleFirstInteraction()
      setFormData(prev => ({ ...prev, fitness_level: level }))
    },
    [handleFirstInteraction]
  )

  const handleEquipmentChange = useCallback(
    (equipment: string[]) => {
      handleFirstInteraction()
      setFormData(prev => ({ ...prev, equipment_access: equipment }))
      setErrors(prev => ({ ...prev, equipment_access: '' }))
    },
    [handleFirstInteraction]
  )

  const handleContinue = useCallback(() => {
    if (validateStepOne()) {
      trackGA4Event('onboarding_step_completed', {
        step: 1,
        step_name: 'Fitness Goals & Equipment',
      })
      setCurrentStep(2)
    }
  }, [validateStepOne])

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
      trackGA4Event('onboarding_preview_viewed', {
        fitness_goals: formData.fitness_goals,
        equipment_count: formData.equipment_access.length,
        equipment_access: formData.equipment_access,
        fitness_level: formData.fitness_level,
      })
      setShowPreview(true)
    }
  }, [validateStepTwo, formData.fitness_goals, formData.equipment_access, formData.fitness_level])

  const handleEdit = useCallback(() => {
    setShowPreview(false)
    setCurrentStep(1)
  }, [])

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(id => clearTimeout(id))
      timeoutRefs.current = []
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      timeoutRefs.current.forEach(id => clearTimeout(id))
      timeoutRefs.current = []
    }
  }, [isLoading])

  const handleCreateAccount = useCallback(() => {
    timeoutRefs.current.forEach(id => clearTimeout(id))
    timeoutRefs.current = []

    capturePostHog('onboarding_create_account_clicked', {
      fitness_goals: formData.fitness_goals,
      fitness_level: formData.fitness_level,
      equipment_access: formData.equipment_access,
      activity_level: formData.current_activity_level,
      location: 'onboarding_wizard',
    })

    trackGA4Event('onboarding_create_account_clicked', {
      fitness_goals: formData.fitness_goals,
      fitness_level: formData.fitness_level,
      equipment_access: formData.equipment_access,
      activity_level: formData.current_activity_level,
      location: 'onboarding_wizard',
    })

    const signupUrl = buildSignupUrl(formData, tenantId)

    setIsLoading(true)
    setLoadingStep(1)
    setLoadingMessage('Analyzing Biomechanics...')

    const t1 = setTimeout(() => {
      setLoadingStep(2)
      setLoadingMessage('Mapping Kinetic Chains...')
    }, 2000)
    timeoutRefs.current.push(t1)

    const t2 = setTimeout(() => {
      setLoadingStep(3)
      setLoadingMessage('Optimizing Technique...')
    }, 4000)
    timeoutRefs.current.push(t2)

    const t3 = setTimeout(() => {
      setLoadingStep(4)
      setLoadingMessage('Establishing Connection...')
    }, 6000)
    timeoutRefs.current.push(t3)

    const t4 = setTimeout(() => {
      setLoadingStep(5)
      setLoadingMessage('Almost ready...')
    }, 8000)
    timeoutRefs.current.push(t4)

    const t5 = setTimeout(() => {
      window.location.href = signupUrl
    }, 10000)
    timeoutRefs.current.push(t5)
  }, [formData, tenantId])

  return (
    <div
      className={`${styles.onboardingWizard} text-slate-200 pb-20 relative overflow-x-hidden transition-opacity duration-1000`}
    >
      <main className="px-3 sm:px-6 py-4 md:py-8 relative z-10">
        <div className="max-w-6xl mx-auto transition-all duration-500 min-h-[50vh] md:min-h-[70vh] flex flex-col justify-center">
          <div className="text-center mb-6 md:mb-16 space-y-3 md:space-y-8">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-[var(--color-orange-light)] text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm backdrop-blur-sm">
              <Dumbbell className="w-3 h-3 md:w-4 md:h-4" /> Professional Kinetic Analysis Engine
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-8xl font-bold text-white tracking-tight leading-[0.95] md:leading-[0.9]">
              Master the Science of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-orange-light)] via-[var(--color-orange)] to-[var(--color-orange-medium)]">
                Human Motion.
              </span>
            </h1>
            <div className="inline-flex items-center justify-center max-w-3xl mx-auto px-4 py-2 md:py-3 rounded-lg bg-white/15 border border-white/20 text-slate-200 text-sm md:text-xl font-light leading-relaxed shadow-sm backdrop-blur-sm">
              <p className="text-slate-300">
                Built to understand complex kinetic movements, biomechanics, and technical cues.
                From foundational lifts to elite-level performance.
              </p>
            </div>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault()
              if (currentStep === 1) handleContinue()
              else if (!showPreview) handleSubmit()
            }}
            className="relative z-20 transition-all duration-300 scale-100"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-orange-light)] via-[var(--color-orange)] to-[var(--color-orange-medium)] rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur-xl" />
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl">
                <div className="relative flex flex-col min-h-[400px] md:min-h-[500px]">
                  {!showPreview && (
                    <div className="mb-4 md:mb-6 px-4">
                      <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Step {currentStep} of 2
                      </span>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--color-orange-light)] via-[var(--color-orange)] to-[var(--color-orange-medium)] rounded-full transition-all duration-300"
                          style={{ width: currentStep === 1 ? '50%' : '100%' }}
                        />
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <>
                      <div className="absolute inset-0 bg-slate-900 rounded-3xl z-40 opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-6 opacity-100 transition-opacity duration-300">
                        <Loading status={loadingMessage} step={loadingStep} facts={loadingFacts} />
                      </div>
                    </>
                  )}

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
