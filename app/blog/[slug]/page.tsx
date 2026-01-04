import type { Metadata } from 'next'
import { BlogPostHero } from '@/components/features/blog/BlogPostHero'
import { BlogPostContent } from '@/components/features/blog/BlogPostContent'
import { RelatedPosts } from '@/components/features/blog/RelatedPosts'
import { getPostBySlug, getAllPostSlugs, getRelatedPosts } from '@/lib/blog/queries'
import { notFound } from 'next/navigation'

// ISR: Revalidate every 60 seconds (fallback)
export const revalidate = 60

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

// Dynamic generation - posts are fetched at request time with ISR
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
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found - Workout Generator',
    }
  }

  const publishedTime = post.published_at || post.created_at
  const modifiedTime = post.updated_at
  const url = `${baseUrl}/blog/${post.slug}`

  // Handle both absolute URLs and relative paths for images
  const postImage = post.featured_image
    ? post.featured_image.startsWith('http')
      ? post.featured_image
      : `${baseUrl}${post.featured_image}`
    : `${baseUrl}/og-image.jpg`

  // Use SEO overrides if available
  const title = post.seo_title || `${post.title} | Blog`
  const description =
    post.seo_description ||
    (post.excerpt.length > 160 ? post.excerpt.substring(0, 157).trim() + '...' : post.excerpt)

  return {
    title,
    description,
    keywords: post.tags,
    authors: [{ name: post.author?.name || 'Unknown' }],
    openGraph: {
      title: post.seo_title || post.title,
      description,
      type: 'article',
      url,
      publishedTime,
      modifiedTime,
      authors: [post.author?.name || 'Unknown'],
      section: post.category?.name || 'Uncategorized',
      tags: post.tags,
      images: [
        {
          url: postImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo_title || post.title,
      description,
      images: [postImage],
    },
    alternates: {
      canonical: url,
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
      },
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Get related posts
  const relatedPosts = await getRelatedPosts(post, 3)

  const publishedTime = post.published_at || post.created_at
  const modifiedTime = post.updated_at
  const url = `${baseUrl}/blog/${post.slug}`

  // Handle both absolute URLs and relative paths for images
  const postImage = post.featured_image
    ? post.featured_image.startsWith('http')
      ? post.featured_image
      : `${baseUrl}${post.featured_image}`
    : `${baseUrl}/og-image.jpg`

  // Calculate word count from content
  const wordCount = post.content.split(/\s+/).filter(word => word.length > 0).length
  // Calculate reading time (average reading speed: 200 words per minute)
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))

  // Article structured data (JSON-LD)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: postImage,
    datePublished: publishedTime,
    dateModified: modifiedTime,
    wordCount,
    timeRequired: `PT${readingTimeMinutes}M`,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'Unknown',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Workout Generator',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: post.category?.name || 'Uncategorized',
    keywords: post.tags.join(', '),
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
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: url,
      },
    ],
  }

  // Transform post for components that expect the old format
  const transformedPost = {
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
  }

  // Transform related posts
  const transformedRelatedPosts = relatedPosts.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    date: p.published_at || p.created_at,
    dateModified: p.updated_at,
    author: p.author?.name || 'Unknown',
    category: p.category?.name || 'Uncategorized',
    tags: p.tags || [],
    image: p.featured_image || undefined,
  }))

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
      <BlogPostHero post={transformedPost} />
      <BlogPostContent post={transformedPost} />
      <RelatedPosts posts={transformedRelatedPosts} />
    </>
  )
}
