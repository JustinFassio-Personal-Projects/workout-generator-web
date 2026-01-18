'use client'

import React from 'react'
import Link from 'next/link'
import styles from './BlogPostContentInteractive.module.scss'

export const InteractiveNav: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <Link href="/blog" className={styles.navTitle}>
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
            The Analysis
          </a>
          <a
            href="#tiers"
            onClick={e => {
              e.preventDefault()
              scrollToSection('tiers')
            }}
            className={styles.navLink}
          >
            AI Tiers
          </a>
          <a
            href="#simulation"
            onClick={e => {
              e.preventDefault()
              scrollToSection('simulation')
            }}
            className={styles.navLink}
          >
            Logic Check
          </a>
          <a
            href="#verdict"
            onClick={e => {
              e.preventDefault()
              scrollToSection('verdict')
            }}
            className={styles.navLink}
          >
            The Verdict
          </a>
        </div>
      </div>
    </nav>
  )
}
