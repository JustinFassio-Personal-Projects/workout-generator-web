'use client'

import React, { useEffect, useState } from 'react'
import { fallbackPosts } from '@/data/blog/fallback-posts'
import type { TransformedPost } from '@/types/blog'
import styles from './BlogPreview.module.scss'

interface ApiPost {
  id: string
  slug: string
  title: string
  excerpt: string
  featured_image?: string | null
  published_at?: string | null
  category?: { name: string } | null
  author?: { name: string } | null
}

function formatDate(value: string | undefined | null): string {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function toPreviewPost(p: ApiPost | TransformedPost): {
  slug: string
  title: string
  excerpt: string
  image: string
  date: string
  author: string
} {
  if ('date' in p) {
    const t = p as TransformedPost
    return {
      slug: t.slug,
      title: t.title,
      excerpt: t.excerpt,
      image: t.image || '',
      date: t.date,
      author: t.author || 'Team',
    }
  }
  const a = p as ApiPost
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    image: a.featured_image || '',
    date: a.published_at ? formatDate(a.published_at) : '',
    author: a.author?.name || 'Team',
  }
}

export const BlogPreview: React.FC = () => {
  const [posts, setPosts] = useState<
    { slug: string; title: string; excerpt: string; image: string; date: string; author: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    fetch(`${base}/api/blog`)
      .then(res => res.json())
      .then((data: ApiPost[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data.slice(0, 3).map(toPreviewPost))
        } else {
          setPosts(fallbackPosts.slice(0, 3).map(toPreviewPost))
        }
      })
      .catch(() => {
        setPosts(fallbackPosts.slice(0, 3).map(toPreviewPost))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section id="blog-preview" className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.heading}>
            Latest from the <span className={styles.gradientText}>Blog</span>
          </h2>
          <p className={styles.loading}>Loading posts…</p>
        </div>
      </section>
    )
  }

  return (
    <section id="blog-preview" className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.heading}>
          Latest from the <span className={styles.gradientText}>Blog</span>
        </h2>
        <p className={styles.subtitle}>Tips, science, and updates from our team.</p>
        <div className={styles.grid}>
          {posts.map(post => (
            <a key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
              {post.image && (
                <div className={styles.imageWrap}>
                  <img src={post.image} alt="" className={styles.image} />
                </div>
              )}
              <div className={styles.body}>
                <h3 className={styles.title}>{post.title}</h3>
                <p className={styles.excerpt}>{post.excerpt}</p>
                <span className={styles.meta}>
                  {post.date && `${post.date} · `}
                  {post.author}
                </span>
              </div>
            </a>
          ))}
        </div>
        <a href="/blog" className={styles.cta}>
          View All Posts
        </a>
      </div>
    </section>
  )
}
