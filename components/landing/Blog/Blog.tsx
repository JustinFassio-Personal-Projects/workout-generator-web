'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { BlogPostCard } from '@/components/features/blog/BlogPostCard'
import { BlogPost } from '@/features/blog/types'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'
import styles from './Blog.module.scss'

export const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('aos').then(AOS => {
        AOS.default.init({
          duration: 800,
          easing: 'ease-out',
          once: true,
        })
      })
    }
  }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const allPosts = await getAllPosts()
        // Show only the 3 most recent posts on landing page
        setPosts(allPosts.slice(0, 3))
      } catch (error) {
        console.error('Error fetching blog posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  if (loading) {
    return null
  }

  if (posts.length === 0) {
    return null
  }

  return (
    <section id="blog" className={styles.blog}>
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
          {posts.map((post, index) => (
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
