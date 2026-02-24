'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { trackButtonClick } from '@/lib/analytics'

export interface StoryCTASectionProps {
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
}

export const StoryCTASection: React.FC<StoryCTASectionProps> = ({
  primaryHref = '/#workout-builder',
  primaryLabel = 'Generate Your First Workout',
  secondaryHref = '/blog',
  secondaryLabel = 'See Example Workouts',
  onPrimaryClick,
  onSecondaryClick,
}) => {
  const handlePrimaryClick = () => {
    if (onPrimaryClick) {
      onPrimaryClick()
    } else {
      trackButtonClick(primaryLabel, 'story_cta')
    }
  }

  const handleSecondaryClick = () => {
    if (onSecondaryClick) {
      onSecondaryClick()
    } else {
      trackButtonClick(secondaryLabel, 'story_cta')
    }
  }

  return (
    <>
      <Link href={primaryHref} onClick={handlePrimaryClick}>
        <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
          {primaryLabel}
        </Button>
      </Link>
      <Link href={secondaryHref} onClick={handleSecondaryClick}>
        <Button variant="secondary" size="lg">
          {secondaryLabel}
        </Button>
      </Link>
    </>
  )
}
