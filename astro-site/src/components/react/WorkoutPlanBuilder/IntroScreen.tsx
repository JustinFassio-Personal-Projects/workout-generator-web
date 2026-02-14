'use client'

import React, { useState, useEffect } from 'react'
import { Play, Globe, PersonStanding } from 'lucide-react'
import styles from './IntroScreen.module.scss'

interface IntroScreenProps {
  onComplete: () => void
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 1200)
    const timer2 = setTimeout(() => setPhase(2), 4000)
    const timer3 = setTimeout(() => setPhase(3), 5500)
    const checkScreenSize = () => setIsSmallScreen(window.innerWidth < 768)
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  const handleEnter = () => {
    window.location.href = '/onboard'
  }

  const strands = Array.from({ length: 12 })
  const particles = Array.from({ length: 20 })

  return (
    <div className={styles.overlay}>
      <div className={styles.backgroundGradient} />
      <div className={styles.gridPattern} />
      {phase === 3 && (
        <div className={styles.topBadge}>
          <div className={styles.badge}>
            <Globe className={styles.badgeIcon} />
            <span className={styles.badgeText}>Live Bio-Feedback Active</span>
          </div>
        </div>
      )}
      <div className={styles.animationContainer}>
        <div className={`${styles.globeWrapper} ${phase >= 2 ? styles.hidden : ''}`}>
          <div className={styles.globeOuter} />
          <div className={styles.globeOuterDashed} />
          {[0, 45, 90, 135].map(deg => (
            <div
              key={deg}
              className={styles.globeRing}
              style={{ transform: `rotateY(${deg}deg)` }}
            />
          ))}
          <div className={styles.globeGlow} />
          {phase === 1 &&
            strands.map((_, i) => (
              <div
                key={i}
                className={styles.strandWrapper}
                style={{ transform: `rotate(${i * (360 / strands.length)}deg)` }}
              >
                <div className={styles.strandParticle} style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={styles.strandLine} />
                </div>
              </div>
            ))}
        </div>
        <div className={`${styles.personContainer} ${phase >= 2 ? styles.visible : styles.hidden}`}>
          <div className={styles.personCard}>
            <div className={styles.scanLine} />
            <div className={styles.cardGrid} />
            <div className={styles.personIconWrapper}>
              <div className={styles.personIconBorder} />
              <PersonStanding className={styles.personIcon} />
            </div>
            <div className={styles.spinnerContainer}>
              <div className={styles.spinner}>
                <div className={styles.spinnerDot} />
              </div>
            </div>
          </div>
          {phase >= 2 &&
            particles.map((_, i) => {
              const angle = (i / particles.length) * 360
              const radius = isSmallScreen ? 110 : 140
              const x = Math.cos(angle * (Math.PI / 180)) * radius
              const y = Math.sin(angle * (Math.PI / 180)) * radius
              return (
                <div
                  key={i}
                  className={styles.particle}
                  style={{ transform: `translate(${x}px, ${y}px)`, opacity: phase === 3 ? 0.5 : 0 }}
                >
                  <div
                    className={styles.particleLine}
                    style={{ width: `${radius}px`, transform: `rotate(${angle + 180}deg)` }}
                  />
                </div>
              )
            })}
        </div>
      </div>
      <div className={`${styles.bottomContent} ${phase === 3 ? styles.visible : styles.hidden}`}>
        <h1 className={styles.title}>
          AI PERSONAL <br />
          <span className={styles.gradientText}>TRAINER</span>
        </h1>
        <div className={styles.taglineContainer}>
          <p className={styles.tagline}>
            Experience the Live Coach Engine that adapts your sets, reps, and weights in real-time
            based on your fatigue.
          </p>
        </div>
        <div className={styles.ctaButtonGroup}>
          <button type="button" onClick={handleEnter} className={styles.ctaButton}>
            <div className={styles.ctaButtonBg} />
            <div className={styles.ctaButtonBorder} />
            <div className={styles.ctaButtonContent}>
              <span className={styles.ctaButtonText}>Generate Workout</span>
              <Play className={styles.ctaButtonIcon} />
            </div>
          </button>
        </div>
      </div>
      <button type="button" onClick={onComplete} className={styles.skipButton}>
        Free Workout
      </button>
    </div>
  )
}
