import { Check } from 'lucide-react'
import type { FitnessGoal, FitnessLevel, EquipmentAccess } from '@/types/onboarding'
import {
  fitnessGoalOptions,
  fitnessLevelOptions,
  equipmentAccessOptions,
} from '@/data/onboarding-options'

interface StepOneProps {
  fitnessGoals: FitnessGoal[]
  fitnessLevel: FitnessLevel
  equipmentAccess: EquipmentAccess
  errors: Record<string, string>
  onGoalsChange: (goals: FitnessGoal[]) => void
  onLevelChange: (level: FitnessLevel) => void
  onEquipmentChange: (equipment: EquipmentAccess) => void
  onContinue: () => void
}

const inputBase =
  'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white min-h-[48px] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 appearance-none bg-no-repeat bg-[length:20px] bg-[right_1rem_center] pr-12'
const chipBase =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full border min-h-[44px] text-sm font-medium transition-all'
const chipDefault =
  'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
const chipSelected =
  'bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-[var(--color-accent-light)]'

export function StepOne({
  fitnessGoals,
  fitnessLevel,
  equipmentAccess,
  errors,
  onGoalsChange,
  onLevelChange,
  onEquipmentChange,
  onContinue,
}: StepOneProps) {
  const toggleGoal = (goal: FitnessGoal) => {
    if (fitnessGoals.includes(goal)) {
      onGoalsChange(fitnessGoals.filter(g => g !== goal))
    } else {
      onGoalsChange([...fitnessGoals, goal])
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="block text-base font-medium text-white mb-1">
          What are your fitness goals? <span className="text-[var(--color-accent)]">*</span>
        </label>
        <p className="text-sm text-white/60 mb-2">Select all that apply</p>
        <div className="flex flex-wrap gap-2">
          {fitnessGoalOptions.map(option => {
            const isSelected = fitnessGoals.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                className={`${chipBase} ${isSelected ? chipSelected : chipDefault}`}
                onClick={() => toggleGoal(option.value)}
                aria-pressed={isSelected}
              >
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
        {errors.fitness_goals && (
          <p className="mt-1 text-sm text-red-500">{errors.fitness_goals}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="builder-fitness-level"
          className="block text-base font-medium text-white mb-1"
        >
          What&apos;s your current fitness level?{' '}
          <span className="text-[var(--color-accent)]">*</span>
        </label>
        <select
          id="builder-fitness-level"
          className={inputBase}
          value={fitnessLevel}
          onChange={e => onLevelChange(e.target.value as FitnessLevel)}
        >
          {fitnessLevelOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.fitness_level && (
          <p className="mt-1 text-sm text-red-500">{errors.fitness_level}</p>
        )}
      </div>

      <div>
        <label htmlFor="builder-equipment" className="block text-base font-medium text-white mb-1">
          What equipment do you have access to?{' '}
          <span className="text-[var(--color-accent)]">*</span>
        </label>
        <select
          id="builder-equipment"
          className={inputBase}
          value={equipmentAccess}
          onChange={e => onEquipmentChange(e.target.value as EquipmentAccess)}
        >
          {equipmentAccessOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.equipment_access && (
          <p className="mt-1 text-sm text-red-500">{errors.equipment_access}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-[var(--bg-dark)] font-semibold hover:bg-[var(--color-accent-light)] transition-colors min-w-[140px]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
