import type { Metadata } from 'next'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

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
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Blog</h1>
          <p className="text-lg text-gray-600">
            Discover fitness tips, workout strategies, and expert advice to help you achieve your
            goals.
          </p>
        </div>
        <BlogPostList posts={posts} />
      </div>
    </>
  )
}
