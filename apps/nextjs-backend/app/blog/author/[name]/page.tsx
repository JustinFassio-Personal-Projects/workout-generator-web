import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Linkedin, Youtube, Instagram, Facebook, Twitter, Star } from 'lucide-react'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { getAllAuthors, getPostsByAuthor, getAuthorBySlug, authorToSlug } from '@/lib/blog/queries'
import styles from './author-page.module.scss'

// ISR: Revalidate every 60 seconds
// Mark as dynamic since we use cookies() via createServerSupabaseClient() in getAuthorBySlug() and getPostsByAuthor()
export const dynamic = 'force-dynamic'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

// Dynamic generation - authors are fetched at request time with ISR
export async function generateStaticParams() {
  // Return empty array for dynamic generation
  // Pages will be generated on-demand and cached via ISR
  return []
}

interface PageProps {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params
  const author = await getAuthorBySlug(name)

  if (!author) {
    return {
      title: 'Author Not Found - Workout Generator',
    }
  }

  const description =
    author.bio ||
    `Read all articles by ${author.name} on the Workout Generator blog. Fitness tips, workout strategies, and expert advice.`

  return {
    title: `Articles by ${author.name} | Blog`,
    description,
    openGraph: {
      title: `Articles by ${author.name}`,
      description,
      type: 'website',
      url: `${baseUrl}/blog/author/${name}`,
      siteName: 'Workout Generator',
      images: [
        {
          url: author.avatar
            ? author.avatar.startsWith('http')
              ? author.avatar
              : `${baseUrl}${author.avatar}`
            : `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `Articles by ${author.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Articles by ${author.name}`,
      description,
      images: [
        author.avatar
          ? author.avatar.startsWith('http')
            ? author.avatar
            : `${baseUrl}${author.avatar}`
          : `${baseUrl}/og-image.jpg`,
      ],
    },
    alternates: {
      canonical: `${baseUrl}/blog/author/${name}`,
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
      },
    },
  }
}

export default async function AuthorPage({ params }: PageProps) {
  const { name } = await params
  const [author, posts] = await Promise.all([getAuthorBySlug(name), getPostsByAuthor(name)])

  if (!author) {
    notFound()
  }

  // Transform posts for BlogPostList
  // In development, use relative paths for local images; in production, use absolute URLs
  const isDevelopment = process.env.NODE_ENV === 'development'
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
    image: post.featured_image
      ? post.featured_image.startsWith('http')
        ? post.featured_image
        : isDevelopment
          ? post.featured_image
          : `${baseUrl}${post.featured_image}`
      : undefined,
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
        name: author.name,
        item: `${baseUrl}/blog/author/${name}`,
      },
    ],
  }

  // Author structured data
  const authorSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `${baseUrl}/blog/author/${name}`,
    description: author.bio,
    image: author.avatar
      ? author.avatar.startsWith('http')
        ? author.avatar
        : `${baseUrl}${author.avatar}`
      : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema) }}
      />
      <section className={styles.authorHeader}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className={styles.separator}>/</span>
            <Link href="/blog">Blog</Link>
            <span className={styles.separator}>/</span>
            <span aria-current="page">{author.name}</span>
          </nav>
          <h1 className={styles.title}>Articles by {author.name}</h1>
          {author.bio && <p className={styles.bio}>{author.bio}</p>}

          {author.name === 'Justin Fassio' && (
            <div className={styles.socialLinks} style={{ marginTop: '1rem' }}>
              <a
                href="https://www.youtube.com/@aiworkoutgen"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className={styles.socialLink}
              >
                <Youtube size={20} />
              </a>
              <a
                href="https://www.instagram.com/aiworkoutgenerator/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={styles.socialLink}
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.linkedin.com/in/justinfassio/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Personal"
                className={styles.socialLink}
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://www.linkedin.com/company/ai-workout-generator/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Company"
                className={styles.socialLink}
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://www.facebook.com/aiworkoutgenerator"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={styles.socialLink}
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://x.com/AI_Workout"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className={styles.socialLink}
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://www.yelp.com/biz/san-diego-core-fitness-san-diego-san-diego?osq=San+Diego+Core+Fitness"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Yelp Reviews"
                className={styles.socialLink}
              >
                <Star size={20} />
              </a>
            </div>
          )}

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
