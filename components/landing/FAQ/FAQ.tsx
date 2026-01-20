'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import { faqItems } from '@/data/faq'
import { Accordion } from '@/components/ui/Accordion/Accordion'
import type { AccordionItem } from '@/components/ui/Accordion/Accordion'
import { Button } from '@/components/ui/Button/Button'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import posthog from 'posthog-js'
import { trackButtonClick } from '@/lib/analytics'
import styles from './FAQ.module.scss'

export const FAQ: React.FC = () => {
  const handleButtonClick = (buttonText: string) => {
    trackButtonClick(buttonText, 'faq')

    // PostHog: Track FAQ CTA click
    posthog.capture('faq_cta_clicked', {
      button_text: buttonText,
      location: 'faq',
    })

    const workoutBuilderSection = document.getElementById('workout-builder')
    if (workoutBuilderSection) {
      workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleCTAClick = () => {
    trackButtonClick('Generate My AI Workout', 'faq_cta')

    // PostHog: Track FAQ section CTA click
    posthog.capture('faq_section_cta_clicked', {
      button_text: 'Generate My AI Workout',
      location: 'faq_section',
    })

    const workoutBuilderSection = document.getElementById('workout-builder')
    if (workoutBuilderSection) {
      workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Map FAQ items to Accordion items with button handlers
  const accordionItems: AccordionItem[] = faqItems.map(item => {
    const buttonText = item.buttonText
    return {
      id: item.id,
      question: item.question,
      answer: item.answer,
      buttonText,
      onButtonClick: buttonText ? () => handleButtonClick(buttonText) : undefined,
    }
  })

  return (
    <section id="faq" className={styles.faq}>
      <LogoWatermark position="top-right" opacity={0.04} size={300} rotation={-10} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Frequently Asked
            <span className={styles.gradientText}> Questions</span>
          </h2>
          <p className={styles.subtitle}>Quick answers to help you get started with confidence.</p>
        </div>
        <Accordion items={accordionItems} />

        {/* CTA Section */}
        <div className={styles.ctaSection} data-aos="fade-up" data-aos-delay="100">
          <div className={styles.ctaContent}>
            <h3 className={styles.ctaTitle}>Ready to get started?</h3>
            <p className={styles.ctaSubtitle}>
              Generate your personalized AI workout plan in under 2 minutes.
            </p>
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              onClick={handleCTAClick}
              className={styles.ctaButton}
            >
              Generate My AI Workout
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
