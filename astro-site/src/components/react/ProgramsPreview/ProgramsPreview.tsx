import { ArrowRight } from 'lucide-react'
import type { FeaturedProgram } from '@/lib/featured/queries'
import styles from './ProgramsPreview.module.scss'

interface ProgramsPreviewProps {
  programs: FeaturedProgram[]
}

function truncate(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen).trim() + '…'
}

export function ProgramsPreview({ programs }: ProgramsPreviewProps) {
  if (programs.length === 0) return null

  return (
    <section id="programs" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Featured
            <span className={styles.gradientText}> Programs</span>
          </h2>
          <p className={styles.subtitle}>
            Science-based training plans built by certified coaches. Follow a structured program to reach your goals.
          </p>
        </div>
        <div className={styles.grid}>
          {programs.map((program) => (
            <article key={program.id} className={`glass-card overflow-hidden group ${styles.card}`}>
              <a href={`/programs/${program.id}`} className="block">
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{program.title}</h3>
                  <p className={styles.cardDescription}>
                    {truncate(program.description, 120)}
                  </p>
                  <span className={styles.ctaText}>
                    View Program
                    <ArrowRight className={styles.ctaIcon} aria-hidden />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
        <div className={styles.footer}>
          <a href="/programs" className={styles.ctaLink}>
            View All Programs
            <ArrowRight className={styles.ctaIcon} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}
