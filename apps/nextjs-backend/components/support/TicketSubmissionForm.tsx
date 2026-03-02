'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import classNames from 'classnames'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { Button } from '@/components/ui/Button/Button'
import { validateEmail } from '@/lib/validation'
import styles from './TicketSubmissionForm.module.scss'

export interface TicketSubmissionFormProps {
  isOpen: boolean
  onClose: () => void
}

// Admin-expected category values
type TicketCategory = 'billing' | 'technical' | 'feature_request' | 'bug' | 'other'

// Admin-expected priority values
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

// User-friendly intent types
type IntentType = 'generate_first_workout' | 'fix_workout' | 'plan_help' | 'something_broken' | null

interface FormData {
  intent: IntentType
  description: string
  email: string
  name: string
}

interface Metadata {
  source: 'website'
  source_url?: string // Current page URL
  device_type?: 'mobile' | 'desktop' | 'tablet'
  subscription_tier?: string // If user is authenticated
  utm_params?: Record<string, string> // From URL query params
  intent?: IntentType // User's selected intent (for admin visibility)
}

export const TicketSubmissionForm: React.FC<TicketSubmissionFormProps> = ({ isOpen, onClose }) => {
  const { user, loading: userLoading } = useSupabaseUser()
  const [formData, setFormData] = useState<FormData>({
    intent: null,
    description: '',
    email: '',
    name: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const firstInputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-fill email and name if user is authenticated
  useEffect(() => {
    if (user && !userLoading) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      }))
    }
  }, [user, userLoading])

  // Focus management when modal opens
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      const previousFocus = document.activeElement as HTMLElement

      // Focus first input after a short delay
      setTimeout(() => {
        firstInputRef.current?.focus()
      }, 100)

      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow || ''
      document.body.style.overflow = 'hidden'

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSubmitting) {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)

      return () => {
        document.removeEventListener('keydown', handleEscape)
        // Always restore body overflow, defaulting to empty string if it was empty
        document.body.style.overflow = originalOverflow || ''
        // Restore focus when modal closes
        previousFocus?.focus()
      }
    }
    // No else block needed - cleanup function handles restoration when isOpen changes to false
  }, [isOpen, onClose, isSubmitting])

  // Parse UTM parameters from URL
  const parseUTMParams = (): Record<string, string> => {
    if (typeof window === 'undefined') return {}

    const params = new URLSearchParams(window.location.search)
    const utmParams: Record<string, string> = {}

    params.forEach((value, key) => {
      if (key.startsWith('utm_')) {
        utmParams[key] = value
      }
    })

    return utmParams
  }

  // Detect device type from user agent
  const detectDeviceType = (): 'mobile' | 'desktop' | 'tablet' => {
    if (typeof window === 'undefined') return 'desktop'

    const ua = navigator.userAgent.toLowerCase()
    // Check for tablets first (before mobile) to correctly categorize iPads
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet'
    }
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return 'mobile'
    }
    return 'desktop'
  }

  // Collect metadata
  const collectMetadata = (): Metadata => {
    return {
      source: 'website',
      source_url: typeof window !== 'undefined' ? window.location.href : undefined,
      device_type: detectDeviceType(),
      subscription_tier:
        user?.user_metadata?.subscription_tier ||
        user?.app_metadata?.subscription_tier ||
        undefined,
      utm_params: Object.keys(parseUTMParams()).length > 0 ? parseUTMParams() : undefined,
    }
  }

  // Get dynamic placeholder based on selected intent
  const getPlaceholder = (intent: IntentType): string => {
    switch (intent) {
      case 'generate_first_workout':
        return "Tell us your goal + what equipment you have (or 'none'). Example: 'Lose fat, dumbbells at home, 30 min, 3 days/week.'"
      case 'fix_workout':
        return 'What felt off — too hard/easy, too long, wrong equipment, pain? If you can, paste the workout link or describe the exercises.'
      case 'plan_help':
        return 'How many workouts per month do you need? What features matter most? We will recommend the best subscription plan for you.'
      case 'something_broken':
        return 'What were you trying to do when it failed? Any error message? What device/browser?'
      default:
        return 'Ask your question here...'
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!formData.intent) {
      setError('Please select what you need help with')
      return
    }

    const trimmedMessage = formData.description.trim()
    if (!trimmedMessage) {
      setError('Your question is required')
      return
    }

    if (trimmedMessage.length < 10) {
      setError('Please provide more details (at least 10 characters)')
      return
    }

    // Email validation (always required)
    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const metadata = collectMetadata()

      // Ensure email is provided (should be validated already, but double-check)
      const emailToSend = formData.email.trim() || user?.email
      if (!emailToSend) {
        setError('Email is required')
        setIsSubmitting(false)
        return
      }

      // Map intent to category
      const intentToCategory: Record<string, TicketCategory> = {
        something_broken: 'bug',
        plan_help: 'other', // 'plan' is ambiguous (could be subscription or workout plan)
        fix_workout: 'bug', // Workout fixes are typically bugs (incorrect generation) not feature requests
        generate_first_workout: 'other',
      }
      const category = intentToCategory[formData.intent] || 'other'

      // Auto-generate subject
      const intentLabels: Record<string, string> = {
        generate_first_workout: 'Generate my first workout',
        fix_workout: 'Fix my workout',
        plan_help: 'Which plan should I choose?',
        something_broken: "Something isn't working",
      }
      const intentLabel = intentLabels[formData.intent] || 'Question'
      const messagePreview = trimmedMessage.substring(0, 60)
      const subject = `${intentLabel}: ${messagePreview}${messagePreview.length === 60 ? '...' : ''}`

      // Set default priority
      const priority: TicketPriority = 'medium'

      const requestPayload = {
        subject, // Auto-generated
        description: trimmedMessage,
        category, // Mapped from intent
        priority, // Always 'medium'
        email: emailToSend, // Use validated email (never empty string)
        name: formData.name.trim(),
        metadata: {
          ...metadata, // Existing metadata (source, source_url, device_type, utm_params)
          intent: formData.intent, // Add intent to metadata for admin visibility
        },
        website: '', // Honeypot field (must be empty for spam protection)
      }

      const response = await fetch('/api/support/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      // Parse response - use response.json() directly with error handling
      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        // If JSON parsing fails, try reading as text for error cases
        try {
          const responseText = await response.text()
          data = { error: responseText || 'Failed to parse response' }
        } catch (textError) {
          data = { error: 'Failed to parse response' }
        }
      }

      if (!response.ok) {
        // Log detailed error for debugging (sanitized to avoid exposing sensitive data)
        console.error('[Support Form] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          // Only log details in development, and sanitize if present
          ...(process.env.NODE_ENV === 'development' && data.details
            ? {
                details:
                  typeof data.details === 'string' ? data.details.substring(0, 200) : 'Object',
              }
            : {}),
        })

        throw new Error(data.error || data.message || 'Failed to submit ticket')
      }

      setSuccess(true)
      // Don't reset form yet - let user see success message
      // Form will be reset when they click "Ask another question" or close
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={styles.overlay}
        onClick={onClose}
        aria-hidden="true"
        data-testid="ticket-form-overlay"
      />

      {/* Modal */}
      <div
        className={classNames(styles.modal, {
          [styles['modal--open']]: isOpen,
        })}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-form-title"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 id="ticket-form-title" className={styles.title}>
              Need help with your workout?
            </h2>
            <p className={styles.subtitle}>
              Ask anything — workouts, goals, equipment, or pricing. We&apos;ll reply by email.
            </p>
            <div className={styles.trustLines}>
              <span className={styles.trustLine}>Real human replies</span>
              <span className={styles.trustLine}>Usually within 1 business day</span>
              <span className={styles.trustLine}>No spam</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.profileThumbnail}>
              <Image
                src="/Justin Profile Square.png"
                alt="Justin"
                width={48}
                height={48}
                className={styles.profileImage}
              />
            </div>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close feedback form"
              type="button"
              disabled={isSubmitting}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className={styles.successMessage} role="alert">
              <h3 className={styles.successTitle}>Sent.</h3>
              <p className={styles.successBody}>
                We&apos;ll reply to <strong>{formData.email}</strong>. Usually within 1 business
                day.
              </p>
              <div className={styles.successActions}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setSuccess(false)
                    setFormData({
                      intent: null,
                      description: '',
                      email: user?.email || '',
                      name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
                    })
                  }}
                >
                  Ask another question
                </Button>
              </div>
            </div>
          )}

          {!success && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  What do you need help with? <span className={styles.required}>*</span>
                </label>
                <div className={styles.intentSelector}>
                  <button
                    type="button"
                    className={classNames(styles.intentButton, {
                      [styles['intentButton--selected']]:
                        formData.intent === 'generate_first_workout',
                    })}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, intent: 'generate_first_workout' }))
                      setError(null)
                    }}
                    disabled={isSubmitting}
                  >
                    Generate my first workout
                  </button>
                  <button
                    type="button"
                    className={classNames(styles.intentButton, {
                      [styles['intentButton--selected']]: formData.intent === 'fix_workout',
                    })}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, intent: 'fix_workout' }))
                      setError(null)
                    }}
                    disabled={isSubmitting}
                  >
                    Fix my workout
                  </button>
                  <button
                    type="button"
                    className={classNames(styles.intentButton, {
                      [styles['intentButton--selected']]: formData.intent === 'plan_help',
                    })}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, intent: 'plan_help' }))
                      setError(null)
                    }}
                    disabled={isSubmitting}
                  >
                    Which plan should I choose?
                  </button>
                  <button
                    type="button"
                    className={classNames(styles.intentButton, {
                      [styles['intentButton--selected']]: formData.intent === 'something_broken',
                    })}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, intent: 'something_broken' }))
                      setError(null)
                    }}
                    disabled={isSubmitting}
                  >
                    Something isn&apos;t working
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.label}>
                  Your question <span className={styles.required}>*</span>
                </label>
                <textarea
                  ref={firstInputRef}
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder={getPlaceholder(formData.intent)}
                  rows={6}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {!success && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email (so we can reply) <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="your.email@example.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {!success && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Your name"
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  Send question
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  )
}
