'use client'

import React from 'react'
import Image from 'next/image'
import { Report } from '@/types/reports'
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
        <Image
          src={heroImage}
          alt={report.title}
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroImageOverlay} />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.badge}>2026 Market Analysis</span>
        <h1 className={styles.title}>
          {report.title.split(':')[0]}:<br />
          <span className={styles.titleAccent}>
            {report.title.split(':')[1]?.trim() || report.title}
          </span>
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
