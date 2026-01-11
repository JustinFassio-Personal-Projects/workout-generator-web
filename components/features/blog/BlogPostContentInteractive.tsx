'use client'

import React from 'react'
import Link from 'next/link'
import { BlogPost } from '@/features/blog/types'
import { InteractiveHero } from './InteractiveHero'
import { ProgressChart } from './ProgressChart'
import { TierSelector } from './TierSelector'
import { LogicSimulation } from './LogicSimulation'
import { RetentionChart } from './RetentionChart'
import styles from './BlogPostContentInteractive.module.scss'

interface BlogPostContentInteractiveProps {
  post: BlogPost
}

export const BlogPostContentInteractive: React.FC<BlogPostContentInteractiveProps> = ({ post }) => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <article className={styles.interactivePost}>
      {/* Navigation */}
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

      {/* Hero Section */}
      <InteractiveHero post={post} />

      {/* Section 1: The Core Problem (Chart) */}
      <section id="analysis" className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.sectionCenter}>
          <h2 className={styles.sectionTitle}>The "Randomness" Trap</h2>
          <p className={styles.sectionText}>
            Why do most "AI" apps fail after 3 months? <br />
            <strong>Context:</strong> Most generators treat every workout as an isolated event. This
            lacks <em>Progressive Overload</em>, the biological requirement for change.
            <br />
            <strong>Interact:</strong> Toggle the lines below to see the difference in 6-month
            trajectories.
          </p>
        </div>
        <ProgressChart />
      </section>

      {/* Section 2: The 3 Tiers of AI (Interactive Grid) */}
      <section id="tiers" className={styles.section}>
        <div className={styles.sectionCenter} style={{ marginBottom: 'var(--spacing-3xl)' }}>
          <h2 className={styles.sectionTitle}>The 3 Tiers of AI Fitness Tools</h2>
          <p className={styles.sectionText}>
            Not all "AI" is created equal. In 2026, the market has split into three distinct
            categories.
            <br />
            <strong>Interact:</strong> Click a tier to reveal its underlying technology and expected
            results.
          </p>
        </div>
        <TierSelector />
      </section>

      {/* Section 3: The Logic Simulation */}
      <section id="simulation" className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.sectionCenter} style={{ marginBottom: 'var(--spacing-3xl)' }}>
          <span className={`${styles.badge} ${styles.badgeAccent}`}>Interactive Demo</span>
          <h2 className={styles.sectionTitle}>How It Thinks: System vs. Random</h2>
          <p className={styles.sectionText} style={{ color: 'var(--text-tertiary)' }}>
            The true test of an AI isn't generating a workout; it's <strong>adapting</strong> to
            life.
            <br />
            <strong>Task:</strong> Choose a scenario below to see how a Tier 3 System reacts
            compared to a standard generator.
          </p>
        </div>
        <LogicSimulation />
      </section>

      {/* Section 4: Data Driven Verdict */}
      <section id="verdict" className={styles.section}>
        <div className={`${styles.grid} ${styles.gridCols2}`} style={{ alignItems: 'center' }}>
          <div>
            <h2 className={styles.sectionTitle}>The 2026 Verdict</h2>
            <p
              className={styles.sectionText}
              style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'left' }}
            >
              Data from over 500,000 user sessions in 2025 showed a clear trend:{' '}
              <strong>Novelty wears off, progress keeps users.</strong>
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span className={styles.listIcon}>✓</span>
                <span className={styles.listText}>
                  <strong className={styles.listTextStrong}>Retention:</strong> Users on
                  System-based apps stay 3.4x longer than Randomizer apps.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.listIcon}>✓</span>
                <span className={styles.listText}>
                  <strong className={styles.listTextStrong}>Results:</strong> Progressive Overload
                  algorithms yield 22% faster strength gains in beginners.
                </span>
              </li>
              <li className={styles.listItem}>
                <span className={styles.listIcon}>✓</span>
                <span className={styles.listText}>
                  <strong className={styles.listTextStrong}>Safety:</strong> Fatigue management
                  logic reduces injury risk by monitoring volume spikes.
                </span>
              </li>
            </ul>
            <div style={{ marginTop: 'var(--spacing-xl)' }}>
              <Link
                href="/onboard"
                className={`${styles.button} ${styles.buttonAccent}`}
                style={{ display: 'inline-block' }}
              >
                Generate Your System Plan
              </Link>
              <p
                style={{
                  marginTop: 'var(--spacing-sm)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-muted)',
                }}
              >
                Powered by aiworkoutgenerator.com logic
              </p>
            </div>
          </div>
          <RetentionChart />
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>
            &copy; 2026 AI Workout Generator Research. All rights reserved.
          </p>
          <p className={styles.footerSmall}>
            Analysis based on aggregate fitness app usage data trends projected for 2026.
            "System-Based Training" refers to algorithmic periodization models.
          </p>
        </div>
      </footer>
    </article>
  )
}
