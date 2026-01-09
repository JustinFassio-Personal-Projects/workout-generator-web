'use client'

import React from 'react'
import { Button } from '@/components/ui/Button/Button'
import { trackButtonClick } from '@/lib/analytics'
import styles from './Hero.module.scss'

export const CredibilityCard: React.FC = () => {
  const handleFounderStoryClick = () => {
    trackButtonClick('Founder Story', 'credibility-card')
    const bioSection = document.getElementById('bio')
    if (bioSection) {
      bioSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className={styles.credibilityCard}>
      {/* Image Section - Full-bleed background */}
      <div className={styles.credibilityImageSection} />

      {/* Content Section */}
      <div className={styles.credibilityContent}>
        <p className={styles.credibilityText}>
          Built from 30 years in fitness and 20+ years in tech — designed to deliver smarter, safer,
          truly personalized workouts.
        </p>
        <p className={styles.credibilityAttribution}>
          — Justin Fassio
          <br />
          Product Designer & Certified Personal Trainer
        </p>

        {/* CTA - Inside card, bottom right */}
        <div className={styles.credibilityCta}>
          <Button variant="secondary" size="md" onClick={handleFounderStoryClick}>
            Founder Story
          </Button>
        </div>
      </div>
    </div>
  )
}
