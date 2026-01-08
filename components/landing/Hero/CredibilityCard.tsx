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
      <div className={styles.credibilityImageHolder}>
        <Image
          src="/Justin Profile Section 1.png"
          alt="Justin Fassio"
          fill
          className={styles.thumbnailImageSquare}
        />
      </div>
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
      </div>
      <div className={styles.credibilityCta}>
        <Button variant="secondary" size="sm" onClick={handleFounderStoryClick}>
          Founder Story
        </Button>
      </div>
    </div>
  )
}
