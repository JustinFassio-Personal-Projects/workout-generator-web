import React from 'react'
import Image from 'next/image'
import styles from './ReportsHero.module.scss'

const REPORTS_HERO_IMAGE = '/san-diego-core-fitness-hiit-workout-plan-builder-background.jpg'

export const ReportsHero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroImageWrapper}>
        <Image
          src={REPORTS_HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroImageOverlay} />
      </div>
      <div className={styles.heroContent}>
        <div className={styles.heroText} data-aos="fade-up">
          <h1 className={styles.heroTitle}>
            <span className={styles.gradientText}>Reports</span>
          </h1>
          <p className={styles.heroSubtitle}>
            In-depth analysis of AI workout generators, training systems, and fitness technology
            trends.
          </p>
        </div>
      </div>
    </section>
  )
}
