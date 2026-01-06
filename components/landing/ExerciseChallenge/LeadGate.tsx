'use client'

import React, { FormEvent, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button/Button'
import { Card } from '@/components/ui/Card/Card'
import { validateEmail } from '@/lib/validation'
import { analytics } from '@/lib/analytics'
import { Turnstile } from './Turnstile'
import type { CreateLeadResponse } from '@/types/exercise-challenge'
import styles from './LeadGate.module.scss'

interface LeadGateProps {
  onLeadCaptured: (leadId: string) => void
}

export const LeadGate: React.FC<LeadGateProps> = ({ onLeadCaptured }) => {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [consentEmailPlan, setConsentEmailPlan] = useState(true) // Default ON
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    analytics.trackVisionLeadGateOpened()
  }, [])

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError(null)
    }
  }

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!firstName.trim()) {
      setError('First name is required')
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!turnstileToken) {
      setError('Please complete the captcha verification')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim().toLowerCase(),
          consent_email_plan: consentEmailPlan,
          consent_follow_up: false, // Keep for backward compat
          coaching_interest: false, // Keep for backward compat
          turnstile_token: turnstileToken,
          source: 'vision_lab',
        }),
      })

      const data: CreateLeadResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit lead information')
      }

      // Extract email domain for analytics
      const emailDomain = email.trim().toLowerCase().split('@')[1] || 'unknown'
      analytics.trackVisionLeadSubmitted(data.lead_id, emailDomain, consentEmailPlan)
      onLeadCaptured(data.lead_id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!turnstileSiteKey) {
    return (
      <Card variant="default" className={styles.card}>
        <div className={styles.error}>
          <p>
            <strong>Captcha configuration error.</strong>
          </p>
          <p style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
            Turnstile site key is not configured. Please add{' '}
            <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> to your environment variables. See README
            for setup instructions.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="default" className={styles.card}>
      <div className={styles.content}>
        <h2 className={styles.title}>Before you start</h2>
        <p className={styles.subtitle}>
          Enter your name and email so we can send your visual + a starter plan based on your
          answers.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="first_name" className={styles.label}>
              First Name <span className={styles.required}>*</span>
            </label>
            <input
              id="first_name"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className={styles.input}
              required
              disabled={isSubmitting}
              placeholder="Enter your first name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email <span className={styles.required}>*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`${styles.input} ${emailError ? styles.inputError : ''}`}
              required
              disabled={isSubmitting}
              placeholder="Enter your email"
            />
            {emailError && <span className={styles.fieldError}>{emailError}</span>}
          </div>

          <div className={styles.checkboxes}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={consentEmailPlan}
                onChange={e => setConsentEmailPlan(e.target.checked)}
                disabled={isSubmitting}
                className={styles.checkbox}
              />
              <span>Email me my first plan based on these answers.</span>
            </label>
          </div>

          <div className={styles.turnstile}>
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={handleTurnstileSuccess}
              onError={handleTurnstileError}
              onExpire={handleTurnstileExpire}
              theme="auto"
              size="normal"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={styles.submitButton}
            disabled={isSubmitting || !turnstileToken}
            loading={isSubmitting}
          >
            Continue
          </Button>

          <p className={styles.privacyNote}>
            No spam. We&apos;ll only email about your results and product updates you opt into.
          </p>
        </form>
      </div>
    </Card>
  )
}
