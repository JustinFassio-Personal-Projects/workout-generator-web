'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Card } from '@/components/ui/Card/Card'
import { PricingPlan } from '@/data/pricing'
import { trackVercelEvent, analytics } from '@/lib/analytics'
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
      {plan.popular && <div className={styles.badge}>Most Popular</div>}
      <div className={styles.header}>
        <h3 className={styles.planName}>{plan.name}</h3>
        <p className={styles.description}>{plan.description}</p>
        <div className={styles.price}>
          {plan.originalPrice && (
            <span className={styles.originalPrice}>${plan.originalPrice}</span>
          )}
          <span className={styles.priceAmount}>${plan.price}</span>
          <span className={styles.pricePeriod}>/{plan.period}</span>
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
        {plan.ctaLink ? (
          <a
            href={plan.ctaLink}
            className={styles.ctaLink}
            onClick={() => {
              // Check if link is to login/signup page
              const ctaLink = plan.ctaLink || ''
              const isLoginLink = ctaLink.includes('/login') || ctaLink.includes('login')
              const isSignupLink =
                ctaLink.includes('/signup') ||
                ctaLink.includes('/register') ||
                ctaLink.includes('signup')

              if (isLoginLink && ctaLink) {
                analytics.trackLoginIntent('pricing', ctaLink)
              } else if (isSignupLink && ctaLink) {
                analytics.trackSignupIntent('pricing', ctaLink)
              }

              trackVercelEvent('Pricing Plan Click', {
                plan_name: plan.name,
                plan_price: plan.price,
                plan_period: plan.period,
                location: 'pricing',
                is_login_link: isLoginLink,
                is_signup_link: isSignupLink,
              })
            }}
          >
            <Button variant={plan.ctaVariant} size="lg" className={styles.ctaButton}>
              {plan.ctaText}
            </Button>
          </a>
        ) : (
          <Button
            variant={plan.ctaVariant}
            size="lg"
            className={styles.ctaButton}
            onClick={() => {
              trackVercelEvent('Pricing Plan Click', {
                plan_name: plan.name,
                plan_price: plan.price,
                plan_period: plan.period,
                location: 'pricing',
                is_login_link: false,
                is_signup_link: false,
              })
            }}
          >
            {plan.ctaText}
          </Button>
        )}
      </div>
    </Card>
  )
}
