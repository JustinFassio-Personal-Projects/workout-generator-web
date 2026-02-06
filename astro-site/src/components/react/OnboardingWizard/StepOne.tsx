import { useMemo, useEffect } from 'react'
import { GraduationCap, Dumbbell, Activity, ChevronDown } from 'lucide-react'
import type { FitnessGoal, FitnessLevel } from '@/types/onboarding'
import {
  fitnessGoalOptions,
  fitnessLevelOptions,
  getEquipmentCategoryOptions,
} from '@/data/onboarding-options'

interface StepOneProps {
  fitnessGoals: FitnessGoal[]
  fitnessLevel: FitnessLevel
  equipmentAccess: string[]
  errors: Record<string, string>
  onGoalsChange: (goals: FitnessGoal[]) => void
  onLevelChange: (level: FitnessLevel) => void
  onEquipmentChange: (equipment: string[]) => void
  onContinue: () => void
}

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
  const availableCategories = useMemo(
    () => getEquipmentCategoryOptions(fitnessLevel),
    [fitnessLevel]
  )

  useEffect(() => {
    const availableCategoryValues = availableCategories.map(cat => cat.value)
    const validSelectedCategories = equipmentAccess.filter(cat =>
      availableCategoryValues.includes(cat)
    )
    if (validSelectedCategories.length !== equipmentAccess.length) {
      onEquipmentChange(validSelectedCategories)
    }
  }, [fitnessLevel, availableCategories, equipmentAccess, onEquipmentChange])

  const toggleGoal = (goal: FitnessGoal) => {
    if (fitnessGoals.includes(goal)) {
      onGoalsChange(fitnessGoals.filter(g => g !== goal))
    } else {
      onGoalsChange([...fitnessGoals, goal])
    }
  }

  const toggleEquipmentCategory = (category: string) => {
    if (equipmentAccess.includes(category)) {
      onEquipmentChange(equipmentAccess.filter(c => c !== category))
    } else {
      onEquipmentChange([...equipmentAccess, category])
    }
  }

  const chipSelected = 'bg-emerald-500/20 border-emerald-500/50 text-lime-400'
  const chipDefault = 'bg-slate-800 border-white/5 text-slate-300 hover:border-emerald-500/50'

  return (
    <div className="relative flex flex-col">
      <div className="flex flex-col gap-2 px-4 md:px-12 pb-4 -mt-1 md:-mt-2 mb-4">
        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
          Fitness Goals:
        </span>
        <div className="flex flex-wrap items-center gap-2 w-full pb-2">
          {fitnessGoalOptions.map(option => {
            const isSelected = fitnessGoals.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleGoal(option.value)}
                aria-pressed={isSelected}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
                  isSelected ? chipSelected : chipDefault
                }`}
              >
                <Activity className="w-3 h-3 text-emerald-500" />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      {errors.fitness_goals && (
        <p className="text-xs text-red-400 mt-1 px-4 md:px-12 mb-2">{errors.fitness_goals}</p>
      )}

      <div className="flex flex-col gap-2 p-2 mt-2">
        <div className="flex-1 bg-slate-950/50 rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3 hover:border-emerald-500/30 transition-colors relative overflow-hidden group/item">
          <div className="p-2 bg-slate-800 rounded-lg text-emerald-500 shrink-0 shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex flex-col z-10 w-full overflow-hidden relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Fitness Level
            </label>
            <div className="relative">
              <select
                value={fitnessLevel}
                onChange={e => onLevelChange(e.target.value as FitnessLevel)}
                className="bg-transparent border-none text-base font-bold text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-emerald-500 transition-colors truncate pr-8 appearance-none"
              >
                {fitnessLevelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center pr-2 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
          {errors.fitness_level && (
            <p className="absolute -bottom-5 left-4 text-xs text-red-400">{errors.fitness_level}</p>
          )}
        </div>

        <div className="flex-1 bg-slate-950/50 rounded-2xl border border-white/5 p-4 flex flex-col gap-2 hover:border-emerald-500/30 transition-colors relative overflow-hidden group/item">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-500 shrink-0 shadow-sm">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="flex flex-col z-10 w-full overflow-hidden relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Equipment Categories
              </label>
              {equipmentAccess.length > 0 && (
                <span className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                  {equipmentAccess.length} selected
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 w-full pb-1">
              {availableCategories.map(option => {
                const isSelected = equipmentAccess.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleEquipmentCategory(option.value)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
                      isSelected ? chipSelected : chipDefault
                    }`}
                  >
                    <Dumbbell className="w-3 h-3 text-emerald-500" />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {errors.equipment_access && (
            <p className="absolute -bottom-5 left-4 text-xs text-red-400">
              {errors.equipment_access}
            </p>
          )}
        </div>

        <button
          type="submit"
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-emerald-500 to-lime-400 text-slate-900 px-8 py-4 rounded-2xl font-bold tracking-wide hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Activity className="w-5 h-5" />
          <span>CONTINUE</span>
        </button>
      </div>
    </div>
  )
}
