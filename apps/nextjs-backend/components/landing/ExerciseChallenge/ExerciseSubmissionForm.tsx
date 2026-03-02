'use client'

import React, { FormEvent, useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button/Button'
import { Card } from '@/components/ui/Card/Card'
import {
  validateExerciseName,
  validateTechniqueCues,
  validateArrayNotEmpty,
  validateEnum,
} from '@/lib/validation'
import { analytics } from '@/lib/analytics'
import type {
  ExerciseSubmissionFormData,
  CreateExerciseSubmissionResponse,
  ExerciseCategory,
  EquipmentType,
  MovementPattern,
  DifficultyLevel,
} from '@/types/exercise-challenge'
import styles from './ExerciseSubmissionForm.module.scss'

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Obliques',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full Body',
  'Cardio',
] as const

interface ExerciseSubmissionFormProps {
  leadId: string
  onSubmissionComplete: () => void
}

export const ExerciseSubmissionForm: React.FC<ExerciseSubmissionFormProps> = ({
  leadId,
  onSubmissionComplete,
}) => {
  const [formData, setFormData] = useState<ExerciseSubmissionFormData>({
    exercise_name: '',
    category: 'strength',
    equipment: 'none',
    primary_muscles: [],
    movement_pattern: 'squat',
    difficulty: 'beginner',
    technique_cues: '',
    safety_notes: '',
    regression: '',
    progression: '',
    mistakes: '',
    contraindications: '',
    rationale: '',
    vision_prompt: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    analytics.trackExerciseSubmissionStarted()
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleMuscleToggle = (muscle: string) => {
    setFormData(prev => {
      const muscles = prev.primary_muscles
      const index = muscles.indexOf(muscle)
      if (index > -1) {
        return {
          ...prev,
          primary_muscles: muscles.filter(m => m !== muscle),
        }
      } else {
        return {
          ...prev,
          primary_muscles: [...muscles, muscle],
        }
      }
    })
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!validateExerciseName(formData.exercise_name)) {
      errors.exercise_name = 'Exercise name is required (1-100 characters)'
    }

    if (!validateTechniqueCues(formData.technique_cues)) {
      errors.technique_cues = 'Technique cues are required (10-2000 characters)'
    }

    if (!validateArrayNotEmpty(formData.primary_muscles)) {
      errors.primary_muscles = 'Please select at least one primary muscle group'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      setError('Please fix the errors below')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/exercise-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: leadId,
          ...formData,
        }),
      })

      const data: CreateExerciseSubmissionResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit exercise')
      }

      analytics.trackExerciseSubmissionSubmitted(data.submission_id)
      setSuccess(true)
      setTimeout(() => {
        onSubmissionComplete()
      }, 2000)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card variant="default" className={styles.card}>
        <div className={styles.success}>
          <h3 className={styles.successTitle}>Submission Received!</h3>
          <p className={styles.successMessage}>
            Got it. If we publish it, we&apos;ll email you and apply your reward.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="default" className={styles.card}>
      <div className={styles.content}>
        <h2 className={styles.title}>Submit Your Exercise</h2>
        <p className={styles.subtitle}>
          Keep cues simple and coach-like. Pretend you&apos;re explaining it to a beginner who wants
          to stay safe.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Exercise Name */}
          <div className={styles.field}>
            <label htmlFor="exercise_name" className={styles.label}>
              Exercise Name <span className={styles.required}>*</span>
            </label>
            <input
              id="exercise_name"
              name="exercise_name"
              type="text"
              value={formData.exercise_name}
              onChange={handleInputChange}
              className={`${styles.input} ${fieldErrors.exercise_name ? styles.inputError : ''}`}
              required
              disabled={isSubmitting}
              placeholder="e.g., Goblet Squat"
              maxLength={100}
            />
            {fieldErrors.exercise_name && (
              <span className={styles.fieldError}>{fieldErrors.exercise_name}</span>
            )}
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>
              Category <span className={styles.required}>*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={isSubmitting}
            >
              <option value="strength">Strength</option>
              <option value="conditioning">Conditioning</option>
              <option value="mobility">Mobility</option>
              <option value="skill">Skill</option>
              <option value="recovery">Recovery</option>
            </select>
          </div>

          {/* Equipment */}
          <div className={styles.field}>
            <label htmlFor="equipment" className={styles.label}>
              Equipment <span className={styles.required}>*</span>
            </label>
            <select
              id="equipment"
              name="equipment"
              value={formData.equipment}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={isSubmitting}
            >
              <option value="none">None</option>
              <option value="db">Dumbbells (DB)</option>
              <option value="bb">Barbell (BB)</option>
              <option value="kb">Kettlebell (KB)</option>
              <option value="bands">Bands</option>
              <option value="machine">Machine</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Primary Muscles */}
          <div className={styles.field}>
            <label className={styles.label}>
              Primary Muscles <span className={styles.required}>*</span>
            </label>
            <div className={styles.muscleGrid}>
              {MUSCLE_GROUPS.map(muscle => (
                <label key={muscle} className={styles.muscleLabel}>
                  <input
                    type="checkbox"
                    checked={formData.primary_muscles.includes(muscle)}
                    onChange={() => handleMuscleToggle(muscle)}
                    disabled={isSubmitting}
                    className={styles.checkbox}
                  />
                  <span>{muscle}</span>
                </label>
              ))}
            </div>
            {fieldErrors.primary_muscles && (
              <span className={styles.fieldError}>{fieldErrors.primary_muscles}</span>
            )}
          </div>

          {/* Movement Pattern */}
          <div className={styles.field}>
            <label htmlFor="movement_pattern" className={styles.label}>
              Movement Pattern <span className={styles.required}>*</span>
            </label>
            <select
              id="movement_pattern"
              name="movement_pattern"
              value={formData.movement_pattern}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={isSubmitting}
            >
              <option value="squat">Squat</option>
              <option value="hinge">Hinge</option>
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="carry">Carry</option>
              <option value="rotation">Rotation</option>
              <option value="locomotion">Locomotion</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className={styles.field}>
            <label htmlFor="difficulty" className={styles.label}>
              Difficulty <span className={styles.required}>*</span>
            </label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={isSubmitting}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Technique Cues */}
          <div className={styles.field}>
            <label htmlFor="technique_cues" className={styles.label}>
              Short Technique Cues <span className={styles.required}>*</span>
            </label>
            <textarea
              id="technique_cues"
              name="technique_cues"
              value={formData.technique_cues}
              onChange={handleInputChange}
              className={`${styles.textarea} ${fieldErrors.technique_cues ? styles.inputError : ''}`}
              required
              disabled={isSubmitting}
              placeholder="Enter 3-6 bullet points with technique cues..."
              rows={6}
              minLength={10}
              maxLength={2000}
            />
            <div className={styles.helperText}>
              {formData.technique_cues.length}/2000 characters
            </div>
            {fieldErrors.technique_cues && (
              <span className={styles.fieldError}>{fieldErrors.technique_cues}</span>
            )}
          </div>

          {/* Safety Notes */}
          <div className={styles.field}>
            <label htmlFor="safety_notes" className={styles.label}>
              Safety Notes (Optional)
            </label>
            <textarea
              id="safety_notes"
              name="safety_notes"
              value={formData.safety_notes}
              onChange={handleInputChange}
              className={styles.textarea}
              disabled={isSubmitting}
              placeholder="Any important safety considerations..."
              rows={3}
            />
          </div>

          {/* Vision Prompt */}
          <div className={styles.field}>
            <label htmlFor="vision_prompt" className={styles.label}>
              What did you analyze in Vision Lab? (Optional)
            </label>
            <textarea
              id="vision_prompt"
              name="vision_prompt"
              value={formData.vision_prompt}
              onChange={handleInputChange}
              className={styles.textarea}
              disabled={isSubmitting}
              placeholder="Describe what you analyzed using the Vision Lab tool..."
              rows={3}
            />
          </div>

          {/* Rationale */}
          <div className={styles.field}>
            <label htmlFor="rationale" className={styles.label}>
              Why add this to the library? (Optional)
            </label>
            <textarea
              id="rationale"
              name="rationale"
              value={formData.rationale}
              onChange={handleInputChange}
              className={styles.textarea}
              disabled={isSubmitting}
              placeholder="1-2 sentences explaining why this exercise should be included..."
              rows={2}
            />
          </div>

          {/* Regression */}
          <div className={styles.field}>
            <label htmlFor="regression" className={styles.label}>
              Regression (Optional)
            </label>
            <textarea
              id="regression"
              name="regression"
              value={formData.regression}
              onChange={handleInputChange}
              className={styles.textarea}
              disabled={isSubmitting}
              placeholder="Easier variation of this exercise..."
              rows={2}
            />
          </div>

          {/* Progression */}
          <div className={styles.field}>
            <label htmlFor="progression" className={styles.label}>
              Progression (Optional)
            </label>
            <textarea
              id="progression"
              name="progression"
              value={formData.progression}
              onChange={handleInputChange}
              className={styles.textarea}
              disabled={isSubmitting}
              placeholder="Harder variation of this exercise..."
              rows={2}
            />
          </div>

          {/* Common Mistakes */}
          <div className={styles.field}>
            <label htmlFor="mistakes" className={styles.label}>
              Common Mistakes (Optional)
            </label>
            <textarea
              id="mistakes"
              name="mistakes"
              value={formData.mistakes}
              onChange={handleInputChange}
              className={styles.textarea}
              disabled={isSubmitting}
              placeholder="Common mistakes people make with this exercise..."
              rows={3}
            />
          </div>

          {/* Contraindications */}
          <div className={styles.field}>
            <label htmlFor="contraindications" className={styles.label}>
              Contraindications (Optional)
            </label>
            <textarea
              id="contraindications"
              name="contraindications"
              value={formData.contraindications}
              onChange={handleInputChange}
              className={styles.textarea}
              disabled={isSubmitting}
              placeholder="Who should avoid this exercise or modifications needed..."
              rows={2}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={styles.submitButton}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Submit Exercise
          </Button>
        </form>
      </div>
    </Card>
  )
}
