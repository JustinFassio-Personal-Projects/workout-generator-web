'use client'

import React from 'react'
import { GraduationCap, Dumbbell, Activity, ChevronDown } from 'lucide-react'
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

export const StepOne: React.FC<StepOneProps> = ({
  fitnessGoals,
  fitnessLevel,
  equipmentAccess,
  errors,
  onGoalsChange,
  onLevelChange,
  onEquipmentChange,
  onContinue,
}) => {
  const toggleGoal = (goal: FitnessGoal) => {
    if (fitnessGoals.includes(goal)) {
      onGoalsChange(fitnessGoals.filter(g => g !== goal))
    } else {
      onGoalsChange([...fitnessGoals, goal])
    }
  }

  return (
    <div className="relative flex flex-col">
      {/* Fitness Goals - Horizontal scrolling */}
      <div className="flex flex-col gap-2 px-4 md:px-12 pb-4 -mt-1 md:-mt-2 mb-4">
        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
          Fitness Goals:
        </span>
        {/* Horizontal scrolling container */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 -mx-4 md:-mx-12 px-4 md:px-12 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {fitnessGoalOptions.map(option => {
            const isSelected = fitnessGoals.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleGoal(option.value)}
                data-analytics={`onboard_goal_${option.value}`}
                aria-pressed={isSelected}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-all shrink-0 whitespace-nowrap ${
                  isSelected
                    ? 'bg-brand-green/20 border-brand-green/50 text-brand-lime'
                    : 'bg-slate-800 border-white/5 text-slate-300 hover:border-brand-green/50'
                }`}
              >
                <Activity className="w-3 h-3 text-brand-green" />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      {/* Note: Prettier formats this as single-line (86 chars) while equipment_access stays multi-line (91 chars, closer to printWidth: 100).
          PR review suggested multi-line for consistency and readability. Both formats are valid, deferring to Prettier's heuristic for maintainability. */}
      {errors.fitness_goals && (
        <p className="text-xs text-red-400 mt-1 px-4 md:px-12 mb-2">{errors.fitness_goals}</p>
      )}

      {/* Dropdown Row Container - EXACT match (line 359) */}
      <div className="flex flex-col md:flex-row gap-2 p-2 mt-2">
        {/* Fitness Level - Dark mode only */}
        <div className="flex-1 bg-slate-950/50 rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3 hover:border-brand-green/30 transition-colors relative overflow-hidden group/item">
          <div className="p-2 bg-slate-800 rounded-lg text-brand-green shrink-0 shadow-sm">
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
                data-analytics="onboard_select_fitness_level"
                className="bg-transparent border-none text-base font-bold text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-brand-green transition-colors truncate pr-8 appearance-none"
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

        {/* Equipment Access - Dark mode only */}
        <div className="flex-1 bg-slate-950/50 rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3 hover:border-brand-green/30 transition-colors relative overflow-hidden group/item">
          <div className="p-2 bg-slate-800 rounded-lg text-brand-green shrink-0 shadow-sm">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="flex flex-col z-10 w-full overflow-hidden relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Equipment Access
            </label>
            <div className="relative">
              <select
                value={equipmentAccess}
                onChange={e => onEquipmentChange(e.target.value as EquipmentAccess)}
                data-analytics="onboard_select_equipment_access"
                className="bg-transparent border-none text-base font-bold text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-brand-green transition-colors truncate pr-8 appearance-none"
              >
                {equipmentAccessOptions.map(option => (
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
          {errors.equipment_access && (
            <p className="absolute -bottom-5 left-4 text-xs text-red-400">
              {errors.equipment_access}
            </p>
          )}
        </div>

        {/* Continue Button - EXACT match to "VISUALIZE KINETICS" (line 406) */}
        <button
          type="submit"
          onClick={onContinue}
          data-analytics="onboard_step1_continue"
          className="w-full md:w-auto bg-gradient-to-r from-brand-green to-brand-lime text-brand-dark px-8 py-4 rounded-2xl font-bold font-display tracking-wide hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Activity className="w-5 h-5" />
          <span>CONTINUE</span>
        </button>
      </div>
    </div>
  )
}
