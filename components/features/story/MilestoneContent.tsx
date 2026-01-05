'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Milestone } from '@/data/story/milestones'
import { Chapter } from '@/data/story/chapters'
import { trackButtonClick, trackNavigationClick } from '@/lib/analytics'
import styles from './MilestoneContent.module.scss'

export interface MilestoneContentProps {
  milestone: Milestone
  relatedChapters?: Chapter[]
}

// Helper function to format story text with paragraphs, blockquotes, and bold
const formatStoryText = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())

  paragraphs.forEach((paragraph, pIndex) => {
    const trimmed = paragraph.trim()
    const lines = trimmed
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line)

    // Handle blockquotes (lines starting with >)
    if (lines[0]?.startsWith('>')) {
      const quoteText = lines.map(line => line.replace(/^>\s*/, '')).join(' ')
      parts.push(
        <blockquote key={`quote-${pIndex}`} className={styles.blockquote}>
          {formatInlineText(quoteText)}
        </blockquote>
      )
      return
    }

    // Check if paragraph contains bullet lists
    const listLines = lines.filter(line => line.startsWith('*') || line.startsWith('-'))
    const nonListLines = lines.filter(line => !line.startsWith('*') && !line.startsWith('-'))

    // If we have both list and non-list content, split them
    if (listLines.length > 0 && nonListLines.length > 0) {
      // Add non-list content as paragraphs
      nonListLines.forEach((line, idx) => {
        if (line.trim()) {
          parts.push(<p key={`p-${pIndex}-${idx}`}>{formatInlineText(line)}</p>)
        }
      })
      // Add list
      const listItems = listLines.map(line => line.replace(/^[*-]\s+/, '').trim())
      parts.push(
        <ul key={`list-${pIndex}`} className={styles.inlineList}>
          {listItems.map((item, i) => (
            <li key={i}>{formatInlineText(item)}</li>
          ))}
        </ul>
      )
      return
    }

    // Handle pure bullet lists
    if (listLines.length > 0) {
      const listItems = listLines.map(line => line.replace(/^[*-]\s+/, '').trim())
      parts.push(
        <ul key={`list-${pIndex}`} className={styles.inlineList}>
          {listItems.map((item, i) => (
            <li key={i}>{formatInlineText(item)}</li>
          ))}
        </ul>
      )
      return
    }

    // Regular paragraph - join all lines
    const paragraphText = lines.join(' ')
    parts.push(<p key={`p-${pIndex}`}>{formatInlineText(paragraphText)}</p>)
  })

  return parts
}

