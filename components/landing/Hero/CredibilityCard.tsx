'use client'

import React from 'react'
import Image from 'next/image'
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
      {/* Image Section */}
      <div className={styles.credibilityImageSection}>
        <Image
          src="/justin-fassio-ai-workout-generator-founder-san-diego-trainer.jpg"
          alt="Justin Fassio - Certified Personal Trainer and Founder of AIWorkoutGenerator in San Diego, CA"
          fill
          priority
          quality={90}
          className={styles.credibilityImage}
          sizes="(max-width: 968px) 240px, 40vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
      </div>

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
