import { ArrowRight, Edit3, Target, Dumbbell, Activity, Wrench } from 'lucide-react'
import type { WebsiteOnboardingData } from '@/types/onboarding'
import {
  fitnessLevelOptions,
  activityLevelOptions,
  equipmentAccessOptions,
} from '@/data/onboarding-options'
import { equipmentArrayToAccess } from '@/lib/urlOnboarding'

interface PlanPreviewProps {
  data: WebsiteOnboardingData
  onEdit: () => void
  onCreateAccount: () => void
}

export function PlanPreview({ data, onEdit, onCreateAccount }: PlanPreviewProps) {
  const levelLabel =
    fitnessLevelOptions.find(o => o.value === data.fitness_level)?.label ?? data.fitness_level
  const activityLabel =
    activityLevelOptions.find(o => o.value === data.current_activity_level)?.label ??
    data.current_activity_level
  const equipmentAccess = equipmentArrayToAccess(data.equipment_access)
  const equipmentLabel =
    equipmentAccessOptions.find(o => o.value === equipmentAccess)?.label ??
    data.equipment_access.join(', ')
  const goalsDisplay =
    data.fitness_goals.length === 1
      ? data.fitness_goals[0]
      : data.fitness_goals.slice(0, -1).join(', ') +
        ' & ' +
        data.fitness_goals[data.fitness_goals.length - 1]

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white m-0 mb-1">Your Profile Is Ready</h3>
        <p className="text-white/80 m-0 text-base">
          Create your account to complete your profile and generate your personalized workout plan.
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="block text-sm text-white/60 font-medium">Goals</span>
            <span className="text-white">{goalsDisplay}</span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Dumbbell className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="block text-sm text-white/60 font-medium">Level</span>
            <span className="text-white">{levelLabel}</span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="block text-sm text-white/60 font-medium">Activity</span>
            <span className="text-white">{activityLabel}</span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Wrench className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="block text-sm text-white/60 font-medium">Equipment</span>
            <span className="text-white">{equipmentLabel}</span>
            <p className="text-sm text-white/60 mt-1 m-0">
              You can change or add specific equipment when you generate your plan.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onCreateAccount}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[var(--color-accent)] text-[var(--bg-dark)] font-semibold hover:bg-[var(--color-accent-light)] transition-colors"
        >
          Create account to continue
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit answers
        </button>
      </div>
    </div>
  )
}
