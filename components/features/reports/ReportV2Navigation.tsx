'use client'

import React from 'react'
import Link from 'next/link'
import styles from './ReportV2Navigation.module.scss'

interface ReportV2NavigationProps {
  scrollToSection: (sectionId: string) => void
}

export const ReportV2Navigation: React.FC<ReportV2NavigationProps> = ({ scrollToSection }) => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <Link href="/reports" className={styles.navTitle}>
          AI Workout Gen Report
        </Link>
        <div className={styles.navLinks}>
          <a
            href="#analysis"
            onClick={e => {
              e.preventDefault()
              scrollToSection('analysis')
            }}
            className={styles.navLink}
          >
            Analysis
          </a>
          <a
            href="#tiers"
            onClick={e => {
              e.preventDefault()
              scrollToSection('tiers')
            }}
            className={styles.navLink}
          >
            Tiers
          </a>
          <a
            href="#simulation"
            onClick={e => {
              e.preventDefault()
              scrollToSection('simulation')
            }}
            className={styles.navLink}
          >
            Logic
          </a>
          <a
            href="#live-demo"
            onClick={e => {
              e.preventDefault()
              scrollToSection('live-demo')
            }}
            className={styles.navLinkActive}
          >
            <span className={styles.sparkle}>✨</span> Live Demo
          </a>
          <a
            href="#verdict"
            onClick={e => {
              e.preventDefault()
              scrollToSection('verdict')
            }}
            className={styles.navLink}
          >
            Verdict
          </a>
        </div>
      </div>
    </nav>
  )
}
