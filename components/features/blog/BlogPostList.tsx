import React from 'react'
import { BlogPostCard } from './BlogPostCard'
import { BlogPost } from '@/features/blog/types'
import styles from './BlogPostList.module.scss'

interface BlogPostListProps {
  posts: BlogPost[]
}

export const BlogPostList: React.FC<BlogPostListProps> = ({ posts }) => {
  if (posts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateText}>No blog posts found.</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {posts.map(post => (
        <BlogPostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
