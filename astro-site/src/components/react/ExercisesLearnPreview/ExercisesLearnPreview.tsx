import { ArrowRight } from 'lucide-react'
import styles from './ExercisesLearnPreview.module.scss'

/**
 * Static CTA section for Exercises and Learn (no featured data; exercises have no featured_on_landing).
 */
export function ExercisesLearnPreview() {
  return (
    <section id="exercises-learn" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Exercises &amp;
            <span className={styles.gradientText}> Learn</span>
          </h2>
          <p className={styles.subtitle}>
            Browse the exercise library and dive into the Learning Center for in-depth guides and biomechanics.
          </p>
        </div>
        <div className={styles.grid}>
          <article className={`glass-card overflow-hidden group ${styles.card}`}>
            <a href="/exercises" className="block" data-cta="explore-exercises">
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Browse Exercises</h3>
                <p className={styles.cardDescription}>
                  Search and filter human-verified exercises. View cues, common mistakes, and muscle maps.
                </p>
                <span className={styles.ctaText}>
                  View Exercise Library
                  <ArrowRight className={styles.ctaIcon} aria-hidden />
                </span>
              </div>
            </a>
          </article>
          <article className={`glass-card overflow-hidden group ${styles.card}`}>
            <a href="/learn" className="block" data-cta="explore-learn">
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Learning Center</h3>
                <p className={styles.cardDescription}>
                  Deep-dive guides: biomechanics, step-by-step instructions, and science-based cues.
                </p>
                <span className={styles.ctaText}>
                  Explore Learn
                  <ArrowRight className={styles.ctaIcon} aria-hidden />
                </span>
              </div>
            </a>
          </article>
        </div>
      </div>
    </section>
  )
}
