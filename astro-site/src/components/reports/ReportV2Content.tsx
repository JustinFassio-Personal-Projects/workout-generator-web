'use client'

import React from 'react'
import type { Report } from '@/types/reports'
import { ReportV2Navigation } from './ReportV2Navigation'
import { ReportV2Hero } from './ReportV2Hero'
import { ReportV2ProgressChart } from './ReportV2ProgressChart'
import { ReportV2TierSelector } from './ReportV2TierSelector'
import { ReportV2LogicSimulation } from './ReportV2LogicSimulation'
import { ReportV2LiveDemo } from './ReportV2LiveDemo'
import { ReportV2Verdict } from './ReportV2Verdict'
import styles from './ReportV2Content.module.scss'

interface ReportV2ContentProps {
  report: Report
}

export const ReportV2Content: React.FC<ReportV2ContentProps> = ({ report }) => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <article className={styles.report}>
      <ReportV2Navigation scrollToSection={scrollToSection} />
      <ReportV2Hero report={report} scrollToSection={scrollToSection} />
      <section id="analysis" className={styles.section}>
        <div className={styles.sectionCenter}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>The "Randomness" Trap</h2>
            <p className={styles.sectionText}>
              Why do most "AI" apps fail after 3 months? <br />
              <strong>Context:</strong> Most generators treat every workout as an isolated event.
              This lacks <em>Progressive Overload</em>, the biological requirement for change.
              <br />
              <strong>Interact:</strong> Toggle the lines below to see the difference in 6-month
              trajectories.
            </p>
          </div>
          <ReportV2ProgressChart />
        </div>
      </section>

      <section id="tiers" className={styles.section}>
        <div className={styles.sectionCenter}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>The 3 Tiers of AI Fitness Tools</h2>
            <p className={styles.sectionText}>
              Not all "AI" is created equal. In 2026, the market has split into three distinct
              categories.
              <br />
              <strong>Interact:</strong> Click a tier to reveal its underlying technology and
              expected results.
            </p>
          </div>
          <ReportV2TierSelector />
        </div>
      </section>

      <section id="simulation" className={styles.sectionDark}>
        <div className={styles.sectionCenter}>
          <div className={styles.sectionHeader}>
            <span className={styles.badge}>Interactive Demo</span>
            <h2 className={styles.sectionTitleLight}>How It Thinks: System vs. Random</h2>
            <p className={styles.sectionTextLight}>
              The true test of an AI isn't generating a workout; it's <strong>adapting</strong> to
              life. <br />
              <strong>Task:</strong> Choose a scenario below to see how a Tier 3 System reacts
              compared to a standard generator.
            </p>
          </div>
          <ReportV2LogicSimulation />
        </div>
      </section>

      <section id="live-demo" className={styles.sectionGradient}>
        <div className={styles.sectionCenter}>
          <ReportV2LiveDemo />
        </div>
      </section>

      <section id="cta" className={styles.sectionCta}>
        <div className={styles.sectionCenter}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Try Our Adaptive System Today</h2>
            <p className={styles.ctaDescription}>
              Experience the power of system-based training. Generate your personalized workout plan
              and start your fitness journey with AI-powered precision.
            </p>
            <a href="/onboard" className={styles.ctaButton}>
              Generate Your System Plan
            </a>
            <p className={styles.ctaAttribution}>Powered by aiworkoutgenerator.com logic</p>
          </div>
        </div>
      </section>

      <section id="verdict" className={styles.section}>
        <div className={styles.sectionCenter}>
          <ReportV2Verdict />
        </div>
      </section>
    </article>
  )
}
