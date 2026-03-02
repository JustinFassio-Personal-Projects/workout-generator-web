import type { Metadata } from 'next'
import { getDeepResearchBySlug } from '@/lib/deep-research/queries'
import { notFound } from 'next/navigation'
import { DeepResearchContent } from '@/components/features/deep-research/DeepResearchContent'
import styles from './page.module.scss'

export const dynamic = 'force-dynamic'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = await getDeepResearchBySlug(slug)

  if (!item) {
    return { title: 'Not Found - AI Workout Generator' }
  }

  const title = item.seo_title || `${item.title} | Deep Research`
  const description =
    item.seo_description ||
    (item.excerpt && item.excerpt.length > 160
      ? item.excerpt.substring(0, 157).trim() + '...'
      : item.excerpt || `Deep research: ${item.title}`)
  const url = `${baseUrl}/deep-research/${item.slug}`
  const publishedTime = item.published_at || item.created_at
  const modifiedTime = item.updated_at

  return {
    title,
    description,
    openGraph: {
      title: item.seo_title || item.title,
      description,
      type: 'article',
      url,
      publishedTime,
      modifiedTime,
      siteName: 'AI Workout Generator',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: item.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.seo_title || item.title,
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function DeepResearchDetailPage({ params }: PageProps) {
  const { slug } = await params
  const item = await getDeepResearchBySlug(slug)

  if (!item) {
    notFound()
  }

  const url = `${baseUrl}/deep-research/${item.slug}`
  const publishedTime = item.published_at || item.created_at
  const modifiedTime = item.updated_at

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.title,
    description: item.excerpt || item.title,
    url,
    datePublished: publishedTime,
    dateModified: modifiedTime,
    publisher: {
      '@type': 'Organization',
      name: 'AI Workout Generator',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Deep Research', item: `${baseUrl}/deep-research` },
      { '@type': 'ListItem', position: 3, name: item.title, item: url },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <article className={styles.article}>
        <header className={styles.header}>
          <h1 className={styles.title}>{item.title}</h1>
          {item.excerpt && <p className={styles.excerpt}>{item.excerpt}</p>}
          <time dateTime={publishedTime} className={styles.date}>
            {new Date(publishedTime).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>
        <DeepResearchContent htmlContent={item.html_content} />
      </article>
    </>
  )
}
