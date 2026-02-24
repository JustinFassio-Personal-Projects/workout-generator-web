'use client'

import React from 'react'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import styles from './StoryHero.module.scss'

export interface StoryHeroProps {
  title: string
  tagline: string
  heroText?: string
}

export const StoryHero: React.FC<StoryHeroProps> = ({ title, tagline, heroText }) => {
  // Format heroText with line breaks if provided
  const formattedHeroText = heroText
    ? heroText.split('\n').map((line, index, array) => (
        <React.Fragment key={index}>
          {line}
          {index < array.length - 1 && <br />}
        </React.Fragment>
      ))
    : null

  return (
    <section className={styles.hero}>
      <LogoWatermark position="center" opacity={0.04} size={500} rotation={0} />
      <div className={styles.container}>
        <div className={styles.content} data-aos="fade-up">
          <h1 className={styles.title}>{title}</h1>
          {heroText ? (
            <div className={styles.heroText}>{formattedHeroText}</div>
          ) : (
            <p className={styles.tagline}>{tagline}</p>
          )}
          {heroText && <p className={styles.taglineSecondary}>{tagline}</p>}
        </div>
      </div>
    </section>
  )
}
