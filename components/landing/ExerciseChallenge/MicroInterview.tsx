'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card/Card'
import { Chip } from '@/components/ui/Chip/Chip'
import { Button } from '@/components/ui/Button/Button'
import { analytics } from '@/lib/analytics'
import type {
  MicroInterviewFormData,
  CreateVisionLeadIntelResponse,
} from '@/types/exercise-challenge'
import styles from './MicroInterview.module.scss'

interface MicroInterviewProps {
  leadId: string
  visionPrompt?: string
  imageUrl?: string
  onComplete: () => void
}

const QUESTIONS = {
  goal_primary: {
    question: 'What are you training for right now?',
    options: [
      'Lose fat',
      'Build muscle',
      'Get stronger',
      'Improve conditioning',
      'Mobility / pain-free movement',
      'Sport performance',
      'Get back in shape',
    ],
  },
  frustration_primary: {
    question: "What's your biggest frustration with workouts today?",
    options: [
      "I don't know what to do",
      'I start strong, then fall off',
      "Workouts don't match my time/equipment",
      "I'm not seeing progress",
      "I'm worried about injury or form",
      'I get bored / need variety',
      'Programs feel too complicated',
    ],
  },
  ai_expectation_primary: {
    question: 'What would you want the AI to do for you?',
    options: [
      'Build a plan with week-to-week progression',
      'Adapt workouts based on my feedback',
      'Give safe substitutions when something hurts',
      'Keep me consistent with scheduling/reminders',
      'Explain exercises with simple coaching cues',
      'Include nutrition basics too',
    ],
  },
  payment_trigger_primary: {
    question: 'What would make you consider paying for this?',
    options: [
      'Clear progression plan (not random)',
      'Better tracking + analytics',
      'Unlimited workouts',
      'A real coach reviewing things',
      'Accountability (live classes / check-ins)',
      'Nutrition structure',
      'If it actually worked for me',
    ],
  },
} as const

type QuestionKey = keyof typeof QUESTIONS

