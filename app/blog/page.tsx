import type { Metadata } from 'next'
import { BlogHero } from '@/components/features/blog/BlogHero'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'
import styles from './blog-page.module.scss'

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
        <BlogPostList posts={posts} />
      </div>
    </>
  )
}
