'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { BlogPostCard } from '@/components/features/blog/BlogPostCard'
import { useBlogPosts } from '@/features/blog/hooks/useBlogPosts'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import styles from './Blog.module.scss'

export const Blog: React.FC = () => {
  const { posts, loading } = useBlogPosts()

  // Show only the 3 most recent posts on landing page
  const recentPosts = posts.slice(0, 3)

  if (loading) {
    return null
  }

  if (recentPosts.length === 0) {
    return null
  }

  return (
    <section id="blog" className={styles.blog}>
      <LogoWatermark position="bottom-right" opacity={0.04} size={280} rotation={-8} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Latest from Our
            <span className={styles.gradientText}> Blog</span>
          </h2>
          <p className={styles.subtitle}>
            Discover fitness tips, workout strategies, and expert advice to help you achieve your
            goals.
          </p>
        </div>
        <div className={styles.grid}>
          {recentPosts.map((post, index) => (
            <div key={post.id} data-aos="fade-up" data-aos-delay={index * 100}>
              <BlogPostCard post={post} />
            </div>
          ))}
        </div>
        <div className={styles.cta} data-aos="fade-up" data-aos-delay="300">
          <Link href="/blog">
            <Button variant="secondary" size="lg" icon={ArrowRight} iconPosition="right">
              View All Posts
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
