'use client'

import React from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Card } from '@/components/ui/Card/Card'
import { FloatingIcons } from './FloatingIcons'
import styles from './Hero.module.scss'

export const Hero: React.FC = () => {
  return (
    <section id="hero" className={styles.hero}>
      <FloatingIcons />
      <div className={styles.heroContent}>
        <div className={styles.heroText} data-aos="fade-up">
          <h1 className={styles.heroTitle}>
            Transform Your Fitness Journey with
            <span className={styles.gradientText}> AI-Powered Workouts</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Generate personalized workout plans tailored to your goals, fitness level, and available
            equipment. Start your transformation today.
          </p>
          <div className={styles.heroActions}>
            <a
              href="https://builder.fitcopilot.ai"
              className={styles.ctaLink}
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                Get Started Free
              </Button>
            </a>
            <div className={styles.demoButtonWrapper} data-aos="fade-up" data-aos-delay="200">
              <Button variant="secondary" size="lg" icon={Play} iconPosition="left">
                Watch Demo
              </Button>
              <span className={styles.comingSoon}>(coming soon)</span>
            </div>
          </div>
        </div>
        <div className={styles.heroCard} data-aos="fade-up" data-aos-delay="300">
          <Card variant="strong" hover={false}>
            <div className={styles.cardContent}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>8K+</span>
                <span className={styles.statLabel}>Users</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>50K+</span>
                <span className={styles.statLabel}>Workouts Generated</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>4.9/5</span>
                <span className={styles.statLabel}>User Rating</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
