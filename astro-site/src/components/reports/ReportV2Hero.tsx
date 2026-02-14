'use client'

import React from 'react'
import type { Report } from '@/types/reports'
import styles from './ReportV2Hero.module.scss'

interface ReportV2HeroProps {
  report: Report
  scrollToSection: (sectionId: string) => void
}

const DEFAULT_IMAGE = '/og-image.jpg'

export const ReportV2Hero: React.FC<ReportV2HeroProps> = ({ report, scrollToSection }) => {
  const heroImage = report.image || DEFAULT_IMAGE

  return (
    <header className={styles.hero}>
      <div className={styles.heroImageWrapper}>
        <img
          src={heroImage}
          alt={report.title}
          className={styles.heroImage}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
        <div className={styles.heroImageOverlay} />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.badge}>2026 Market Analysis</span>
        <h1 className={`${styles.title} ${styles.titleAccent}`}>
          {report.title.replace(/:$/, '').trim()}
        </h1>
        {report.excerpt && <p className={styles.excerpt}>{report.excerpt}</p>}
        <div className={styles.buttonGroup}>
          <button onClick={() => scrollToSection('analysis')} className={styles.buttonPrimary}>
            Read the Research
          </button>
          <button onClick={() => scrollToSection('live-demo')} className={styles.buttonSecondary}>
            <span className={styles.sparkle}>✨</span> Try the AI Engine
          </button>
        </div>
      </div>
    </header>
  )
}
