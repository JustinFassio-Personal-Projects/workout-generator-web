'use client'

import React from 'react'
import { ArrowRight, Edit3, Target, Dumbbell, Activity, Wrench } from 'lucide-react'
import type { WebsiteOnboardingData } from '@/types/onboarding'
import {
  fitnessLevelOptions,
  activityLevelOptions,
  equipmentAccessOptions,
} from '@/data/onboarding-options'

interface PlanPreviewProps {
  data: WebsiteOnboardingData
  onEdit: () => void
  onCreateAccount: () => void
}

export const PlanPreview: React.FC<PlanPreviewProps> = ({ data, onEdit, onCreateAccount }) => {
  // Get display labels for values
  const levelLabel =
    fitnessLevelOptions.find(o => o.value === data.fitness_level)?.label || data.fitness_level
  const activityLabel =
    activityLevelOptions.find(o => o.value === data.current_activity_level)?.label ||
    data.current_activity_level
  const equipmentLabel =
    equipmentAccessOptions.find(o => o.value === data.equipment_access)?.label ||
    data.equipment_access

  // Format goals for display
  const goalsDisplay =
    data.fitness_goals.length === 1
      ? data.fitness_goals[0]
      : data.fitness_goals.slice(0, -1).join(', ') +
        ' & ' +
        data.fitness_goals[data.fitness_goals.length - 1]

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="text-center mb-2">
        <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
          Your workout profile is set.
        </h3>
        <p className="text-sm md:text-base text-slate-400">
          Here&apos;s what we&apos;ll use to build your personalized plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Goals */}
        <div className="group relative flex flex-col p-5 bg-slate-900/60 border border-white/5 rounded-xl hover:border-brand-green/30 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-green/0 group-hover:bg-brand-green/50 transition-all duration-300"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-2 bg-brand-green/20 rounded-lg text-brand-green shrink-0 shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Goals
              </span>
              <span className="text-base font-bold text-white line-clamp-2">{goalsDisplay}</span>
            </div>
          </div>
        </div>

        {/* Fitness Level */}
        <div className="group relative flex flex-col p-5 bg-slate-900/60 border border-white/5 rounded-xl hover:border-brand-green/30 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-green/0 group-hover:bg-brand-green/50 transition-all duration-300"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-2 bg-brand-green/20 rounded-lg text-brand-green shrink-0 shadow-sm">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Level
              </span>
              <span className="text-base font-bold text-white line-clamp-2">{levelLabel}</span>
            </div>
          </div>
        </div>

        {/* Activity Level */}
        <div className="group relative flex flex-col p-5 bg-slate-900/60 border border-white/5 rounded-xl hover:border-brand-green/30 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-green/0 group-hover:bg-brand-green/50 transition-all duration-300"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-2 bg-brand-green/20 rounded-lg text-brand-green shrink-0 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Activity
              </span>
              <span className="text-base font-bold text-white line-clamp-2">{activityLabel}</span>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="group relative flex flex-col p-5 bg-slate-900/60 border border-white/5 rounded-xl hover:border-brand-green/30 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-green/0 group-hover:bg-brand-green/50 transition-all duration-300"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-2 bg-brand-green/20 rounded-lg text-brand-green shrink-0 shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Equipment
              </span>
              <span className="text-base font-bold text-white line-clamp-2">{equipmentLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions - EXACT match to action buttons row (line 359 pattern) */}
      <div className="flex flex-col md:flex-row gap-2 p-2 mt-4">
        <button
          type="button"
          onClick={onCreateAccount}
          data-analytics="onboard_create_account"
          className="flex-1 md:flex-initial bg-gradient-to-r from-brand-green to-brand-lime text-brand-dark px-8 py-4 rounded-2xl font-bold font-display tracking-wide hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>CREATE ACCOUNT TO GENERATE WORKOUT</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          data-analytics="onboard_edit_answers"
          className="bg-slate-800 border border-white/10 text-white rounded-2xl font-bold px-6 py-4 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <Edit3 className="w-5 h-5" />
          <span>EDIT ANSWERS</span>
        </button>
      </div>
    </div>
  )
}
