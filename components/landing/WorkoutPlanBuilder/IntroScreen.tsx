'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Globe, PersonStanding, Info } from 'lucide-react'
import styles from './IntroScreen.module.scss'

interface IntroScreenProps {
  onComplete: () => void
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const router = useRouter()
  const [phase, setPhase] = useState(0)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 1200)
    const timer2 = setTimeout(() => setPhase(2), 4000)
    const timer3 = setTimeout(() => setPhase(3), 5500)

    // Check screen size for responsive particles
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  const scrollToSection = (sectionId: string) => {
    setTimeout(() => {
      const sectionElement = document.getElementById(sectionId)
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleEnter = () => {
    // Navigate directly to onboarding wizard route
    // Note: We intentionally skip onComplete() here because:
    // 1. We're navigating to a different route (/onboard), so this component will unmount immediately
    // 2. The state change from setShowIntro(false) would not be visible since we're navigating away
    // 3. This prevents any potential flash of the form content before navigation completes
    // 4. No analytics tracking is lost - navigation itself is tracked via Next.js router events
    router.push('/onboard')
  }

  const handleLearnMore = () => {
    onComplete()
    // Scroll to hero section after intro hides
    scrollToSection('hero')
  }

  const strands = Array.from({ length: 12 })
  const particles = Array.from({ length: 20 })

  return (
    <div className={styles.overlay}>
      {/* Background layers */}
      <div className={styles.backgroundGradient}></div>
      <div className={styles.gridPattern}></div>

      {/* Main animation container */}
      <div className={styles.animationContainer}>
        {/* Globe animation (Phase 0-1) */}
        <div className={`${styles.globeWrapper} ${phase >= 2 ? styles.hidden : ''}`}>
          <div className={styles.globeOuter}></div>
          <div className={styles.globeOuterDashed}></div>
          {[0, 45, 90, 135].map(deg => (
            <div
              key={deg}
              className={styles.globeRing}
              style={{ transform: `rotateY(${deg}deg)` }}
            ></div>
          ))}
          <div className={styles.globeGlow}></div>
          {phase === 1 &&
            strands.map((_, i) => (
              <div
                key={i}
                className={styles.strandWrapper}
                style={{ transform: `rotate(${i * (360 / strands.length)}deg)` }}
              >
                <div
                  className={styles.strandParticle}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  <div className={styles.strandLine}></div>
                </div>
              </div>
            ))}
        </div>

        {/* Person icon with progress bars (Phase 2+) */}
        <div className={`${styles.personContainer} ${phase >= 2 ? styles.visible : styles.hidden}`}>
          <div className={styles.personCard}>
            <div className={styles.scanLine}></div>
            <div className={styles.cardGrid}></div>
            <div className={styles.personIconWrapper}>
              <div className={styles.personIconBorder}></div>
              <PersonStanding className={styles.personIcon} />
            </div>
            <div className={styles.progressBars}>
              <div className={styles.progressBar}>
                <div className={`${styles.progressFill} ${styles.fill1}`}></div>
              </div>
              <div className={styles.progressBar}>
                <div className={`${styles.progressFill} ${styles.fill2}`}></div>
              </div>
              <div className={styles.progressBar}>
                <div className={`${styles.progressFill} ${styles.fill3}`}></div>
              </div>
            </div>
            <div className={styles.spinnerContainer}>
              <div className={styles.spinner}>
                <div className={styles.spinnerDot}></div>
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
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    opacity: phase === 3 ? 0.5 : 0,
                  }}
                >
                  <div
                    className={styles.particleLine}
                    style={{
                      width: `${radius}px`,
                      transform: `rotate(${angle + 180}deg)`,
                    }}
                  />
                </div>
              )
            })}
        </div>
      </div>

      {/* Bottom content (Phase 3) */}
      <div className={`${styles.bottomContent} ${phase === 3 ? styles.visible : styles.hidden}`}>
        <h1 className={styles.title}>
          Workout <span className={styles.gradientText}>Generator</span>
        </h1>
        <div className={styles.taglineContainer}>
          <p className={styles.tagline}>Personalized Fitness. Powered by AI.</p>
          <div className={styles.badge}>
            <Globe className={styles.badgeIcon} />
            <span className={styles.badgeText}>Advanced AI Workout Engine</span>
          </div>
        </div>
        <div className={styles.ctaButtonGroup}>
          <button onClick={handleEnter} className={styles.ctaButton}>
            <div className={styles.ctaButtonBg}></div>
            <div className={styles.ctaButtonBorder}></div>
            <div className={styles.ctaButtonContent}>
              <span className={styles.ctaButtonText}>START BUILDING</span>
              <Play className={styles.ctaButtonIcon} />
            </div>
          </button>
          <button onClick={handleLearnMore} className={styles.learnMoreButton}>
            <div className={styles.learnMoreButtonBorder}></div>
            <div className={styles.learnMoreButtonContent}>
              <span className={styles.learnMoreButtonText}>Learn More</span>
              <Info className={styles.learnMoreButtonIcon} />
            </div>
          </button>
        </div>
      </div>

      {/* Skip button */}
      <button onClick={onComplete} className={styles.skipButton}>
        Skip Intro
      </button>
    </div>
  )
}
