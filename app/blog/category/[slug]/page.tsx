import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import {
  getAllCategories,
  getPostsByCategory,
  categoryToSlug,
} from '@/features/blog/lib/getBlogPosts'
import styles from './category-page.module.scss'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function generateStaticParams() {
  const categories = await getAllCategories()
  return categories.map(category => ({ slug: categoryToSlug(category) }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const posts = await getPostsByCategory(params.slug)

  if (posts.length === 0) {
    return {
      title: 'Category Not Found - Workout Generator',
    }
  }

  // Get the original category name from the first post
  const categoryName = posts[0].category
  const description = `Browse all ${categoryName.toLowerCase()} articles on the Workout Generator blog. Fitness tips, workout strategies, and expert advice.`

  return {
    title: `${categoryName} | Blog`,
    description,
    openGraph: {
      title: `${categoryName} Articles`,
      description,
      type: 'website',
      url: `${baseUrl}/blog/category/${params.slug}`,
      siteName: 'Workout Generator',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `${categoryName} Articles`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${categoryName} Articles`,
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${baseUrl}/blog/category/${params.slug}`,
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
      },
    },
  }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const posts = await getPostsByCategory(params.slug)

  if (posts.length === 0) {
    notFound()
  }

  const categoryName = posts[0].category

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
        name: categoryName,
        item: `${baseUrl}/blog/category/${params.slug}`,
      },
    ],
  }

  // CollectionPage structured data
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryName} Articles`,
    description: `Browse all ${categoryName.toLowerCase()} articles on the Workout Generator blog.`,
    url: `${baseUrl}/blog/category/${params.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          headline: post.title,
          url: `${baseUrl}/blog/${post.slug}`,
        },
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <section className={styles.categoryHeader}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span className={styles.separator}>/</span>
            <a href="/blog">Blog</a>
            <span className={styles.separator}>/</span>
            <span aria-current="page">{categoryName}</span>
          </nav>
          <h1 className={styles.title}>{categoryName}</h1>
          <p className={styles.postCount}>
            {posts.length} {posts.length === 1 ? 'article' : 'articles'}
          </p>
        </div>
      </section>
      <div className={styles.postsContainer}>
        <BlogPostList posts={posts} />
      </div>
    </>
  )
}
