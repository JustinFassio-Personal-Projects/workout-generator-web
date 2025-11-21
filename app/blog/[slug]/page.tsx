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

  return {
    title: `${post.title} | Blog - Workout Generator`,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
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
      description: post.excerpt,
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
  const postImage = post.image ? `${baseUrl}${post.image}` : `${baseUrl}/og-image.jpg`

  // Calculate word count from content (approximate)
  const wordCount = post.content.split(/\s+/).filter(word => word.length > 0).length

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BlogPostHero post={post} />
      <BlogPostContent post={post} />
    </>
  )
}
