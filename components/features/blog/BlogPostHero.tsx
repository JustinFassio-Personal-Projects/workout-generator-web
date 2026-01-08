import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BlogPost } from '@/features/blog/types'
import { formatDate } from '@/features/blog/lib/formatDate'
import { authorToSlug, categoryToSlug } from '@/features/blog/lib/getBlogPosts'
import styles from './BlogPostHero.module.scss'

interface BlogPostHeroProps {
  post: BlogPost
}

const DEFAULT_IMAGE = '/og-image.jpg'

export const BlogPostHero: React.FC<BlogPostHeroProps> = ({ post }) => {
  // Parse date safely, handling both date strings and timestamps
  let publishedDate: Date
  try {
    // If it's a simple date string (YYYY-MM-DD), parse it explicitly
    if (post.date && /^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
      const [year, month, day] = post.date.split('-').map(Number)
      publishedDate = new Date(year, month - 1, day)
    } else {
      publishedDate = new Date(post.date)
    }
  } catch (error) {
    console.error('Error parsing date:', post.date, error)
    publishedDate = new Date()
  }

  // Validate date before using
  if (isNaN(publishedDate.getTime())) {
    console.error('Invalid date:', post.date)
    publishedDate = new Date()
  }

  const isoDate = publishedDate.toISOString()
  const heroImage = post.image || DEFAULT_IMAGE
  const authorSlug = authorToSlug(post.author)
  const categorySlug = categoryToSlug(post.category)

  return (
    <section className={styles.hero}>
      <div className={styles.heroImageWrapper}>
        <Image
          src={heroImage}
          alt={post.title}
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroImageOverlay} />
      </div>
      <div className={styles.heroContent}>
        <div className={styles.heroText} data-aos="fade-up">
          <Link href={`/blog/category/${categorySlug}`} className={styles.categoryBadge}>
            {post.category}
          </Link>
          <h1 className={styles.heroTitle}>{post.title}</h1>
          {post.excerpt && <p className={styles.heroExcerpt}>{post.excerpt}</p>}
          <div className={styles.meta}>
            <time dateTime={isoDate} className={styles.date}>
              {formatDate(post.date)}
            </time>
            <span className={styles.separator} aria-hidden="true">
              •
            </span>
            <Link href={`/blog/author/${authorSlug}`} className={styles.authorLink}>
              By {post.author}
            </Link>
          </div>
          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/blog?search=${encodeURIComponent(tag)}`}
                  className={styles.tag}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
