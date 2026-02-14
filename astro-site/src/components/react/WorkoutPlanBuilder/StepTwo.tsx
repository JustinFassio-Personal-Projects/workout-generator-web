'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import type { ActivityLevel, Gender, PreferredUnits } from '@/types/onboarding'
import {
  activityLevelOptions,
  genderOptions,
  weightUnitOptions,
  heightUnitOptions,
} from '@/data/onboarding-options'
import styles from './WorkoutPlanBuilder.module.scss'

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

export const StepTwo: React.FC<StepTwoProps> = ({
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
}) => {
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
    <div className={styles.stepContent}>
      <div className={styles.fieldGroup}>
        <label htmlFor="activity-level" className={styles.fieldLabel}>
          How active are you currently? <span className={styles.required}>*</span>
        </label>
        <select
          id="activity-level"
          className={styles.select}
          value={activityLevel}
          onChange={e => onActivityChange(e.target.value as ActivityLevel)}
        >
          {activityLevelOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.activity_level && <p className={styles.errorText}>{errors.activity_level}</p>}
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="gender" className={styles.fieldLabel}>
          Gender <span className={styles.optional}>(optional)</span>
        </label>
        <select
          id="gender"
          className={styles.select}
          value={gender || 'prefer_not_to_say'}
          onChange={e => onGenderChange(e.target.value as Gender)}
        >
          {genderOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="age" className={styles.fieldLabel}>
          Age <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id="age"
          type="number"
          className={styles.input}
          value={age ?? ''}
          onChange={handleAgeChange}
          min={13}
          max={120}
          placeholder="Enter your age"
        />
        {errors.age && <p className={styles.errorText}>{errors.age}</p>}
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Preferred units</label>
        <div className={styles.unitsRow}>
          <div className={styles.unitToggle}>
            <span className={styles.unitLabel}>Weight:</span>
            <div className={styles.toggleGroup}>
              {weightUnitOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.toggleButton} ${preferredUnits.weight === option.value ? styles.toggleActive : ''}`}
                  onClick={() => onUnitsChange({ weight: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.unitToggle}>
            <span className={styles.unitLabel}>Height:</span>
            <div className={styles.toggleGroup}>
              {heightUnitOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.toggleButton} ${preferredUnits.height === option.value ? styles.toggleActive : ''}`}
                  onClick={() => onUnitsChange({ height: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.formActions}>
        <button
          type="button"
          className={`${styles.formButtonSecondary} ${styles.backButton}`}
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          type="button"
          className={`${styles.formButton} ${styles.submitButton}`}
          onClick={onSubmit}
        >
          See My Plan
        </button>
      </div>
    </div>
  )
}
