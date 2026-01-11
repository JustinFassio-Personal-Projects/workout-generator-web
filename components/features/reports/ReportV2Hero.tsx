'use client'

import React from 'react'
import { Report } from '@/types/reports'
import styles from './ReportV2Hero.module.scss'

interface ReportV2HeroProps {
  report: Report
  scrollToSection: (sectionId: string) => void
}

export const ReportV2Hero: React.FC<ReportV2HeroProps> = ({ report, scrollToSection }) => {
  return (
    <header className={styles.hero}>
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
