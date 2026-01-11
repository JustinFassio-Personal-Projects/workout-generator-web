import type { Metadata } from 'next'
import { reports } from '@/types/reports'
import { notFound } from 'next/navigation'
import { ReportV2Content } from '@/components/features/reports/ReportV2Content'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function generateStaticParams() {
  return reports.map(report => ({
    slug: report.slug,
  }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const report = reports.find(r => r.slug === slug)

  if (!report) {
    return {
      title: 'Report Not Found - AI Workout Generator',
    }
  }

  const url = `${baseUrl}/reports/${report.slug}`
  const image = report.image
    ? report.image.startsWith('http')
      ? report.image
      : `${baseUrl}${report.image}`
    : `${baseUrl}/og-image.jpg`

  return {
    title: `${report.title} | Reports`,
    description: report.excerpt,
    keywords: [
      'AI workout generator',
      'fitness technology',
      'training systems',
      'workout analysis',
      'fitness research',
    ],
    openGraph: {
      title: `${report.title} | Reports`,
      description: report.excerpt,
      url,
      siteName: 'AI Workout Generator',
      type: 'article',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: report.title,
        },
      ],
      publishedTime: report.date,
      modifiedTime: report.dateModified || report.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${report.title} | Reports`,
      description: report.excerpt,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params
  const report = reports.find(r => r.slug === slug)

  if (!report) {
    notFound()
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: report.title,
            description: report.excerpt,
            image: report.image
              ? report.image.startsWith('http')
                ? report.image
                : `${baseUrl}${report.image}`
              : `${baseUrl}/og-image.jpg`,
            datePublished: report.date,
            dateModified: report.dateModified || report.date,
            author: {
              '@type': 'Person',
              name: 'Justin Fassio',
            },
            publisher: {
              '@type': 'Organization',
              name: 'AI Workout Generator',
              logo: {
                '@type': 'ImageObject',
                url: `${baseUrl}/logo.png`,
              },
            },
          }),
        }}
      />
      <ReportV2Content report={report} />
    </>
  )
}
