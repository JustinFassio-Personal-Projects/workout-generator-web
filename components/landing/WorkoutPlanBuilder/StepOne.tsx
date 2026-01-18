'use client'

import React from 'react'
import { Check } from 'lucide-react'
import type { FitnessGoal, FitnessLevel, EquipmentAccess } from '@/types/onboarding'
import {
  fitnessGoalOptions,
  fitnessLevelOptions,
  equipmentAccessOptions,
} from '@/data/onboarding-options'
import { Button } from '@/components/ui/Button/Button'
import styles from './WorkoutPlanBuilder.module.scss'

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
    <div className={styles.stepContent}>
      {/* Fitness Goals - Multi-select chips */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          What are your fitness goals? <span className={styles.required}>*</span>
        </label>
        <p className={styles.fieldHint}>Select all that apply</p>
        <div className={styles.chipGrid}>
          {fitnessGoalOptions.map(option => {
            const isSelected = fitnessGoals.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                onClick={() => toggleGoal(option.value)}
                data-analytics={`home_builder_goal_${option.value}`}
                aria-pressed={isSelected}
              >
                {isSelected && <Check size={16} className={styles.chipIcon} />}
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
        {errors.fitness_goals && <p className={styles.errorText}>{errors.fitness_goals}</p>}
      </div>

      {/* Fitness Level - Select */}
      <div className={styles.fieldGroup}>
        <label htmlFor="fitness-level" className={styles.fieldLabel}>
          What&apos;s your current fitness level? <span className={styles.required}>*</span>
        </label>
        <select
          id="fitness-level"
          className={styles.select}
          value={fitnessLevel}
          onChange={e => onLevelChange(e.target.value as FitnessLevel)}
          data-analytics="home_builder_select_fitness_level"
        >
          {fitnessLevelOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.fitness_level && <p className={styles.errorText}>{errors.fitness_level}</p>}
      </div>

      {/* Equipment Access - Select */}
      <div className={styles.fieldGroup}>
        <label htmlFor="equipment-access" className={styles.fieldLabel}>
          What equipment do you have access to? <span className={styles.required}>*</span>
        </label>
        <select
          id="equipment-access"
          className={styles.select}
          value={equipmentAccess}
          onChange={e => onEquipmentChange(e.target.value as EquipmentAccess)}
          data-analytics="home_builder_select_equipment_access"
        >
          {equipmentAccessOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.equipment_access && <p className={styles.errorText}>{errors.equipment_access}</p>}
      </div>

      {/* Continue Button */}
      <div className={styles.formActions}>
        <Button
          variant="primary"
          size="lg"
          onClick={onContinue}
          className={styles.continueButton}
          data-analytics="home_builder_step1_continue"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
