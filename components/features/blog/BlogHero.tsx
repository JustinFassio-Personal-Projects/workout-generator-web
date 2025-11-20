import React from 'react'
import styles from './BlogHero.module.scss'

export const BlogHero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText} data-aos="fade-up">
          <h1 className={styles.heroTitle}>
            <span className={styles.gradientText}>Blog</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Discover fitness tips, workout strategies, and expert advice to help you achieve your
            goals.
          </p>
        </div>
      </div>
    </section>
  )
}
