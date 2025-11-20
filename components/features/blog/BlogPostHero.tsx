import React from 'react'
import { BlogPost } from '@/features/blog/types'
import { formatDate } from '@/features/blog/lib/formatDate'
import styles from './BlogPostHero.module.scss'

interface BlogPostHeroProps {
  post: BlogPost
}

export const BlogPostHero: React.FC<BlogPostHeroProps> = ({ post }) => {
  const publishedDate = new Date(post.date)
  const isoDate = publishedDate.toISOString()

  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText} data-aos="fade-up">
          <div className={styles.categoryBadge}>{post.category}</div>
          <h1 className={styles.heroTitle}>{post.title}</h1>
          {post.excerpt && <p className={styles.heroExcerpt}>{post.excerpt}</p>}
          <div className={styles.meta}>
            <time dateTime={isoDate} className={styles.date}>
              {formatDate(post.date)}
            </time>
            <span className={styles.separator} aria-hidden="true">
              •
            </span>
            <span className={styles.author}>By {post.author}</span>
          </div>
          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map(tag => (
                <span key={tag} className={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
