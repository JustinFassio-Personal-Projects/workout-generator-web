'use client'

import React from 'react'
import Image from 'next/image'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { FloatingIcons } from './FloatingIcons'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import { CredibilityCard } from './CredibilityCard'
import { trackButtonClick } from '@/lib/analytics'
import styles from './Hero.module.scss'

export const Hero: React.FC = () => {
  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.heroBackground}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/ai_workout_generator_hero_1.png"
            alt="AI-powered workout generator showing personalized fitness plan interface"
            fill
            priority
            quality={85}
            className={styles.heroImage}
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
      </div>
      <LogoWatermark position="bottom-right" opacity={0.06} size={400} rotation={-15} />
      <FloatingIcons />
      <div className={styles.heroLogo}>
        <Image
          src="/logo.png"
          alt="AI Workout Generator"
          width={200}
          height={80}
          className={styles.logoImage}
          priority
        />
      </div>
      <div className={styles.heroContent}>
        <div className={styles.heroText} data-aos="fade-up">
          <div className={styles.heroBrandMark}>AIWorkoutGenerator™</div>
          <h1 className={styles.heroTitle}>
            AI Workout Generator for Personalized Strength & Conditioning —{' '}
            <span className={styles.gradientText}>Built by Certified Trainers</span>
          </h1>
          <div className={styles.heroActions}>
            <div className={styles.ctaLink} data-aos="fade-up" data-aos-delay="100">
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                onClick={() => {
                  trackButtonClick('Generate My AI Workout', 'hero')
                  const workoutBuilderSection = document.getElementById('workout-builder')
                  if (workoutBuilderSection) {
                    workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
              >
                Generate My AI Workout
              </Button>
            </div>
            <div className={styles.demoButtonWrapper} data-aos="fade-up" data-aos-delay="200">
              <Button
                variant="secondary"
                size="lg"
                icon={Play}
                iconPosition="left"
                onClick={() => {
                  trackButtonClick('Watch How It Works', 'hero')
                  const videosSection = document.getElementById('videos')
                  if (videosSection) {
                    videosSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
              >
                Watch How It Works
              </Button>
            </div>
          </div>
          <h2 className={styles.heroH2}>
            Smart, safe workout plans powered by adaptive AI — grounded in real coaching experience
          </h2>
          <p className={styles.heroSubtitle}>
            Create adaptive workout plans that evolve with your progress, goals, and equipment —
            based on real training principles, not random AI guesses.
          </p>
          <CredibilityCard />
          <div className={styles.heroStats}>
            Trained 8,000+ athletes • 15,000+ workouts generated • 4.9★ average rating
          </div>
        </div>
      </div>
    </section>
  )
}
