'use client'

import React, { useState, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BlogPost } from '@/features/blog/types'
import { BlogSearch } from './BlogSearch'
import { BlogPostList } from './BlogPostList'
import { BlogPagination } from './BlogPagination'
import styles from './BlogPageClient.module.scss'

const POSTS_PER_PAGE = 10

interface BlogPageClientProps {
  posts: BlogPost[]
}

function BlogPageClientInner({ posts }: BlogPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('search') || ''
  const initialPage = parseInt(searchParams.get('page') || '1', 10)

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [currentPage, setCurrentPage] = useState(initialPage)

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
      return posts
    }

    const query = searchQuery.toLowerCase().trim()

    return posts.filter(post => {
      const titleMatch = post.title.toLowerCase().includes(query)
      const excerptMatch = post.excerpt.toLowerCase().includes(query)
      const categoryMatch = post.category.toLowerCase().includes(query)
      const authorMatch = post.author.toLowerCase().includes(query)
      const tagsMatch = post.tags.some(tag => tag.toLowerCase().includes(query))

      return titleMatch || excerptMatch || categoryMatch || authorMatch || tagsMatch
    })
  }, [posts, searchQuery])

  // Calculate pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const endIndex = startIndex + POSTS_PER_PAGE
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex)

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)

      // Update URL with page number
      const params = new URLSearchParams(searchParams.toString())
      if (page > 1) {
        params.set('page', page.toString())
      } else {
        params.delete('page')
      }
      const newUrl = params.toString() ? `/blog?${params.toString()}` : '/blog'
      router.replace(newUrl, { scroll: false })

      // Scroll to top of blog list
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [router, searchParams]
  )

  return (
    <div className={styles.blogPageClient}>
      <BlogSearch onSearch={handleSearch} initialQuery={initialQuery} />
      {searchQuery && (
        <p className={styles.resultsCount}>
          {filteredPosts.length} {filteredPosts.length === 1 ? 'result' : 'results'} for &ldquo;
          {searchQuery}&rdquo;
        </p>
      )}
      <BlogPostList posts={paginatedPosts} />
      <BlogPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

export const BlogPageClient: React.FC<BlogPageClientProps> = ({ posts }) => {
  return (
    <Suspense fallback={<BlogPostList posts={posts} />}>
      <BlogPageClientInner posts={posts} />
    </Suspense>
  )
}
