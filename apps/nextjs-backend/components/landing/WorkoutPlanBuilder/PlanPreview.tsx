'use client'

import React from 'react'
import { ArrowRight, Edit3, Target, Dumbbell, Activity, Wrench } from 'lucide-react'
import type { WebsiteOnboardingData } from '@/types/onboarding'
import {
  fitnessLevelOptions,
  activityLevelOptions,
  equipmentAccessOptions,
} from '@/data/onboarding-options'
import { Button } from '@/components/ui/Button/Button'
import styles from './WorkoutPlanBuilder.module.scss'

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
  // Format equipment categories for display (handle array format)
  const equipmentLabel = Array.isArray(data.equipment_access)
    ? data.equipment_access.join(', ')
    : String(data.equipment_access)

  // Format goals for display
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
        <Button
          variant="primary"
          size="lg"
          onClick={onCreateAccount}
          icon={ArrowRight}
          iconPosition="right"
          className={styles.createAccountButton}
          data-analytics="home_builder_create_account"
        >
          Create account to generate workout
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={onEdit}
          icon={Edit3}
          iconPosition="left"
          data-analytics="home_builder_edit_answers"
        >
          Edit answers
        </Button>
      </div>
    </div>
  )
}
