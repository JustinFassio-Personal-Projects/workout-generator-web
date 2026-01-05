import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StoryHero } from '@/components/features/story/StoryHero'
import { MilestoneContent } from '@/components/features/story/MilestoneContent'
import { StoryPageClient } from '@/components/features/story/StoryPageClient'
import {
  getMilestoneBySlug,
  getAllMilestoneSlugs,
  getRelatedChapterSlugs,
} from '@/data/story/milestones'
import { getChaptersByOrder } from '@/data/story/chapters'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

// Dynamic generation - milestones are generated at request time
export async function generateStaticParams() {
  // Return empty array for dynamic generation
  // Pages will be generated on-demand and cached via ISR
  return []
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const milestone = getMilestoneBySlug(slug)

  if (!milestone) {
    return {
      title: 'Chapter Not Found - AIWorkoutGenerator',
    }
  }

  const url = `${baseUrl}/story/${milestone.slug}`
  const title = milestone.seoTitle || `${milestone.title} | Founder Story`
  const description =
    milestone.seoDescription ||
    milestone.tagline ||
    `Learn about ${milestone.title} in the founder's story.`

  return {
    title,
    description,
    keywords: [
      'founder story',
      'AI workout generator',
      'fitness coach',
      milestone.slug,
      milestone.title.toLowerCase(),
    ],
    authors: [{ name: 'Justin Fassio' }],
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      siteName: 'AIWorkoutGenerator',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: milestone.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function MilestonePage({ params }: PageProps) {
  const { slug } = await params
  const milestone = getMilestoneBySlug(slug)

  if (!milestone) {
    notFound()
  }

  const url = `${baseUrl}/story/${milestone.slug}`

  // Get related chapters (uses manual relationships or falls back to order-based)
  const relatedChapterSlugs = getRelatedChapterSlugs(milestone)
  const chapters = getChaptersByOrder()
  const relatedChapters = chapters.filter(chapter => relatedChapterSlugs.includes(chapter.slug))

  // Article structured data (JSON-LD)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: milestone.title,
    description: milestone.tagline || milestone.title,
    url,
    inLanguage: 'en-US',
    author: {
      '@type': 'Person',
      name: 'Justin Fassio',
      jobTitle: 'Founder',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AIWorkoutGenerator',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: 'Founder Story',
    isPartOf: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/founder-story`,
      name: 'Founder Story',
    },
  }

  // BreadcrumbList structured data (JSON-LD)
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Founder Story',
        item: `${baseUrl}/founder-story`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: milestone.title,
        item: url,
      },
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
      <main>
        <StoryPageClient />
        <StoryHero
          title={milestone.title}
          tagline={milestone.tagline}
          heroText={milestone.heroText}
        />
        <MilestoneContent milestone={milestone} relatedChapters={relatedChapters} />
      </main>
    </>
  )
}
