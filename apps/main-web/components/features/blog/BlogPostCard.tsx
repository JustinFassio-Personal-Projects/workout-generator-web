'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/Card/Card'
import { BlogPost } from '@/features/blog/types'
import { formatDate } from '@/features/blog/lib/formatDate'
import { trackVercelEvent } from '@/lib/analytics'
import styles from './BlogPostCard.module.scss'

interface BlogPostCardProps {
  post: BlogPost
}

const DEFAULT_IMAGE = '/og-image.jpg'

export const BlogPostCard: React.FC<BlogPostCardProps> = ({ post }) => {
  const handleClick = () => {
    trackVercelEvent('Blog Post Click', {
      post_slug: post.slug,
      post_title: post.title.substring(0, 255), // Ensure within limit
      post_category: post.category,
      location: 'blog_card',
    })
  }

  const postImage = post.image || DEFAULT_IMAGE

  return (
    <Card hover={true}>
      <Link href={`/blog/${post.slug}`} className={styles.cardLink} onClick={handleClick}>
        <div className={styles.imageWrapper}>
          <Image
            src={postImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            className={styles.image}
          />
        </div>
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
