'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import classNames from 'classnames'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { Button } from '@/components/ui/Button/Button'
import styles from './TicketSubmissionForm.module.scss'

export interface TicketSubmissionFormProps {
  isOpen: boolean
  onClose: () => void
}

type TicketCategory = 'Support' | 'Bug Report' | 'Feature Request' | 'Other'

interface FormData {
  subject: string
  description: string
  category: TicketCategory
  email: string
}

interface Metadata {
  source: string
  current_url: string
  utm_params: Record<string, string>
  device_type: string
  user_email: string | null
  supabase_user_id: string | null
}

export const TicketSubmissionForm: React.FC<TicketSubmissionFormProps> = ({ isOpen, onClose }) => {
  const { user, loading: userLoading } = useSupabaseUser()
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    description: '',
    category: 'Support',
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
      const originalOverflow = document.body.style.overflow
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
        document.body.style.overflow = originalOverflow
        // Restore focus when modal closes
        previousFocus?.focus()
      }
    }
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
  const detectDeviceType = (): string => {
    if (typeof window === 'undefined') return 'unknown'

    const ua = navigator.userAgent.toLowerCase()
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return 'mobile'
    }
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet'
    }
    return 'desktop'
  }

  // Collect metadata
  const collectMetadata = (): Metadata => {
    return {
      source: 'website',
      current_url: typeof window !== 'undefined' ? window.location.href : '',
      utm_params: parseUTMParams(),
      device_type: detectDeviceType(),
      user_email: user?.email || null,
      supabase_user_id: user?.id || null,
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

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
          email: formData.email.trim() || user?.email || '',
          ...metadata,
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
        category: 'Support',
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
              <option value="Support">Support</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Other">Other</option>
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
