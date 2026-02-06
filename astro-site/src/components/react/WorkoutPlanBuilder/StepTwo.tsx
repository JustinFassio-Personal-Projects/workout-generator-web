import { ArrowLeft } from 'lucide-react'
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

const inputBase =
  'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white min-h-[48px] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20'

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="builder-activity" className="block text-base font-medium text-white mb-1">
          How active are you currently? <span className="text-[var(--color-accent)]">*</span>
        </label>
        <select
          id="builder-activity"
          className={`${inputBase} appearance-none bg-no-repeat bg-[length:20px] bg-[right_1rem_center] pr-12`}
          value={activityLevel}
          onChange={e => onActivityChange(e.target.value as ActivityLevel)}
        >
          {activityLevelOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.activity_level && (
          <p className="mt-1 text-sm text-red-500">{errors.activity_level}</p>
        )}
      </div>

      <div>
        <label htmlFor="builder-gender" className="block text-base font-medium text-white mb-1">
          Gender <span className="text-white/50 text-sm font-normal">(optional)</span>
        </label>
        <select
          id="builder-gender"
          className={`${inputBase} appearance-none bg-no-repeat bg-[length:20px] bg-[right_1rem_center] pr-12`}
          value={gender ?? 'prefer_not_to_say'}
          onChange={e => onGenderChange(e.target.value as Gender)}
        >
          {genderOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="builder-age" className="block text-base font-medium text-white mb-1">
          Age <span className="text-white/50 text-sm font-normal">(optional)</span>
        </label>
        <input
          id="builder-age"
          type="number"
          className={inputBase}
          value={age ?? ''}
          onChange={handleAgeChange}
          min={13}
          max={120}
          placeholder="Enter your age"
        />
        {errors.age && <p className="mt-1 text-sm text-red-500">{errors.age}</p>}
      </div>

      <div>
        <label className="block text-base font-medium text-white mb-2">Preferred units</label>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70 min-w-[52px]">Weight:</span>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {weightUnitOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`px-3 py-2 text-sm font-medium min-w-[44px] min-h-[36px] transition-colors ${
                    preferredUnits.weight === opt.value
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent-light)]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => onUnitsChange({ weight: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70 min-w-[52px]">Height:</span>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {heightUnitOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`px-3 py-2 text-sm font-medium min-w-[44px] min-h-[36px] transition-colors ${
                    preferredUnits.height === opt.value
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent-light)]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => onUnitsChange({ height: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-[var(--bg-dark)] font-semibold hover:bg-[var(--color-accent-light)] transition-colors min-w-[140px]"
        >
          See My Plan
        </button>
      </div>
    </div>
  )
}
