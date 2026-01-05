'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import { Chapter } from '@/data/story/chapters'
import { trackNavigationClick } from '@/lib/analytics'
import styles from './StoryChapterCard.module.scss'

export interface StoryChapterCardProps {
  chapter: Chapter
  index: number
}

export const StoryChapterCard: React.FC<StoryChapterCardProps> = ({ chapter, index }) => {
  const handleClick = () => {
    trackNavigationClick(`/story/${chapter.slug}`, 'chapter_card', 'founder_story', {
      chapter_slug: chapter.slug,
      chapter_order: chapter.order,
    })
  }

  return (
    <Card hover={true} className={styles.chapterCard}>
      <Link
        href={`/story/${chapter.slug}`}
        className={styles.cardLink}
        onClick={handleClick}
        data-aos="fade-up"
        data-aos-delay={index * 50}
      >
        <div className={styles.cardContent}>
          <div className={styles.orderBadge}>{chapter.order}</div>
          <h3 className={styles.title}>{chapter.title}</h3>
          <p className={styles.description}>{chapter.description}</p>
          <div className={styles.footer}>
            <span className={styles.readMore}>
              Read chapter
              <ArrowRight className={styles.arrowIcon} size={16} />
            </span>
          </div>
        </div>
      </Link>
    </Card>
  )
}
