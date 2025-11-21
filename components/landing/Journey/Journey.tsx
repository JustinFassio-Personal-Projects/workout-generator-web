'use client'

import React from 'react'
import { journeySteps } from '@/data/journey'
import { JourneyStepCard } from './JourneyStepCard'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import styles from './Journey.module.scss'

export const Journey: React.FC = () => {
  return (
    <section id="journey" className={styles.journey}>
      <LogoWatermark position="bottom-left" opacity={0.05} size={300} rotation={-10} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Your Fitness
            <span className={styles.gradientText}> Journey Starts Here</span>
          </h2>
          <p className={styles.subtitle}>
            Follow these simple steps to begin your transformation and achieve your fitness goals.
          </p>
        </div>
        <div className={styles.timeline}>
          {journeySteps.map((step, index) => (
            <JourneyStepCard
              key={step.id}
              number={step.number}
              title={step.title}
              description={step.description}
              icon={step.icon}
              features={step.features}
              comingSoonFeatures={step.comingSoonFeatures}
              accentColor={step.accentColor}
              index={index}
              isLast={index === journeySteps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
