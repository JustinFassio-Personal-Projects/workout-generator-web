import type { Metadata } from 'next'
import Link from 'next/link'
import { reports } from '@/types/reports'
import styles from './reports-page.module.scss'

export const dynamic = 'force-static'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function generateMetadata(): Promise<Metadata> {
  const description =
    'In-depth research reports analyzing AI workout generators, training systems, and fitness technology trends.'

  return {
    title: 'Reports | AI Workout Generator Research',
    description,
    keywords: [
      'fitness research',
      'AI workout analysis',
      'training system reports',
      'fitness technology',
    ],
    openGraph: {
      title: 'Reports | AI Workout Generator Research',
      description,
      url: `${baseUrl}/reports`,
      siteName: 'AI Workout Generator',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Reports | AI Workout Generator Research',
      description,
    },
  }
}

export default function ReportsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Research Reports</h1>
        <p className={styles.subtitle}>
          In-depth analysis of AI workout generators, training systems, and fitness technology
          trends.
        </p>
      </div>

      <div className={styles.reportsGrid}>
        {reports.map(report => (
          <Link key={report.id} href={`/reports/${report.slug}`} className={styles.reportCard}>
            {report.image && (
              <div className={styles.imageContainer}>
                <img src={report.image} alt={report.title} className={styles.image} />
              </div>
            )}
            <div className={styles.content}>
              <div className={styles.badge}>Interactive Report</div>
              <h2 className={styles.cardTitle}>{report.title}</h2>
              <p className={styles.excerpt}>{report.excerpt}</p>
              <div className={styles.meta}>
                <span className={styles.date}>
                  {new Date(report.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
