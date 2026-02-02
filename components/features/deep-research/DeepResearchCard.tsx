'use client'

import React from 'react'
import Link from 'next/link'
import type { DeepResearch } from '@/types/deep-research'
import styles from './DeepResearchCard.module.scss'

interface DeepResearchCardProps {
  item: DeepResearch
  relevanceScore?: number
  maxScore?: number
}

export function DeepResearchCard({ item, relevanceScore, maxScore }: DeepResearchCardProps) {
  const formattedDate = item.published_at
    ? new Date(item.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <Link href={`/deep-research/${item.slug}`} className={styles.card}>
      <div className={styles.content}>
        {relevanceScore !== undefined && maxScore !== undefined && maxScore > 0 && (
          <span className={styles.badge}>
            {relevanceScore}/{maxScore} match
          </span>
        )}
        <h2 className={styles.title}>{item.title}</h2>
        <p className={styles.excerpt}>{item.excerpt || ''}</p>
        <div className={styles.meta}>
          <span className={styles.date}>{formattedDate}</span>
        </div>
      </div>
    </Link>
  )
}
