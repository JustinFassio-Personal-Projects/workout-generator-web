'use client'

import React from 'react'
import { ArrowRight, Edit3, Target, Dumbbell, Activity, Wrench } from 'lucide-react'
import type { WebsiteOnboardingData } from '@/types/onboarding'
import { fitnessLevelOptions, activityLevelOptions } from '@/data/onboarding-options'
import styles from './WorkoutPlanBuilder.module.scss'

interface PlanPreviewProps {
  data: WebsiteOnboardingData
  onEdit: () => void
  onCreateAccount: () => void
}

export const PlanPreview: React.FC<PlanPreviewProps> = ({ data, onEdit, onCreateAccount }) => {
  const levelLabel =
    fitnessLevelOptions.find(o => o.value === data.fitness_level)?.label || data.fitness_level
  const activityLabel =
    activityLevelOptions.find(o => o.value === data.current_activity_level)?.label ||
    data.current_activity_level
  const equipmentLabel = Array.isArray(data.equipment_access)
    ? data.equipment_access.join(', ')
    : String(data.equipment_access)
  const goalsDisplay =
    data.fitness_goals.length === 1
      ? data.fitness_goals[0]
      : data.fitness_goals.slice(0, -1).join(', ') +
        ' & ' +
        data.fitness_goals[data.fitness_goals.length - 1]

  return (
    <div className={styles.previewCard}>
      <div className={styles.previewHeader}>
        <h3 className={styles.previewTitle}>Your plan is ready.</h3>
        <p className={styles.previewSubtitle}>
          Here&apos;s a summary of your personalized workout profile.
        </p>
      </div>
      <div className={styles.previewDetails}>
        <div className={styles.previewItem}>
          <Target size={20} className={styles.previewIcon} />
          <div className={styles.previewItemContent}>
            <span className={styles.previewLabel}>Goals</span>
            <span className={styles.previewValue}>{goalsDisplay}</span>
          </div>
        </div>
        <div className={styles.previewItem}>
          <Dumbbell size={20} className={styles.previewIcon} />
          <div className={styles.previewItemContent}>
            <span className={styles.previewLabel}>Level</span>
            <span className={styles.previewValue}>{levelLabel}</span>
          </div>
        </div>
        <div className={styles.previewItem}>
          <Activity size={20} className={styles.previewIcon} />
          <div className={styles.previewItemContent}>
            <span className={styles.previewLabel}>Activity</span>
            <span className={styles.previewValue}>{activityLabel}</span>
          </div>
        </div>
        <div className={styles.previewItem}>
          <Wrench size={20} className={styles.previewIcon} />
          <div className={styles.previewItemContent}>
            <span className={styles.previewLabel}>Equipment</span>
            <span className={styles.previewValue}>{equipmentLabel}</span>
          </div>
        </div>
      </div>
      <div className={styles.previewActions}>
        <button
          type="button"
          className={`${styles.formButton} ${styles.createAccountButton}`}
          onClick={onCreateAccount}
        >
          Create account to generate workout
          <ArrowRight size={18} />
        </button>
        <button type="button" className={styles.formButtonSecondary} onClick={onEdit}>
          <Edit3 size={18} />
          Edit answers
        </button>
      </div>
    </div>
  )
}
