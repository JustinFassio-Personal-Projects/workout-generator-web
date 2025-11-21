'use client'

import React from 'react'
import { pricingPlans } from '@/data/pricing'
import { PricingCard } from './PricingCard'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import styles from './Pricing.module.scss'

export const Pricing: React.FC = () => {
  return (
    <section id="pricing" className={styles.pricing}>
      <LogoWatermark position="top-right" opacity={0.05} size={320} rotation={15} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Choose Your
            <span className={styles.gradientText}> Perfect Plan</span>
          </h2>
          <p className={styles.subtitle}>
            Start free and upgrade as you grow. All plans include our core features.
          </p>
        </div>
        <div className={styles.grid}>
          {pricingPlans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
