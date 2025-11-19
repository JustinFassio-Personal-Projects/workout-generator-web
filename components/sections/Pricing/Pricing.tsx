'use client'

import React, { useEffect } from 'react'
import { pricingPlans } from '@/data/pricing'
import { PricingCard } from './PricingCard'
import styles from './Pricing.module.scss'

export const Pricing: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('aos').then((AOS) => {
        AOS.default.init({
          duration: 800,
          easing: 'ease-out',
          once: true,
        })
      })
    }
  }, [])

  return (
    <section id="pricing" className={styles.pricing}>
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

