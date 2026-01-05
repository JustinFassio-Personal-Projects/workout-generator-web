'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import { trackButtonClick } from '@/lib/analytics'
import styles from './Bio.module.scss'

export const Bio: React.FC = () => {
  const handleFounderStoryClick = () => {
    trackButtonClick('Read the Founder Story', 'bio')
  }

  const handleGenerateWorkoutClick = () => {
    trackButtonClick('Generate My First Workout', 'bio')
    const workoutBuilderSection = document.getElementById('workout-builder')
    if (workoutBuilderSection) {
      workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const credentials = [
    'Certified trainer since 1996 (ACSM CPT)',
    'U.S. Air Force TACP veteran; served as MFT/UFPM for a 3rd ASOG unit at Fort Hood',
    'Founder: San Diego Core Fitness',
    'Builder/designer: GymGo, FitNimbus, and now AIWorkoutGenerator / Fitcopilot',
  ]

  return (
    <section id="bio" className={styles.bio}>
      <LogoWatermark position="center" opacity={0.03} size={400} rotation={0} />
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Image Section */}
          <div className={styles.imageSection} data-aos="fade-right">
            <div className={styles.imageWrapper}>
              <Image
                src="/Justin Profile Section 1.png"
                alt="Justin Fassio - Founder of AIWorkoutGenerator"
                width={600}
                height={800}
                className={styles.profileImage}
                priority
                quality={90}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className={styles.content} data-aos="fade-left">
            <div className={styles.header}>
              <h2 className={styles.title}>
                <span className={styles.gradientText}>Built by a coach, not a prompt.</span>
              </h2>
              <div className={styles.bioText}>
                <p>
                  Hi — I&apos;m <strong>Justin Fassio</strong>. I&apos;ve been a certified trainer
                  since <strong>1996</strong>, ran military fitness programming for an Air Support
                  Operations unit, built real-world training businesses, and later designed fitness
                  software platforms before stepping into AI.
                </p>
                <p>
                  AIWorkoutGenerator exists for one reason:{' '}
                  <strong>
                    to give people structured training that&apos;s safe, personalized, and
                    consistent — not random workouts.
                  </strong>
                </p>
              </div>
            </div>

            <div className={styles.credentials} data-aos="fade-up" data-aos-delay="100">
              <h3 className={styles.credentialsTitle}>Credibility in 10 seconds:</h3>
              <ul className={styles.credentialsList}>
                {credentials.map((credential, index) => (
                  <li key={index} className={styles.credentialItem}>
                    <Check className={styles.checkIcon} size={20} />
                    <span>{credential}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTAs Section - Below image and credentials */}
        <div className={styles.ctaSection}>
          <div className={styles.actions} data-aos="fade-up" data-aos-delay="200">
            <Link href="/founder-story" onClick={handleFounderStoryClick}>
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                Read the Founder Story
              </Button>
            </Link>
            <Button variant="secondary" size="lg" onClick={handleGenerateWorkoutClick}>
              Generate My First Workout
            </Button>
          </div>

          <p className={styles.microTrust} data-aos="fade-up" data-aos-delay="300">
            AI-generated doesn&apos;t mean reckless. Programming logic is built around progression,
            constraints, and real coaching fundamentals.
          </p>
        </div>
      </div>
    </section>
  )
}
