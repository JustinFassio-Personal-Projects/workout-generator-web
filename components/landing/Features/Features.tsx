'use client'

import React from 'react'
import { features } from '@/data/features'
import { FeatureCard } from './FeatureCard'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import styles from './Features.module.scss'

export const Features: React.FC = () => {
  return (
    <section id="features" className={styles.features}>
      <LogoWatermark position="top-left" opacity={0.05} size={350} rotation={10} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Powerful Features to
            <span className={styles.gradientText}> Elevate Your Fitness</span>
          </h2>
          <p className={styles.subtitle}>
            Everything you need to create, track, and achieve your fitness goals in one powerful
            platform.
          </p>
        </div>
        <div className={styles.grid}>
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              comingSoon={feature.comingSoon}
              gradientColors={feature.gradientColors}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
