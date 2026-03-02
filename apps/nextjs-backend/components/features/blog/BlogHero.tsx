import React from 'react'
import Image from 'next/image'
import styles from './BlogHero.module.scss'

const BLOG_HERO_IMAGE = '/og-image.jpg'

export const BlogHero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroImageWrapper}>
        <Image
          src={BLOG_HERO_IMAGE}
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
