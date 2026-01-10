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
      {/* Fitness Goals - EXACT match to Analysis Presets (lines 331-356) */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 px-12 md:px-16 pb-2 -mt-1 md:-mt-2">
        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
          Fitness Goals:
        </span>
        {/* Wrap horizontally to create 2-3 rows on all screen sizes - never stack vertically */}
        <div className="flex flex-wrap items-start gap-2 min-h-[72px] max-h-[120px] w-full">
          {fitnessGoalOptions.map(option => {
            const isSelected = fitnessGoals.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleGoal(option.value)}
                aria-pressed={isSelected}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-all shrink-0 flex-[1_1_auto] min-w-[120px] max-w-[200px] ${
                  isSelected
                    ? 'bg-brand-green/10 dark:bg-brand-green/20 border-brand-green/50 text-brand-green dark:text-brand-lime'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-brand-green/50'
                }`}
              >
                <Activity className="w-3 h-3 text-brand-green" />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      {errors.fitness_goals && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1 px-12 md:px-16">
          {errors.fitness_goals}
        </p>
      )}

      {/* Dropdown Row Container - EXACT match (line 359) */}
      <div className="flex flex-col md:flex-row gap-2 p-2 mt-2">
        {/* Fitness Level - EXACT match to Expertise Level (lines 360-379) */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-brand-green/30 transition-colors relative overflow-hidden group/item">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-brand-green shrink-0 shadow-sm">
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
                className="bg-transparent border-none text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-brand-green transition-colors truncate pr-8 appearance-none"
              >
                {fitnessLevelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center pr-2 text-slate-400 dark:text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
          {errors.fitness_level && (
            <p className="absolute -bottom-5 left-4 text-xs text-red-500 dark:text-red-400">
              {errors.fitness_level}
            </p>
          )}
        </div>

        {/* Equipment Access - EXACT same structure */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-brand-green/30 transition-colors relative overflow-hidden group/item">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-brand-green shrink-0 shadow-sm">
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
                className="bg-transparent border-none text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-brand-green transition-colors truncate pr-8 appearance-none"
              >
                {equipmentAccessOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center pr-2 text-slate-400 dark:text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
          {errors.equipment_access && (
            <p className="absolute -bottom-5 left-4 text-xs text-red-500 dark:text-red-400">
              {errors.equipment_access}
            </p>
          )}
        </div>

        {/* Continue Button - EXACT match to "VISUALIZE KINETICS" (line 406) */}
        <button
          type="submit"
          onClick={onContinue}
          className="w-full md:w-auto bg-gradient-to-r from-brand-green to-brand-lime text-brand-dark px-8 py-4 rounded-2xl font-bold font-display tracking-wide hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Activity className="w-5 h-5" />
          <span>CONTINUE</span>
        </button>
      </div>
    </div>
  )
}
