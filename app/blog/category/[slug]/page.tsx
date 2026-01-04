import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { getAllCategories, getPostsByCategory, getCategoryBySlug } from '@/lib/blog/queries'
import styles from './category-page.module.scss'

// ISR: Revalidate every 60 seconds
export const revalidate = 60

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

// Dynamic generation - categories are fetched at request time with ISR
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
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return {
      title: 'Category Not Found - Workout Generator',
    }
  }

  const description =
    category.description ||
    `Browse all ${category.name.toLowerCase()} articles on the Workout Generator blog. Fitness tips, workout strategies, and expert advice.`

  return {
    title: `${category.name} | Blog`,
    description,
    openGraph: {
      title: `${category.name} Articles`,
      description,
      type: 'website',
      url: `${baseUrl}/blog/category/${slug}`,
      siteName: 'Workout Generator',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `${category.name} Articles`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.name} Articles`,
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${baseUrl}/blog/category/${slug}`,
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
      },
    },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const [category, posts] = await Promise.all([getCategoryBySlug(slug), getPostsByCategory(slug)])

  if (!category) {
    notFound()
  }

  // Transform posts for BlogPostList
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
        name: category.name,
        item: `${baseUrl}/blog/category/${slug}`,
      },
    ],
  }

  // CollectionPage structured data
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Articles`,
    description:
      category.description ||
      `Browse all ${category.name.toLowerCase()} articles on the Workout Generator blog.`,
    url: `${baseUrl}/blog/category/${slug}`,
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
            <span aria-current="page">{category.name}</span>
          </nav>
          <h1 className={styles.title}>{category.name}</h1>
          {category.description && <p className={styles.description}>{category.description}</p>}
          <p className={styles.postCount}>
            {posts.length} {posts.length === 1 ? 'article' : 'articles'}
          </p>
        </div>
      </section>
      <div className={styles.postsContainer}>
        <BlogPostList posts={transformedPosts} />
      </div>
    </>
  )
}
