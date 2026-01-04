import type { Metadata } from 'next'
import { BlogHero } from '@/components/features/blog/BlogHero'
import { BlogPageClient } from '@/components/features/blog/BlogPageClient'
import { getAllPublishedPosts } from '@/lib/blog/queries'
import styles from './blog-page.module.scss'

// ISR: Revalidate every 60 seconds (fallback)
// Primary revalidation happens on-demand when admin publishes
export const revalidate = 60

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function generateMetadata(): Promise<Metadata> {
  const description =
    'Discover expert fitness tips, workout strategies, and AI-powered training advice to help you achieve your goals. Start your journey today!'

  return {
    title: 'Blog | Fitness Tips & Workout Strategies',
    description,
    keywords: [
      'fitness blog',
      'workout tips',
      'exercise advice',
      'fitness strategies',
      'workout plans',
      'fitness articles',
      'health and wellness',
      'training tips',
      'AI workouts',
      'personalized fitness',
    ],
    authors: [{ name: 'Workout Generator' }],
    openGraph: {
      title: 'Blog | Fitness Tips & Workout Strategies',
      description,
      type: 'website',
      url: `${baseUrl}/blog`,
      siteName: 'Workout Generator',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: 'Workout Generator Blog - Fitness Tips & Workout Strategies',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog | Fitness Tips & Workout Strategies',
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${baseUrl}/blog`,
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
      },
    },
  }
}

export default async function BlogPage() {
  const posts = await getAllPublishedPosts()

  // Transform posts to match the expected format for BlogPageClient
  const transformedPosts = posts.map(post => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    date: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: post.author?.name || 'Unknown',
    category: post.category?.name || 'Uncategorized',
    tags: post.tags || [],
    image: post.featured_image || undefined,
  }))

  // Blog/CollectionPage structured data (JSON-LD)
  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Workout Generator Blog',
    description:
      'Discover fitness tips, workout strategies, and expert advice to help you achieve your fitness goals.',
    url: `${baseUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'Workout Generator',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at,
      author: {
        '@type': 'Person',
        name: post.author?.name || 'Unknown',
      },
      articleSection: post.category?.name || 'Uncategorized',
      image: post.featured_image
        ? post.featured_image.startsWith('http')
          ? post.featured_image
          : `${baseUrl}${post.featured_image}`
        : `${baseUrl}/og-image.jpg`,
    })),
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
        name: 'Blog',
        item: `${baseUrl}/blog`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <BlogHero />
      <div className={styles.blogContainer}>
        <BlogPageClient posts={transformedPosts} />
      </div>
    </>
  )
}
