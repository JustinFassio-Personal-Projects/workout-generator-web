'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import styles from './Features.module.scss'

export interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  comingSoon?: boolean
  gradientColors: {
    from: string
    to: string
  }
  index: number
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  comingSoon,
  gradientColors,
  index,
}) => {
  return (
    <Card
      variant="default"
      hover={true}
      data-aos="fade-up"
      data-aos-delay={index * 100}
      className={styles.featureCard}
    >
      <div
        className={styles.iconWrapper}
        style={{
          background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.to} 100%)`,
        }}
      >
        <Icon size={32} />
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      {comingSoon && <span className={styles.comingSoon}>(Coming Soon)</span>}
      <p className={styles.featureDescription}>{description}</p>
    </Card>
  )
}
