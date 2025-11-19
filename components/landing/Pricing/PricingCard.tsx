'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Card } from '@/components/ui/Card/Card'
import { PricingPlan } from '@/data/pricing'
import styles from './Pricing.module.scss'

export interface PricingCardProps {
  plan: PricingPlan
  index: number
}

export const PricingCard: React.FC<PricingCardProps> = ({ plan, index }) => {
  return (
    <Card
      variant={plan.popular ? 'strong' : 'default'}
      hover={true}
      className={`${styles.pricingCard} ${plan.popular ? styles['pricingCard--popular'] : ''}`}
      data-aos="fade-up"
      data-aos-delay={index * 100}
    >
      {plan.popular && (
        <div className={styles.badge}>Most Popular</div>
      )}
      <div className={styles.header}>
        <h3 className={styles.planName}>{plan.name}</h3>
        <p className={styles.description}>{plan.description}</p>
        <div className={styles.price}>
          <span className={styles.priceAmount}>
            ${plan.price}
          </span>
          <span className={styles.pricePeriod}>
            /{plan.period}
          </span>
        </div>
      </div>
      <ul className={styles.featuresList}>
        {plan.features.map((feature, idx) => (
          <li key={idx} className={styles.featureItem}>
            <Check size={20} className={styles.checkIcon} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        <Button
          variant={plan.ctaVariant}
          size="lg"
          className={styles.ctaButton}
        >
          {plan.ctaText}
        </Button>
      </div>
    </Card>
  )
}

