'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button/Button'
import { Card } from '@/components/ui/Card/Card'
import { trackButtonClick } from '@/lib/analytics'
import styles from './ExerciseChallengeSection.module.scss'

export const ExerciseChallengeSection: React.FC = () => {
  const handleCTAClick = () => {
    trackButtonClick('Exercise Challenge CTA', 'homepage', {
      location: 'exercise_challenge_section',
    })
  }

  return (
    <section id="exercise-challenge" className={styles.section}>
      <div className={styles.container}>
        <Card variant="elevated" className={styles.card}>
          <div className={styles.content}>
            <h2 className={styles.title}>
              Help build the library <span className={styles.arrow}>→</span> win Pro
            </h2>
            <p className={styles.description}>
              Contribute exercises to our library and get rewarded. Submit an exercise, and if we
              publish it, you&apos;ll get free Pro access.
            </p>
            <Link href="/exercise-challenge" onClick={handleCTAClick}>
              <Button variant="primary" size="lg">
                Submit an Exercise
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  )
}