// Helper function to format inline text (bold, italic)
const formatInlineText = (text: string): React.ReactNode => {
  // Split by **bold** patterns
  const parts: React.ReactNode[] = []
  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match
  let key = 0

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    // Add bold text
    parts.push(<strong key={`bold-${key++}`}>{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? <>{parts}</> : text
}

export const MilestoneContent: React.FC<MilestoneContentProps> = ({
  milestone,
  relatedChapters = [],
}) => {
  const handlePrimaryCtaClick = () => {
    const label = milestone.primaryCtaLabel || 'Generate Your First Workout'
    trackButtonClick(label, 'milestone')
    const href = milestone.primaryCtaHref || '/#workout-builder'
    if (href.startsWith('/#')) {
      // Handle anchor links
      const sectionId = href.replace('/#', '')
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.location.href = href
      }
    } else {
      window.location.href = href
    }
  }

  const handleRelatedChapterClick = (slug: string) => {
    trackNavigationClick(`/story/${slug}`, 'related_chapter', 'milestone', {
      milestone_slug: milestone.slug,
      chapter_slug: slug,
    })
  }

  // Use milestone data
  const learnedPoints = milestone.learnedPoints || []
  const productConnections = milestone.productConnections || []
  const storyContent = formatStoryText(milestone.storyText)

  // CTA configuration
  const primaryLabel = milestone.primaryCtaLabel || 'Generate Your First Workout'
  const primaryHref = milestone.primaryCtaHref || '/#workout-builder'
  const secondaryLabel = milestone.secondaryCtaLabel || 'Back to Founder Story'
  const secondaryHref = milestone.secondaryCtaHref || '/founder-story'

  return (
    <div className={styles.content}>
      {/* The Story Section */}
      <section className={styles.storySection}>
        <div className={styles.container}>
          <div className={styles.storyContent} data-aos="fade-up">
            <h2 className={styles.sectionTitle}>The Story</h2>
            <div className={styles.storyText}>{storyContent}</div>
          </div>
        </div>
      </section>

      {/* What I Learned Section */}
      <section className={styles.learnedSection}>
        <div className={styles.container}>
          <div className={styles.learnedContent} data-aos="fade-up">
            <h2 className={styles.sectionTitle}>What I Learned</h2>
            <ul className={styles.learnedList}>
              {learnedPoints.map((point, index) => (
                <li key={index} className={styles.learnedItem}>
                  <Check className={styles.checkIcon} size={20} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it shows up in AIWorkoutGenerator Section */}
      <section className={styles.productSection}>
        <div className={styles.container}>
          <div className={styles.productContent} data-aos="fade-up">
            <h2 className={styles.sectionTitle}>How it shows up in AIWorkoutGenerator</h2>
            <ul className={styles.productList}>
              {productConnections.map((connection, index) => (
                <li key={index} className={styles.productItem}>
                  <Check className={styles.checkIcon} size={20} />
                  <span>{connection}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Proof / Artifacts Section (Optional) */}
      <section className={styles.artifactsSection}>
        <div className={styles.container}>
          <div className={styles.artifactsContent} data-aos="fade-up">
            <h2 className={styles.sectionTitle}>Proof / Artifacts</h2>
            <p className={styles.artifactsPlaceholder}>
              <em>
                Artifacts and images will be added here (photos, certificates, screenshots, etc.)
              </em>
            </p>
          </div>
        </div>
      </section>

      {/* Related Chapters */}
      {relatedChapters.length > 0 && (
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={styles.relatedContent} data-aos="fade-up">
              <h2 className={styles.sectionTitle}>Related Chapters</h2>
              <div className={styles.relatedGrid}>
                {relatedChapters.map(chapter => (
                  <Link
                    key={chapter.slug}
                    href={`/story/${chapter.slug}`}
                    className={styles.relatedLink}
                    onClick={() => handleRelatedChapterClick(chapter.slug)}
                  >
                    <div className={styles.relatedCard}>
                      <h3 className={styles.relatedTitle}>{chapter.title}</h3>
                      <p className={styles.relatedDescription}>{chapter.description}</p>
                      <span className={styles.relatedArrow}>
                        Read more
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaContent} data-aos="fade-up">
            {milestone.slug === 'why-ai-workout-generator' ? (
              <>
                <h2 className={styles.ctaTitle}>
                  Ready to stop guessing and start training with structure?
                </h2>
                <div className={styles.ctaActions}>
                  <Link href={primaryHref}>
                    <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                      {primaryLabel}
                    </Button>
                  </Link>
                  <Link href={secondaryHref}>
                    <Button variant="secondary" size="lg">
                      {secondaryLabel}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className={styles.ctaTitle}>
                  Want training built for real life (not internet theater)?
                </h2>
                <div className={styles.ctaActions}>
                  {primaryHref.startsWith('/#') ? (
                    <Button
                      variant="primary"
                      size="lg"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={handlePrimaryCtaClick}
                    >
                      {primaryLabel}
                    </Button>
                  ) : (
                    <Link href={primaryHref}>
                      <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                        {primaryLabel}
                      </Button>
                    </Link>
                  )}
                  <Link href={secondaryHref}>
                    <Button variant="secondary" size="lg">
                      {secondaryLabel}
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
