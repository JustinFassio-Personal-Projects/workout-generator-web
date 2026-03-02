import type { Metadata } from 'next'
import { getAllPublishedDeepResearch } from '@/lib/deep-research/queries'
import { DeepResearchPageClient } from '@/components/features/deep-research/DeepResearchPageClient'
import styles from './deep-research-page.module.scss'

export const dynamic = 'force-dynamic'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function generateMetadata(): Promise<Metadata> {
  const description =
    'In-depth research and protocols for fitness, nutrition, and health optimization. Filter by your vitals to find relevant deep research.'

  return {
    title: 'Deep Research | AI Workout Generator',
    description,
    keywords: [
      'fitness research',
      'workout protocols',
      'nutrition science',
      'health optimization',
      'training research',
    ],
    openGraph: {
      title: 'Deep Research | AI Workout Generator',
      description,
      url: `${baseUrl}/deep-research`,
      siteName: 'AI Workout Generator',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Deep Research | AI Workout Generator',
      description,
    },
    alternates: {
      canonical: `${baseUrl}/deep-research`,
    },
  }
}

export default async function DeepResearchPage() {
  const items = await getAllPublishedDeepResearch()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Deep Research</h1>
        <p className={styles.subtitle}>
          In-depth protocols and research for fitness, nutrition, and health optimization. Set your
          vitals to find relevant articles.
        </p>
      </header>
      <DeepResearchPageClient items={items} />
    </div>
  )
}
