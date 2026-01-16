'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LeadGate } from '@/components/landing/ExerciseChallenge/LeadGate'
import { VisionLabIframe } from '@/components/landing/ExerciseChallenge/VisionLabIframe'
import { MicroInterview } from '@/components/landing/ExerciseChallenge/MicroInterview'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import posthog from 'posthog-js'
import { analytics } from '@/lib/analytics'
import styles from './page.module.scss'

export default function ExerciseChallengePage() {
  const router = useRouter()
  const [leadId, setLeadId] = useState<string | null>(null)
  const [microInterviewComplete, setMicroInterviewComplete] = useState(false)
  const [showMicroInterview, setShowMicroInterview] = useState(false)
  const [visionPrompt, setVisionPrompt] = useState<string | undefined>(undefined)
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Track page view with metadata
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null
    const referrer = typeof document !== 'undefined' ? document.referrer : undefined
    analytics.trackVisionLabViewed({
      path: url?.pathname,
      referrer: referrer || undefined,
      utm_source: url?.searchParams.get('utm_source') || undefined,
      utm_campaign: url?.searchParams.get('utm_campaign') || undefined,
      utm_medium: url?.searchParams.get('utm_medium') || undefined,
    })
  }, [])

  const handleLeadCaptured = (capturedLeadId: string) => {
    setLeadId(capturedLeadId)
  }

  const handleGenerationStarted = (prompt?: string) => {
    setVisionPrompt(prompt)
    setShowMicroInterview(true)
  }

  // Phase 1 fallback: Show micro-interview when iframe loads
  useEffect(() => {
    if (leadId && !showMicroInterview) {
      // Show micro-interview after a short delay to let iframe load
      const timer = setTimeout(() => {
        setShowMicroInterview(true)
      }, 2000) // 2 second delay to let iframe start loading
      return () => clearTimeout(timer)
    }
  }, [leadId, showMicroInterview])

  const handleGenerationCompleted = (imageUrl?: string) => {
    // Store the image URL when generation completes
    if (imageUrl) {
      setImageUrl(imageUrl)
    }
  }

  const handleMicroInterviewComplete = () => {
    setMicroInterviewComplete(true)
  }

  const handleCtaGenerateWorkout = () => {
    if (leadId) {
      analytics.trackVisionCtaGenerateWorkoutClicked(leadId)
    }

    // PostHog: Track Vision Lab CTA click
    posthog.capture('vision_lab_cta_clicked', {
      cta_type: 'generate_workout',
      lead_id: leadId,
      location: 'vision_lab_success',
    })

    // Navigate to workout plan builder section on landing page
    router.push('/#workout-builder')
    // Scroll to element after navigation completes (Next.js router handles hash but we ensure smooth scroll)
    setTimeout(() => {
      const element = document.getElementById('workout-builder')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 150)
  }

  const handleCtaViewPricing = () => {
    if (leadId) {
      analytics.trackVisionCtaViewPricingClicked(leadId)
    }

    // PostHog: Track Vision Lab CTA click
    posthog.capture('vision_lab_cta_clicked', {
      cta_type: 'view_pricing',
      lead_id: leadId,
      location: 'vision_lab_success',
    })

    // Navigate to pricing section
    router.push('/#pricing')
    // Scroll to element after navigation completes (Next.js router handles hash but we ensure smooth scroll)
    setTimeout(() => {
      const element = document.getElementById('pricing')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 150)
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Fitcopilot Vision Lab</h1>
          <p className={styles.heroSubtitle}>
            Visualize technique — then tell us what you&apos;d expect from an AI workout generator.
          </p>
        </section>

        {/* Lead Gate */}
        {!leadId && (
          <section className={styles.leadGateSection}>
            <LeadGate onLeadCaptured={handleLeadCaptured} />
          </section>
        )}

        {/* Vision Lab and Micro-Interview */}
        {leadId && !microInterviewComplete && (
          <>
            <section className={styles.visionLabSection}>
              <VisionLabIframe
                leadId={leadId}
                onGenerationStarted={handleGenerationStarted}
                onGenerationCompleted={handleGenerationCompleted}
              />
            </section>

            {/* Show micro-interview when generation starts or after iframe loads (Phase 1 fallback) */}
            {showMicroInterview && (
              <section className={styles.microInterviewSection}>
                <MicroInterview
                  leadId={leadId}
                  visionPrompt={visionPrompt}
                  imageUrl={imageUrl}
                  onComplete={handleMicroInterviewComplete}
                />
              </section>
            )}
          </>
        )}

        {/* Success State */}
        {microInterviewComplete && (
          <section className={styles.successSection}>
            <Card variant="default" className={styles.successCard}>
              <div className={styles.successContent}>
                <h2 className={styles.successTitle}>Thanks — this helps a ton.</h2>
                <p className={styles.successMessage}>
                  If you opted in, we&apos;ll email you a starter plan based on your answers.
                </p>
                <div className={styles.successActions}>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCtaGenerateWorkout}
                    className={styles.ctaButton}
                  >
                    Generate a workout now
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleCtaViewPricing}
                    className={styles.ctaButton}
                  >
                    View pricing
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        )}
      </div>
    </main>
  )
}
