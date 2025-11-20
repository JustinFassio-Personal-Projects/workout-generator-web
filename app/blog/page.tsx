import type { Metadata } from 'next'
import { BlogHero } from '@/components/features/blog/BlogHero'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'
import styles from './blog-page.module.scss'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Blog - Workout Generator | Fitness Tips & Workout Strategies',
    description:
      'Discover fitness tips, workout strategies, and expert advice to help you achieve your fitness goals. Learn about AI-powered workouts, nutrition, home fitness, and more.',
    keywords: [
      'fitness blog',
      'workout tips',
      'exercise advice',
      'fitness strategies',
      'workout plans',
      'fitness articles',
      'health and wellness',
      'training tips',
    ],
    authors: [{ name: 'Workout Generator' }],
    openGraph: {
      title: 'Blog - Workout Generator | Fitness Tips & Workout Strategies',
      description:
        'Discover fitness tips, workout strategies, and expert advice to help you achieve your fitness goals.',
      type: 'website',
      url: `${baseUrl}/blog`,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog - Workout Generator | Fitness Tips & Workout Strategies',
      description:
        'Discover fitness tips, workout strategies, and expert advice to help you achieve your fitness goals.',
    },
    alternates: {
      canonical: `${baseUrl}/blog`,
    },
  }
}

export default async function BlogPage() {
  const posts = await getAllPosts()

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
      datePublished: new Date(post.date).toISOString(),
      author: {
        '@type': 'Person',
        name: post.author,
      },
      articleSection: post.category,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <BlogHero />
      <div className={styles.blogContainer}>
        <BlogPostList posts={posts} />
      </div>
    </>
  )
}
