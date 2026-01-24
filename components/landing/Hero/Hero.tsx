'use client'

import React from 'react'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Dumbbell, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { FloatingIcons } from './FloatingIcons'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import posthog from 'posthog-js'
import { trackButtonClick, analytics } from '@/lib/analytics'
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
      <div className={styles.heroContent}>
        <div className={styles.heroText} data-aos="fade-up">
          {/* Trust Badges / SEO Hook */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-fade-in-up will-change-[transform,opacity]">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Vetted by U.S. Army Master Fitness Trainer.
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium animate-fade-in-up will-change-[transform,opacity]"
              style={{ animationDelay: '100ms' }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              100% Hallucination-Free.
            </div>
          </div>
          <h1 className={styles.heroTitle}>
            Stop Guessing. <span className="text-white">Start Growing.</span>
            <br />
            <span className={styles.gradientText}>The Science-Based AI Workout Generator.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Instantly build personalized <strong>Hypertrophy & Strength</strong> cycles tailored to
            your equipment. Our <strong>Closed-Loop Engine</strong> eliminates algorithmic errors,
            ensuring every rep is biomechanically valid and safe.
          </p>
          <div className={styles.heroActions}>
            <div className={styles.ctaLink} data-aos="fade-up" data-aos-delay="100">
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className={styles.shimmerButton}
                onClick={() => {
                  // Track the event
                  analytics.trackIntroStartBuilding()
                  trackButtonClick('Build My Free Custom Plan', 'hero')

                  // PostHog: Track hero CTA click - top of funnel event
                  posthog.capture('hero_generate_workout_clicked', {
                    button_text: 'Build My Free Custom Plan',
                    location: 'hero',
                  })

                  // Scroll to the workout builder section after tracking
                  const workoutBuilderSection = document.getElementById('workout-builder')
                  if (workoutBuilderSection) {
                    workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
              >
                Build My Free Custom Plan
              </Button>
            </div>
            <div className={styles.demoButtonWrapper} data-aos="fade-up" data-aos-delay="200">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  // Track the event
                  analytics.trackIntroLearnMore()
                  trackButtonClick('See the Logic', 'hero')

                  // PostHog: Track hero secondary CTA click
                  posthog.capture('hero_see_how_it_works_clicked', {
                    button_text: 'See the Logic',
                    location: 'hero',
                  })

                  // Scroll to the journey section after tracking
                  const journeySection = document.getElementById('journey')
                  if (journeySection) {
                    journeySection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
                className={styles.seeHowItWorksButton}
              >
                See the Logic
              </Button>
            </div>
          </div>
          {/* <CredibilityCard /> */}{' '}
          {/* Commented out - testing showed fewer signups with this component */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <p className={styles.statNumber}>8,000+</p>
              <p className={styles.statLabel}>Athletes Optimized</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statNumber}>15k+</p>
              <p className={styles.statLabel}>Plans Generated</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statNumber}>4.9/5</p>
              <p className={styles.statLabel}>TrustPilot Score</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statNumber}>Zero</p>
              <p className={styles.statLabel}>Hallucinations</p>
            </div>
          </div>
        </div>
      </div>
      {/* Feature Highlights Section */}
      <div className={styles.featureHighlights}>
        <div className={styles.featureHighlightsContainer}>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconBlue}`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className={styles.featureTitle}>Anti-Hallucination Engine</p>
              <p className={styles.featureDescription}>Biomechanically verified exercises only.</p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconGreen}`}>
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <p className={styles.featureTitle}>Equipment Adaptive</p>
              <p className={styles.featureDescription}>Dumbbells, Bodyweight, or Full Gym.</p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconPurple}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className={styles.featureTitle}>Progressive Overload</p>
              <p className={styles.featureDescription}>Smart volume scaling & periodization.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
