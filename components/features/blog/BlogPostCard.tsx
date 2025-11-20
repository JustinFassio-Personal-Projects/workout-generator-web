import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card/Card'
import { BlogPost } from '@/features/blog/types'
import { formatDate } from '@/features/blog/lib/formatDate'
import styles from './BlogPostCard.module.scss'

interface BlogPostCardProps {
  post: BlogPost
}

export const BlogPostCard: React.FC<BlogPostCardProps> = ({ post }) => {
  return (
    <Card hover={true}>
      <Link href={`/blog/${post.slug}`} className={styles.cardLink}>
        <div className={styles.cardContent}>
          <div>
            <span className={styles.category}>{post.category}</span>
          </div>
          <h3 className={styles.title}>{post.title}</h3>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <div className={styles.footer}>
            <span className={styles.date}>{formatDate(post.date)}</span>
            <span className={styles.readMore}>Read more →</span>
          </div>
        </div>
      </Link>
    </Card>
  )
}
