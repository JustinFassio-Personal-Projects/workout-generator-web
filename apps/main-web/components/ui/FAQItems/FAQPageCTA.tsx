'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import posthog from 'posthog-js'
import { trackButtonClick } from '@/lib/analytics'

export const FAQPageCTA: React.FC = () => {
  const router = useRouter()

  const handleCTAClick = () => {
    trackButtonClick('Generate My AI Workout', 'faq_page_cta')

    // PostHog: Track FAQ page CTA click
    posthog.capture('faq_page_cta_clicked', {
      button_text: 'Generate My AI Workout',
      location: 'faq_page',
    })

    // Check if we're on the home page
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      // Already on home page, scroll to section
      const workoutBuilderSection = document.getElementById('workout-builder')
      if (workoutBuilderSection) {
        workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      // Navigate to home page with hash, then scroll after navigation
      router.push('/#workout-builder')
      // Scroll to element after navigation completes
      setTimeout(() => {
        const element = document.getElementById('workout-builder')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 150)
    }
  }

  return (
    <div className="mt-16 text-center bg-[#0f172a] rounded-2xl p-8 md:p-12 shadow-sm border border-white/10">
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to get started?</h3>
      <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
        Generate your personalized AI workout plan in under 2 minutes.
      </p>
      <Button
        variant="primary"
        size="lg"
        icon={ArrowRight}
        iconPosition="right"
        onClick={handleCTAClick}
      >
        Generate My AI Workout
      </Button>
    </div>
  )
}
