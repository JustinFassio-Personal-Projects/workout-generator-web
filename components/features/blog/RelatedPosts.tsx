import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BlogPost } from '@/features/blog/types'
import { formatDate } from '@/features/blog/lib/formatDate'
import styles from './RelatedPosts.module.scss'

interface RelatedPostsProps {
  posts: BlogPost[]
}

const DEFAULT_IMAGE = '/og-image.jpg'

export const RelatedPosts: React.FC<RelatedPostsProps> = ({ posts }) => {
  if (posts.length === 0) {
    return null
  }

  return (
    <section className={styles.relatedPosts}>
      <div className={styles.container}>
        <h2 className={styles.title}>Related Articles</h2>
        <div className={styles.grid}>
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className={styles.card}>
              <div className={styles.imageWrapper}>
                <Image
                  src={post.image || DEFAULT_IMAGE}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className={styles.image}
                />
              </div>
              <div className={styles.content}>
                <span className={styles.category}>{post.category}</span>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <span className={styles.date}>{formatDate(post.date)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
