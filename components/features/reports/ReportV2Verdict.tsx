'use client'

import React from 'react'
import Link from 'next/link'
import { ReportV2RetentionChart } from './ReportV2RetentionChart'
import styles from './ReportV2Verdict.module.scss'

export const ReportV2Verdict: React.FC = () => {
  return (
    <div className={styles.grid}>
      <div className={styles.content}>
        <h2 className={styles.title}>The 2026 Verdict</h2>
        <p className={styles.description}>
          Data from over 500,000 user sessions in 2025 showed a clear trend:{' '}
          <strong>Novelty wears off, progress keeps users.</strong>
        </p>
        <ul className={styles.list}>
          <li className={styles.listItem}>
            <span className={styles.checkmark}>✓</span>
            <span className={styles.listText}>
              <strong>Retention:</strong> Users on System-based apps stay 3.4x longer than
              Randomizer apps.
            </span>
          </li>
          <li className={styles.listItem}>
            <span className={styles.checkmark}>✓</span>
            <span className={styles.listText}>
              <strong>Results:</strong> Progressive Overload algorithms yield 22% faster strength
              gains in beginners.
            </span>
          </li>
          <li className={styles.listItem}>
            <span className={styles.checkmark}>✓</span>
            <span className={styles.listText}>
              <strong>Safety:</strong> Fatigue management logic reduces injury risk by monitoring
              volume spikes.
            </span>
          </li>
        </ul>
        <div className={styles.cta}>
          <Link href="/onboard" className={styles.button}>
            Generate Your System Plan
          </Link>
          <p className={styles.attribution}>Powered by aiworkoutgenerator.com logic</p>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ReportV2RetentionChart />
      </div>
    </div>
  )
}
