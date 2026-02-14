'use client'

import React, { useState, useCallback } from 'react'
import { Turnstile } from '@/components/landing/ExerciseChallenge/Turnstile'
import styles from './ReportV2LiveDemo.module.scss'

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}

export const ReportV2LiveDemo: React.FC = () => {
  const [goal, setGoal] = useState<string>('Hypertrophy (Muscle Growth)')
  const [level, setLevel] = useState<string>('Beginner (0-1 years)')
  const [equipment, setEquipment] = useState<string>('Full Commercial Gym')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [workout, setWorkout] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_REPORTS_SITE_KEY as string | undefined

  // Memoize callbacks to prevent Turnstile re-renders
  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token)
    setError(null) // Clear any previous errors
  }, [])

  const handleTurnstileError = useCallback(() => {
    setError('Captcha verification failed. Please try again.')
    setTurnstileToken(null)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null)
  }, [])

  const generateWorkout = async () => {
    // Client-side validation
    if (!turnstileToken) {
      setError('Please complete the captcha verification')
      return
    }

    setLoading(true)
    setError(null)
    setWorkout(null)

    try {
      const response = await fetch('/api/reports/gemini-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal,
          level,
          equipment,
          turnstile_token: turnstileToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to generate workout'

        // Handle specific error cases
        if (response.status === 400) {
          if (errorMessage.includes('Captcha')) {
            setError('Captcha verification failed. Please try again.')
            setTurnstileToken(null) // Reset Turnstile on failure
          } else {
            setError(errorMessage)
          }
        } else if (response.status === 429) {
          setError('You have already generated a workout. Please try again tomorrow.')
        } else {
          setError(errorMessage)
        }
        return
      }

      const data = await response.json()

      // Format the workout text - replace **text** with <strong> tags
      let formattedText = data.workout
        .replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>')
        .replace(/\n\*/g, '\n•')

      setWorkout(formattedText)

      // PostHog: Track workout_viewed when workout is displayed/viewed (optional)
      try {
        if (typeof window !== 'undefined' && window.posthog) {
          window.posthog.capture('workout_viewed', {
            goal,
            level,
            equipment,
            location: 'reports_live_demo',
          })
        }
      } catch (posthogError) {
        console.warn('PostHog tracking error:', posthogError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection interrupted. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.badge}>Live Preview</span>
        <h2 className={styles.title}>
          Generate a "System" Plan <span className={styles.titleAccent}>Instantly</span>
        </h2>
        <p className={styles.description}>
          Experience the difference between a generic output and a <strong>System-Based</strong>{' '}
          prescription. Our engine doesn't just list exercises; it calculates <strong>Tempo</strong>
          , <strong>RPE</strong>, and <strong>Rest</strong> to drive specific physiological
          adaptations.
        </p>
      </div>

      <div className={styles.formCard}>
        <div className={styles.inputGrid}>
          <div>
            <label className={styles.label}>Primary Goal</label>
            <select
              id="gemini-goal"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className={styles.select}
            >
              <option value="Hypertrophy (Muscle Growth)">Hypertrophy (Build Muscle)</option>
              <option value="Maximum Strength">Max Strength (Powerlifting)</option>
              <option value="Fat Loss & Conditioning">Fat Loss & Conditioning</option>
              <option value="Mobility & Stability">Mobility & Stability</option>
            </select>
          </div>

          <div>
            <label className={styles.label}>Experience Level</label>
            <select
              id="gemini-level"
              value={level}
              onChange={e => setLevel(e.target.value)}
              className={styles.select}
            >
              <option value="Beginner (0-1 years)">Beginner (0-1 years)</option>
              <option value="Intermediate (1-3 years)">Intermediate (1-3 years)</option>
              <option value="Advanced (3+ years)">Advanced (3+ years)</option>
            </select>
          </div>

          <div>
            <label className={styles.label}>Equipment</label>
            <select
              id="gemini-equip"
              value={equipment}
              onChange={e => setEquipment(e.target.value)}
              className={styles.select}
            >
              <option value="Full Commercial Gym">Full Commercial Gym</option>
              <option value="Dumbbells & Bench Only">Dumbbells & Bench Only</option>
              <option value="Bodyweight Only">Bodyweight Only</option>
            </select>
          </div>
        </div>

        {!turnstileSiteKey ? (
          <div className={styles.error}>
            Turnstile site key is not configured. Please add{' '}
            <code>NEXT_PUBLIC_TURNSTILE_REPORTS_SITE_KEY</code> to your environment variables.
          </div>
        ) : (
          <div className={styles.turnstileContainer}>
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={handleTurnstileSuccess}
              onError={handleTurnstileError}
              onExpire={handleTurnstileExpire}
              size="normal"
            />
          </div>
        )}

        <button
          onClick={generateWorkout}
          disabled={loading || !turnstileToken}
          className={styles.generateButton}
        >
          <span>Generate System Session</span>
          <span className={styles.sparkle}>✨</span>
        </button>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.loader}></div>
            <p className={styles.loadingText}>Consulting the Algorithmic Core...</p>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {workout && (
          <div className={styles.result}>
            <div className={styles.resultBadge}>Generated by Gemini 2.5 Flash</div>
            <div className={styles.resultContent} dangerouslySetInnerHTML={{ __html: workout }} />
          </div>
        )}
      </div>
    </div>
  )
}