export const MicroInterview: React.FC<MicroInterviewProps> = ({
  leadId,
  visionPrompt,
  imageUrl,
  onComplete,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showOptionalQ4, setShowOptionalQ4] = useState(false)
  const [showFreeText, setShowFreeText] = useState(false)
  const [showExerciseSuggestion, setShowExerciseSuggestion] = useState(false)
  const [formData, setFormData] = useState<MicroInterviewFormData>({
    goal_primary: '',
    frustration_primary: '',
    ai_expectation_primary: '',
    payment_trigger_primary: '',
    expectation_free_text: '',
    exercise_suggestion: '',
    vision_prompt: visionPrompt || '',
    image_url: imageUrl || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update vision_prompt when prop changes
  useEffect(() => {
    if (visionPrompt) {
      setFormData(prev => ({ ...prev, vision_prompt: visionPrompt }))
    }
  }, [visionPrompt])

  // Update image_url when prop changes (e.g., when generation completes)
  useEffect(() => {
    if (imageUrl) {
      setFormData(prev => ({ ...prev, image_url: imageUrl }))
    }
  }, [imageUrl])

  const requiredQuestions: QuestionKey[] = [
    'goal_primary',
    'frustration_primary',
    'ai_expectation_primary',
  ]
  const currentQuestionKey = requiredQuestions[currentQuestionIndex] as QuestionKey
  const currentQuestion = QUESTIONS[currentQuestionKey]

  useEffect(() => {
    analytics.trackVisionMicroqStarted(leadId)
  }, [leadId])

  const handleAnswer = (questionKey: QuestionKey, answer: string) => {
    setFormData(prev => ({ ...prev, [questionKey]: answer }))
    analytics.trackVisionMicroqAnswered(leadId, questionKey, answer)

    // Auto-advance to next question
    if (currentQuestionIndex < requiredQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // All required questions answered, show optional Q4
      setShowOptionalQ4(true)
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleOptionalQ4Answer = (answer: string) => {
    setFormData(prev => ({ ...prev, payment_trigger_primary: answer }))
    analytics.trackVisionMicroqAnswered(leadId, 'payment_trigger_primary', answer)
    // After Q4 is answered, allow submission
    setShowOptionalQ4(false)
  }

  const handleSkipQ4 = () => {
    // Skip Q4 and allow submission
    setShowOptionalQ4(false)
  }

  const handleFreeTextChange = (text: string) => {
    if (text.length <= 500) {
      setFormData(prev => ({ ...prev, expectation_free_text: text }))
    }
  }

  const handleFreeTextSave = () => {
    const hasText = Boolean(formData.expectation_free_text?.trim())
    const textLength = formData.expectation_free_text?.length || 0
    analytics.trackVisionMicroqFreeTextSaved(leadId, hasText, textLength)
  }

  const handleExerciseSuggestionChange = (text: string) => {
    setFormData(prev => ({ ...prev, exercise_suggestion: text }))
  }

  const handleExerciseSuggestionSave = () => {
    const hasSuggestion = Boolean(formData.exercise_suggestion?.trim())
    const suggestionLength = formData.exercise_suggestion?.length || 0
    analytics.trackVisionExerciseSuggested(leadId, hasSuggestion, suggestionLength)
  }

  // Upload base64 image to storage and return storage URL
  const uploadImageToStorage = async (base64Url: string): Promise<string> => {
    try {
      // Convert base64 data URL to Blob
      const response = await fetch(base64Url)
      const blob = await response.blob()

      // Create FormData
      const formData = new FormData()
      formData.append('file', blob, 'image.jpg')

      // Upload to storage
      const uploadResponse = await fetch(`/api/leads/images?lead_id=${leadId}`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to upload image. Please try again.')
      }

      const { url } = await uploadResponse.json()
      return url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image'
      throw new Error(errorMessage)
    }
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (
      !formData.goal_primary ||
      !formData.frustration_primary ||
      !formData.ai_expectation_primary
    ) {
      setError('Please answer all required questions')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Upload image to storage if it's a base64 data URL
      let finalImageUrl = formData.image_url
      if (formData.image_url && formData.image_url.startsWith('data:')) {
        setIsUploadingImage(true)
        try {
          finalImageUrl = await uploadImageToStorage(formData.image_url)
          // Update formData with storage URL
          setFormData(prev => ({ ...prev, image_url: finalImageUrl }))
        } catch (uploadError) {
          const errorMessage =
            uploadError instanceof Error ? uploadError.message : 'Failed to upload image'
          setError(errorMessage)
          setIsUploadingImage(false)
          setIsSubmitting(false)
          return
        } finally {
          setIsUploadingImage(false)
        }
      }

      // Add timeout for fetch request (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      let response: Response
      try {
        response = await fetch('/api/vision-lead-intel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lead_id: leadId,
            ...formData,
            image_url: finalImageUrl, // Use storage URL
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.')
        }
        throw new Error('Network error. Please check your internet connection and try again.')
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(
          response.status === 500
            ? 'Server error. Please try again in a moment.'
            : `Unexpected response: ${text.substring(0, 100)}`
        )
      }

      const data: CreateVisionLeadIntelResponse & { error?: string } = await response.json()

      if (!response.ok) {
        // Provide more specific error messages
        if (response.status === 400) {
          throw new Error(data.error || data.message || 'Invalid data. Please check your answers.')
        }
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.')
        }
        if (response.status === 500) {
          throw new Error('Server error. Please try again in a moment.')
        }
        throw new Error(data.error || data.message || 'Failed to save responses')
      }

      // Track completion
      const requiredCompleted = Boolean(
        formData.goal_primary && formData.frustration_primary && formData.ai_expectation_primary
      )
      const optionalCompleted = Boolean(formData.payment_trigger_primary)
      analytics.trackVisionMicroqCompleted(leadId, requiredCompleted, optionalCompleted)

      onComplete()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit =
    formData.goal_primary && formData.frustration_primary && formData.ai_expectation_primary

  return (
    <Card variant="default" className={styles.card}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>Quick questions (takes ~15 seconds)</h3>
          <p className={styles.helperText}>
            We use this to build workouts that feel less random and more like a real plan.
          </p>
        </div>

        {/* Required Questions */}
        {!showOptionalQ4 && (
          <div className={styles.questionSection}>
            <div className={styles.progress}>
              Question {currentQuestionIndex + 1} of {requiredQuestions.length}
            </div>

            <h4 className={styles.question}>{currentQuestion.question}</h4>

            <div className={styles.chips}>
              {currentQuestion.options.map((option, index) => (
                <Chip
                  key={index}
                  selected={formData[currentQuestionKey] === option}
                  onClick={() => handleAnswer(currentQuestionKey, option)}
                >
                  {option}
                </Chip>
              ))}
            </div>

            {currentQuestionIndex > 0 && (
              <button type="button" onClick={handleBack} className={styles.backButton}>
                ← Back
              </button>
            )}
          </div>
        )}

        {/* Optional Q4 */}
        {showOptionalQ4 && canSubmit && (
          <div className={styles.questionSection}>
            <div className={styles.progress}>
              <span className={styles.optionalTag}>Optional</span>
            </div>

            <h4 className={styles.question}>{QUESTIONS.payment_trigger_primary.question}</h4>

            <div className={styles.chips}>
              {QUESTIONS.payment_trigger_primary.options.map((option, index) => (
                <Chip
                  key={index}
                  selected={formData.payment_trigger_primary === option}
                  onClick={() => handleOptionalQ4Answer(option)}
                >
                  {option}
                </Chip>
              ))}
            </div>

            <div className={styles.q4Actions}>
              <button type="button" onClick={handleSkipQ4} className={styles.skipButton}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Free Text and Exercise Suggestion (shown after Q4 or if Q4 is skipped) */}
        {canSubmit && !showOptionalQ4 && (
          <div className={styles.optionalSection}>
            {!showFreeText ? (
              <button
                type="button"
                onClick={() => setShowFreeText(true)}
                className={styles.tellUsMoreLink}
              >
                Tell us more (optional)
              </button>
            ) : (
              <div className={styles.freeTextSection}>
                <label htmlFor="expectation_free_text" className={styles.freeTextLabel}>
                  If AIWorkoutGenerator nailed one thing for you, what would it be?
                </label>
                <textarea
                  id="expectation_free_text"
                  value={formData.expectation_free_text || ''}
                  onChange={e => handleFreeTextChange(e.target.value)}
                  onBlur={handleFreeTextSave}
                  className={styles.freeTextArea}
                  placeholder="Example: Build me a simple plan I can stick to."
                  maxLength={500}
                  rows={4}
                />
                <div className={styles.freeTextHelper}>
                  <span className={styles.placeholderHint}>
                    Examples: &quot;Build me a simple plan I can stick to.&quot; &quot;Make it safe
                    for my knees/shoulders.&quot; &quot;Give me 45-minute workouts that actually
                    progress.&quot;
                  </span>
                  <span className={styles.charCount}>
                    {formData.expectation_free_text?.length || 0} / 500
                  </span>
                </div>
              </div>
            )}

            {/* Exercise Suggestion */}
            {!showExerciseSuggestion ? (
              <button
                type="button"
                onClick={() => setShowExerciseSuggestion(true)}
                className={styles.tellUsMoreLink}
              >
                Want to suggest an exercise we should add? (optional)
              </button>
            ) : (
              <div className={styles.exerciseSuggestionSection}>
                <label htmlFor="exercise_suggestion" className={styles.exerciseSuggestionLabel}>
                  Want to suggest an exercise we should add? (optional)
                </label>
                <input
                  id="exercise_suggestion"
                  type="text"
                  value={formData.exercise_suggestion || ''}
                  onChange={e => handleExerciseSuggestionChange(e.target.value)}
                  onBlur={handleExerciseSuggestionSave}
                  className={styles.exerciseSuggestionInput}
                  placeholder="Example: Sled push, Copenhagen plank, Jefferson curl…"
                />
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <Button
              type="button"
              variant="primary"
              size="lg"
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSubmitting || isUploadingImage || !canSubmit}
              loading={isSubmitting || isUploadingImage}
            >
              {isUploadingImage ? 'Uploading image...' : isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
