'use client'

import React from 'react'
import Image from 'next/image'
import { BlogPost } from '@/features/blog/types'
import styles from './BlogPostContentInteractive.module.scss'

const DEFAULT_IMAGE = '/og-image.jpg'

interface InteractiveHeroProps {
  post: BlogPost
}

export const InteractiveHero: React.FC<InteractiveHeroProps> = ({ post }) => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const heroImage = post.image || DEFAULT_IMAGE

  // Ensure title has no trailing colon and render only once
  // Remove any colon at the end, trim whitespace
  const displayTitle = post.title ? post.title.replace(/:$/, '').trim() : ''

  return (
    <header className={styles.hero}>
      <div className={styles.heroImageWrapper}>
        <Image
          src={heroImage}
          alt={displayTitle}
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroImageOverlay} />
      </div>
      <div className={styles.heroContent}>
        <div className={styles.sectionCenter}>
          <span className={`${styles.badge} ${styles.badgePrimary}`}>2026 Market Analysis</span>
          <h1
            className={styles.sectionTitle}
            style={{ color: 'var(--color-accent)' }}
            data-testid="interactive-hero-title"
          >
            {displayTitle}
          </h1>
          {post.excerpt && <p className={styles.sectionText}>{post.excerpt}</p>}
          <div className={styles.buttonGroup}>
            <button
              onClick={() => scrollToSection('analysis')}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Read the Research
            </button>
            <button
              onClick={() => scrollToSection('simulation')}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Test the Logic
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
