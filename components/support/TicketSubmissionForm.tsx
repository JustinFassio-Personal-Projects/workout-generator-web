'use client'

import React, { useState, useEffect, useRef } from 'react'
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

interface FormData {
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  email: string
}

interface Metadata {
  source: 'website'
  source_url?: string // Current page URL
  device_type?: 'mobile' | 'desktop' | 'tablet'
  subscription_tier?: string // If user is authenticated
  utm_params?: Record<string, string> // From URL query params
}

export const TicketSubmissionForm: React.FC<TicketSubmissionFormProps> = ({ isOpen, onClose }) => {
  const { user, loading: userLoading } = useSupabaseUser()
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
    email: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Auto-fill email if user is authenticated
  useEffect(() => {
    if (user && !userLoading && !formData.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
      }))
    }
  }, [user, userLoading, formData.email])

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
      subscription_tier: undefined, // TODO: Get from user profile if available
      utm_params: Object.keys(parseUTMParams()).length > 0 ? parseUTMParams() : undefined,
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
    if (!formData.subject.trim()) {
      setError('Subject is required')
      return
    }

    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }

    // Email validation (required if not authenticated)
    if (!user && !formData.email.trim()) {
      setError('Email is required')
      return
    }

    if (formData.email && !validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const metadata = collectMetadata()

      const response = await fetch('/api/support/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          email: formData.email.trim() || user?.email || '',
          metadata,
          website: '', // Honeypot field (must be empty for spam protection)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ticket')
      }

      setSuccess(true)
      // Reset form
      setFormData({
        subject: '',
        description: '',
        category: 'technical',
        priority: 'medium',
        email: user?.email || '',
      })

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
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
              Send Feedback
            </h2>
            <p className={styles.subtitle}>Support, bug reports, and feature requests</p>
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

        <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className={styles.successMessage} role="alert">
              Thank you! Your feedback has been submitted successfully.
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="subject" className={styles.label}>
              Subject <span className={styles.required}>*</span>
            </label>
            <input
              ref={firstInputRef}
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Brief description of your feedback"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
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
              <option value="technical">Technical Support</option>
              <option value="bug">Bug Report</option>
              <option value="feature_request">Feature Request</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="priority" className={styles.label}>
              Priority <span className={styles.required}>*</span>
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={isSubmitting}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Please provide as much detail as possible..."
              rows={6}
              required
              disabled={isSubmitting}
            />
          </div>

          {!user && (
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email <span className={styles.required}>*</span>
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
          )}

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Submit Feedback
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
