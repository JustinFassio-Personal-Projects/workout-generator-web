'use client'

import React, { useState } from 'react'
import { LucideIcon, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import styles from './Journey.module.scss'

export interface JourneyStepCardProps {
  number: number
  title: string
  description: string
  icon: LucideIcon
  features: string[]
  comingSoonFeatures?: string[]
  accentColor: string
  index: number
  isLast: boolean
}

export const JourneyStepCard: React.FC<JourneyStepCardProps> = ({
  number,
  title,
  description,
  icon: Icon,
  features,
  comingSoonFeatures = [],
  accentColor,
  index,
  isLast,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={styles.stepWrapper} data-aos="fade-up" data-aos-delay={index * 100}>
      <div className={styles.stepNumber}>{number}</div>
      {!isLast && <div className={styles.connector} />}
      <Card
        variant="default"
        hover={true}
        className={`${styles.stepCard} ${isExpanded ? styles['stepCard--expanded'] : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.stepHeader}>
          <div
            className={styles.iconWrapper}
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
            }}
          >
            <Icon size={24} />
          </div>
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>{title}</h3>
            <p className={styles.stepDescription}>{description}</p>
          </div>
          <button
            className={`${styles.expandButton} ${isExpanded ? styles['expandButton--expanded'] : ''}`}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown size={20} />
          </button>
        </div>
        <div
          className={`${styles.stepFeatures} ${isExpanded ? styles['stepFeatures--expanded'] : ''}`}
        >
          <ul className={styles.featuresList}>
            {features.map((feature, idx) => {
              const isComingSoon = comingSoonFeatures.includes(feature)
              return (
                <li key={idx} className={styles.featureItem}>
                  <span className={styles.checkmark}>✓</span>
                  <span>{feature}</span>
                  {isComingSoon && <span className={styles.comingSoon}>(Coming Soon)</span>}
                </li>
              )
            })}
          </ul>
        </div>
      </Card>
    </div>
  )
}
