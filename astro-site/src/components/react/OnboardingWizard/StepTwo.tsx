import { ArrowLeft, Activity, Users, Calendar, ChevronDown } from 'lucide-react'
import type { ActivityLevel, Gender, PreferredUnits } from '@/types/onboarding'
import {
  activityLevelOptions,
  genderOptions,
  weightUnitOptions,
  heightUnitOptions,
} from '@/data/onboarding-options'

interface StepTwoProps {
  activityLevel: ActivityLevel
  gender?: Gender
  age?: number
  preferredUnits: PreferredUnits
  errors: Record<string, string>
  onActivityChange: (level: ActivityLevel) => void
  onGenderChange: (gender: Gender | undefined) => void
  onAgeChange: (age: number | undefined) => void
  onUnitsChange: (units: Partial<PreferredUnits>) => void
  onBack: () => void
  onSubmit: () => void
}

export function StepTwo({
  activityLevel,
  gender,
  age,
  preferredUnits,
  errors,
  onActivityChange,
  onGenderChange,
  onAgeChange,
  onUnitsChange,
  onBack,
  onSubmit,
}: StepTwoProps) {
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      onAgeChange(undefined)
    } else {
      const parsed = parseInt(value, 10)
      if (!isNaN(parsed)) onAgeChange(parsed)
    }
  }

  const chipSelected = 'bg-[var(--color-orange-light)]/20 border-[var(--color-orange-light)]/50 text-[var(--color-orange-light)]'
  const chipDefault = 'bg-slate-800 border-white/5 text-slate-300 hover:border-[var(--color-orange-light)]/50'

  return (
    <div className="relative flex flex-col">
      <div className="flex flex-col md:flex-row gap-2 p-2">
        <div className="flex-1 bg-slate-950/50 rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3 hover:border-[var(--color-orange-light)]/30 transition-colors relative overflow-hidden group/item">
          <div className="p-2 bg-slate-800 rounded-lg text-[var(--color-orange-light)] shrink-0 shadow-sm">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex flex-col z-10 w-full overflow-hidden relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Activity Level
            </label>
            <div className="relative">
              <select
                value={activityLevel}
                onChange={e => onActivityChange(e.target.value as ActivityLevel)}
                className="bg-transparent border-none text-base font-bold text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-[var(--color-orange-light)] transition-colors truncate pr-8 appearance-none"
              >
                {activityLevelOptions.map(option => (
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
          {errors.activity_level && (
            <p className="absolute -bottom-5 left-4 text-xs text-red-400">
              {errors.activity_level}
            </p>
          )}
        </div>

        <div className="flex-1 bg-slate-950/50 rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3 hover:border-[var(--color-orange-light)]/30 transition-colors relative overflow-hidden group/item">
          <div className="p-2 bg-slate-800 rounded-lg text-[var(--color-orange-light)] shrink-0 shadow-sm">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex flex-col z-10 w-full overflow-hidden relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Gender <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={gender ?? 'prefer_not_to_say'}
                onChange={e => onGenderChange(e.target.value as Gender)}
                className="bg-transparent border-none text-base font-bold text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-[var(--color-orange-light)] transition-colors truncate pr-8 appearance-none"
              >
                {genderOptions.map(option => (
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
        </div>
      </div>

      <div className="flex-1 bg-slate-950/50 rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3 hover:border-[var(--color-orange-light)]/30 transition-colors relative overflow-hidden group/item mt-2 mx-2">
        <div className="p-2 bg-slate-800 rounded-lg text-[var(--color-orange-light)] shrink-0 shadow-sm">
          <Calendar className="w-4 h-4" />
        </div>
        <div className="flex flex-col z-10 w-full overflow-hidden">
          <label
            htmlFor="onboard-age"
            className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
          >
            Age <span className="text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="onboard-age"
            type="number"
            value={age ?? ''}
            onChange={handleAgeChange}
            min={13}
            max={120}
            placeholder="Enter your age"
            className="bg-transparent border-none text-base font-bold text-slate-100 focus:ring-0 p-0 w-full hover:text-[var(--color-orange-light)] transition-colors placeholder:text-slate-500"
          />
        </div>
        {errors.age && (
          <p className="absolute -bottom-5 left-4 text-xs text-red-400">{errors.age}</p>
        )}
      </div>

      <div className="flex items-center gap-2 px-12 md:px-16 overflow-x-auto no-scrollbar mt-4 mb-4">
        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
          Unit Preferences:
        </span>
        {weightUnitOptions.map(option => {
          const isActive = preferredUnits.weight === option.value
          return (
            <button
              key={`weight-${option.value}`}
              type="button"
              onClick={() => onUnitsChange({ weight: option.value })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-all shrink-0 ${
                isActive ? chipSelected : chipDefault
              }`}
            >
              <Activity className="w-3 h-3 text-[var(--color-orange-light)]" />
              <span>{option.label}</span>
            </button>
          )
        })}
        <div className="h-6 w-px bg-slate-400 shrink-0" />
        {heightUnitOptions.map(option => {
          const isActive = preferredUnits.height === option.value
          return (
            <button
              key={`height-${option.value}`}
              type="button"
              onClick={() => onUnitsChange({ height: option.value })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-all shrink-0 ${
                isActive ? chipSelected : chipDefault
              }`}
            >
              <Activity className="w-3 h-3 text-[var(--color-orange-light)]" />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-2 p-2">
        <button
          type="button"
          onClick={onBack}
          className="bg-slate-800 border border-white/10 text-white rounded-2xl font-bold px-6 py-4 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>BACK</span>
        </button>
        <button
          type="submit"
          onClick={onSubmit}
          className="flex-1 md:flex-initial bg-gradient-to-r from-[var(--color-orange-light)] to-[var(--color-orange-medium)] text-slate-900 px-8 py-4 rounded-2xl font-bold tracking-wide hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M14.4 14.4 9.6 9.6" />
            <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
            <path d="m21.5 21.5-1.4-1.4" />
            <path d="M3.9 3.9 2.5 2.5" />
            <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
          </svg>
          <span>Let&apos;s Go!</span>
        </button>
      </div>
    </div>
  )
}
