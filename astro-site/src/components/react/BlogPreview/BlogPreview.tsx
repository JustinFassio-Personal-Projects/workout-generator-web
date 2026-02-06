'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { BlogPreviewCard, type BlogPreviewPost } from './BlogPreviewCard'
import { fallbackPosts } from '@/data/blog/fallback-posts'
import type { TransformedPost } from '@/types/blog'
import styles from './BlogPreview.module.scss'

function fallbackToPreview(p: TransformedPost): BlogPreviewPost {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    author: p.author,
    category: p.category,
    image: p.image,
    tags: p.tags ?? [],
  }
}

const FALLBACK_PREVIEW_POSTS: BlogPreviewPost[] = fallbackPosts.slice(0, 3).map(fallbackToPreview)

/** Raw post shape returned by /api/blog (Supabase rows with joins) */
interface ApiPostRow {
  id: string
  slug: string
  title: string
  excerpt: string
  featured_image: string | null
  published_at: string | null
  category?:
    | { id: string; slug: string; name: string }
    | { id: string; slug: string; name: string }[]
  author?:
    | { id: string; name: string; avatar?: string }
    | { id: string; name: string; avatar?: string }[]
}

function transformRow(row: ApiPostRow): BlogPreviewPost {
  const category = row.category
  const author = row.author
  const categoryName = Array.isArray(category) ? category[0]?.name : category?.name
  const authorName = Array.isArray(author) ? author[0]?.name : author?.name

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    date: row.published_at ?? '',
    author: authorName ?? 'Unknown',
    category: categoryName ?? 'Uncategorized',
    image: row.featured_image ?? undefined,
    tags: [],
  }
}

export function BlogPreview() {
  const [posts, setPosts] = useState<BlogPreviewPost[]>(() => FALLBACK_PREVIEW_POSTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchPosts() {
      try {
        const res = await fetch('/api/blog')
        if (cancelled) return
        if (!res.ok) {
          setPosts(FALLBACK_PREVIEW_POSTS)
          setLoading(false)
          return
        }
        let data: unknown
        try {
          data = await res.json()
        } catch {
          if (!cancelled) {
            setPosts(FALLBACK_PREVIEW_POSTS)
            setLoading(false)
          }
          return
        }
        if (cancelled) return
        if (data && typeof data === 'object' && 'error' in data) {
          setPosts(FALLBACK_PREVIEW_POSTS)
          setLoading(false)
          return
        }
        if (!Array.isArray(data)) {
          setPosts(FALLBACK_PREVIEW_POSTS)
          setLoading(false)
          return
        }
        const transformed = (data as ApiPostRow[]).slice(0, 3).map(transformRow)
        setPosts(transformed.length > 0 ? transformed : FALLBACK_PREVIEW_POSTS)
      } catch {
        if (!cancelled) setPosts(FALLBACK_PREVIEW_POSTS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPosts()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="blog" className={styles.blog}>
      <div className={styles.container}>
        <div className={styles.header}>
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
          {posts.map(post => (
            <BlogPreviewCard key={post.slug} post={post} className={styles.card} />
          ))}
        </div>
        <div className={styles.cta}>
          <a href="/blog" className={styles.ctaLink}>
            View All Posts
            <ArrowRight className={styles.ctaIcon} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}
