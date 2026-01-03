import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { getAllAuthors, getPostsByAuthor, authorToSlug } from '@/features/blog/lib/getBlogPosts'
import styles from './author-page.module.scss'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function generateStaticParams() {
  const authors = await getAllAuthors()
  return authors.map(author => ({ name: authorToSlug(author) }))
}

export async function generateMetadata({
  params,
}: {
  params: { name: string }
}): Promise<Metadata> {
  const posts = await getPostsByAuthor(params.name)

  if (posts.length === 0) {
    return {
      title: 'Author Not Found - Workout Generator',
    }
  }

  // Get the original author name from the first post
  const authorName = posts[0].author
  const description = `Read all articles by ${authorName} on the Workout Generator blog. Fitness tips, workout strategies, and expert advice.`

  return {
    title: `Articles by ${authorName} | Blog`,
    description,
    openGraph: {
      title: `Articles by ${authorName}`,
      description,
      type: 'website',
      url: `${baseUrl}/blog/author/${params.name}`,
      siteName: 'Workout Generator',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `Articles by ${authorName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Articles by ${authorName}`,
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${baseUrl}/blog/author/${params.name}`,
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
      },
    },
  }
}

export default async function AuthorPage({ params }: { params: { name: string } }) {
  const posts = await getPostsByAuthor(params.name)

  if (posts.length === 0) {
    notFound()
  }

  const authorName = posts[0].author

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
        name: authorName,
        item: `${baseUrl}/blog/author/${params.name}`,
      },
    ],
  }

  // Author structured data
  const authorSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: authorName,
    url: `${baseUrl}/blog/author/${params.name}`,
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
            <a href="/">Home</a>
            <span className={styles.separator}>/</span>
            <a href="/blog">Blog</a>
            <span className={styles.separator}>/</span>
            <span aria-current="page">{authorName}</span>
          </nav>
          <h1 className={styles.title}>Articles by {authorName}</h1>
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
