import { ArrowRight } from 'lucide-react'
import type { FeaturedWorkout } from '@/lib/featured/queries'
import styles from './WorkoutsPreview.module.scss'

interface WorkoutsPreviewProps {
  workouts: FeaturedWorkout[]
}

function truncate(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen).trim() + '…'
}

export function WorkoutsPreview({ workouts }: WorkoutsPreviewProps) {
  if (workouts.length === 0) return null

  return (
    <section id="workouts" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Featured
            <span className={styles.gradientText}> Workouts</span>
          </h2>
          <p className={styles.subtitle}>
            Science-based workout sets: single sessions, splits, and two-a-days. Pick a set and run a session.
          </p>
        </div>
        <div className={styles.grid}>
          {workouts.map((workout) => (
            <article key={workout.id} className={`glass-card overflow-hidden group ${styles.card}`}>
              <a href="/workouts" className="block" data-cta="workouts-preview-card">
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{workout.title}</h3>
                  <p className={styles.cardDescription}>
                    {truncate(workout.description, 120)}
                  </p>
                  <span className={styles.ctaText}>
                    View Workouts
                    <ArrowRight className={styles.ctaIcon} aria-hidden />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
        <div className={styles.footer}>
          <a href="/workouts" className={styles.ctaLink} data-cta="workouts-preview-view-all">
            View All Workouts
            <ArrowRight className={styles.ctaIcon} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}
