import { ArrowRight } from 'lucide-react'
import type { FeaturedChallenge } from '@/lib/featured/queries'
import styles from './ChallengesPreview.module.scss'

interface ChallengesPreviewProps {
  challenges: FeaturedChallenge[]
}

function truncate(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen).trim() + '…'
}

export function ChallengesPreview({ challenges }: ChallengesPreviewProps) {
  if (challenges.length === 0) return null

  return (
    <section id="challenges" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Featured
            <span className={styles.gradientText}> Challenges</span>
          </h2>
          <p className={styles.subtitle}>
            Time-bound fitness challenges to push your limits. Join a challenge and track your progress.
          </p>
        </div>
        <div className={styles.grid}>
          {challenges.map((challenge) => (
            <article key={challenge.id} className={`glass-card overflow-hidden group ${styles.card}`}>
              <a href={`/challenges/${challenge.id}`} className="block">
                {challenge.hero_image_url && (
                  <div className={styles.imageWrapper}>
                    <img
                      src={challenge.hero_image_url}
                      alt={challenge.title}
                      className={styles.image}
                      loading="lazy"
                    />
                  </div>
                )}
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{challenge.title}</h3>
                  <p className={styles.cardDescription}>
                    {truncate(challenge.description, 120)}
                  </p>
                  <span className={styles.ctaText}>
                    View Challenge
                    <ArrowRight className={styles.ctaIcon} aria-hidden />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
        <div className={styles.footer}>
          <a href="/challenges" className={styles.ctaLink}>
            View All Challenges
            <ArrowRight className={styles.ctaIcon} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}
