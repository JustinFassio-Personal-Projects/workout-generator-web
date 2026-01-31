'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { DeepResearchProfile } from '@/types/deep-research-profile'
import {
  equipmentZoneOptions,
  experienceOptions,
  injuryOptions,
  goalOptions,
  dietTypeOptions,
  nutritionGoalOptions,
  dietaryRestrictionOptions,
  macroFocusOptions,
  DAYS_PER_WEEK_MIN,
  DAYS_PER_WEEK_MAX,
  DAYS_PER_WEEK_DEFAULT,
} from '@/data/deep-research-profile-options'
import styles from './DeepResearchProfileFilter.module.scss'

interface DeepResearchProfileFilterProps {
  profile: DeepResearchProfile
  onChange: (profile: DeepResearchProfile) => void
}

export function DeepResearchProfileFilter({ profile, onChange }: DeepResearchProfileFilterProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const update = (updates: Partial<DeepResearchProfile>) => {
    onChange({ ...profile, ...updates })
  }

  const toggleInjury = (value: string) => {
    const injuries = profile.injuries || []
    const next = injuries.includes(value) ? injuries.filter(i => i !== value) : [...injuries, value]
    update({ injuries: next })
  }

  const toggleRestriction = (value: string) => {
    const restrictions = profile.dietary_restrictions || []
    const next = restrictions.includes(value)
      ? restrictions.filter(r => r !== value)
      : [...restrictions, value]
    update({ dietary_restrictions: next })
  }

  const clearFilters = () => {
    onChange({})
  }

  const hasFilters =
    profile.equipment_zone ||
    profile.days_per_week ||
    profile.experience ||
    (profile.injuries && profile.injuries.length > 0) ||
    profile.goal ||
    profile.diet_type ||
    profile.nutrition_goal ||
    (profile.dietary_restrictions && profile.dietary_restrictions.length > 0) ||
    profile.macro_focus

  return (
    <div className={styles.filter}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <h3 className={styles.title}>Your Vitals</h3>
        {isExpanded ? (
          <ChevronUp className={styles.icon} size={20} />
        ) : (
          <ChevronDown className={styles.icon} size={20} />
        )}
      </button>

      {isExpanded && (
        <div className={styles.content}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Equipment / Zone</label>
              <select
                value={profile.equipment_zone || ''}
                onChange={e => update({ equipment_zone: e.target.value || undefined })}
              >
                {equipmentZoneOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Days per week</label>
              <input
                type="number"
                min={DAYS_PER_WEEK_MIN}
                max={DAYS_PER_WEEK_MAX}
                value={profile.days_per_week ?? DAYS_PER_WEEK_DEFAULT}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  update({ days_per_week: isNaN(v) ? undefined : v })
                }}
              />
            </div>

            <div className={styles.field}>
              <label>Experience</label>
              <select
                value={profile.experience || ''}
                onChange={e => update({ experience: e.target.value || undefined })}
              >
                <option value="">Any</option>
                {experienceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Goal</label>
              <select
                value={profile.goal || ''}
                onChange={e => update({ goal: e.target.value || undefined })}
              >
                <option value="">Any</option>
                {goalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Select injuries (if any)</label>
            <div className={styles.chips}>
              {injuryOptions.map(opt => {
                const selected = (profile.injuries || []).includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.chipActive : ''}`}
                    onClick={() => toggleInjury(opt.value)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.sectionTitle}>Nutrition</div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Diet type</label>
              <select
                value={profile.diet_type || ''}
                onChange={e => update({ diet_type: e.target.value || undefined })}
              >
                <option value="">Any</option>
                {dietTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Nutrition goal</label>
              <select
                value={profile.nutrition_goal || ''}
                onChange={e => update({ nutrition_goal: e.target.value || undefined })}
              >
                <option value="">Any</option>
                {nutritionGoalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Macro focus</label>
              <select
                value={profile.macro_focus || ''}
                onChange={e => update({ macro_focus: e.target.value || undefined })}
              >
                <option value="">Any</option>
                {macroFocusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Dietary restrictions</label>
            <div className={styles.chips}>
              {dietaryRestrictionOptions.map(opt => {
                const selected = (profile.dietary_restrictions || []).includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.chipActive : ''}`}
                    onClick={() => toggleRestriction(opt.value)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {hasFilters && (
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
