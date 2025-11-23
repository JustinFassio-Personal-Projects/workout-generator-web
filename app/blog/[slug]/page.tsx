import type { Metadata } from 'next'
import { BlogPostHero } from '@/components/features/blog/BlogPostHero'
import { BlogPostContent } from '@/components/features/blog/BlogPostContent'
import { getPostBySlug, getAllPostSlugs } from '@/features/blog/lib/getBlogPosts'
import { notFound } from 'next/navigation'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    return {
      title: 'Post Not Found - Workout Generator',
    }
  }

  const publishedTime = new Date(post.date).toISOString()
  const modifiedTime = post.dateModified ? new Date(post.dateModified).toISOString() : publishedTime
  const url = `${baseUrl}/blog/${post.slug}`
  const postImage = post.image ? `${baseUrl}${post.image}` : `${baseUrl}/og-image.jpg`

  // Optimize description to 150-160 characters for better SERP display
  const optimizedDescription =
    post.excerpt.length > 160 ? post.excerpt.substring(0, 157).trim() + '...' : post.excerpt

  return {
    title: `${post.title} | Blog`,
    description: optimizedDescription,
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: optimizedDescription,
      type: 'article',
      url,
      publishedTime,
      modifiedTime,
      authors: [post.author],
      section: post.category,
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
      title: post.title,
      description: optimizedDescription,
      images: [postImage],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const publishedTime = new Date(post.date).toISOString()
  const modifiedTime = post.dateModified ? new Date(post.dateModified).toISOString() : publishedTime
  const url = `${baseUrl}/blog/${post.slug}`
  const postImage = post.image ? `${baseUrl}${post.image}` : `${baseUrl}/og-image.jpg`

  // Calculate word count from content (approximate)
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
      name: post.author,
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
      '@id': `${baseUrl}/blog/${post.slug}`,
    },
    articleSection: post.category,
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
      <BlogPostHero post={post} />
      <BlogPostContent post={post} />
    </>
  )
}
