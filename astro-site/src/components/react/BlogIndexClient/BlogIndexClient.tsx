'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TransformedPost } from '@/types/blog'
import styles from './BlogIndexClient.module.scss'

const POSTS_PER_PAGE = 10

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Invalid Date'
  try {
    let date: Date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(dateString)
    }
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'Invalid Date'
  }
}

function getSearchParams(): { search: string; page: number } {
  if (typeof window === 'undefined') return { search: '', page: 1 }
  const params = new URLSearchParams(window.location.search)
  return {
    search: params.get('search') || '',
    page: Math.max(1, parseInt(params.get('page') || '1', 10)),
  }
}

function updateUrl(search: string, page: number): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  const url = query ? `/blog?${query}` : '/blog'
  window.history.replaceState(null, '', url)
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = []
  const maxVisible = 5
  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }
  pages.push(1)
  if (current > 3) pages.push('ellipsis')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) {
    if (i !== 1 && i !== total) pages.push(i)
  }
  if (current < total - 2) pages.push('ellipsis')
  if (total > 1) pages.push(total)
  return pages
}

interface BlogIndexClientProps {
  posts: TransformedPost[]
}

export const BlogIndexClient: React.FC<BlogIndexClientProps> = ({ posts }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const { search, page } = getSearchParams()
    setSearchQuery(search)
    setCurrentPage(page)
    setMounted(true)
  }, [])

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts
    const q = searchQuery.toLowerCase().trim()
    return posts.filter(post => {
      const titleMatch = post.title.toLowerCase().includes(q)
      const excerptMatch = post.excerpt.toLowerCase().includes(q)
      const categoryMatch = post.category.toLowerCase().includes(q)
      const authorMatch = post.author.toLowerCase().includes(q)
      const tagsMatch = (post.tags || []).some(tag => tag.toLowerCase().includes(q))
      return titleMatch || excerptMatch || categoryMatch || authorMatch || tagsMatch
    })
  }, [posts, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * POSTS_PER_PAGE
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }, [])

  const handleSearchSync = useCallback(() => {
    updateUrl(searchQuery, 1)
  }, [searchQuery])

  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => {
      updateUrl(searchQuery, currentPage)
    }, 300)
    return () => clearTimeout(t)
  }, [mounted, searchQuery, currentPage])

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      updateUrl(searchQuery, page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchQuery]
  )

  if (!mounted) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.grid}>
          {posts.slice(0, POSTS_PER_PAGE).map(post => (
            <article key={post.id} className={styles.card}>
              <a href={`/blog/${post.slug}`} className={styles.cardLink}>
                {post.image && (
                  <div className={styles.imageWrap}>
                    <img
                      src={post.image}
                      alt={post.title}
                      className={styles.image}
                      loading="lazy"
                    />
                  </div>
                )}
                <div className={styles.cardContent}>
                  <span className={styles.categoryBadge}>{post.category}</span>
                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  <p className={styles.cardExcerpt}>{post.excerpt}</p>
                  <div className={styles.cardMeta}>
                    <span>{post.author}</span>
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <Search className={styles.searchIcon} size={20} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onBlur={handleSearchSync}
            className={styles.searchInput}
            aria-label="Search blog posts"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className={styles.clearButton}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <p className={styles.resultsCount}>
          {filteredPosts.length} {filteredPosts.length === 1 ? 'result' : 'results'} for &ldquo;
          {searchQuery}&rdquo;
        </p>
      )}

      {paginatedPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>No blog posts found.</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {paginatedPosts.map(post => (
              <article key={post.id} className={styles.card}>
                <a href={`/blog/${post.slug}`} className={styles.cardLink}>
                  {post.image && (
                    <div className={styles.imageWrap}>
                      <img
                        src={post.image}
                        alt={post.title}
                        className={styles.image}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className={styles.cardContent}>
                    <span className={styles.categoryBadge}>{post.category}</span>
                    <h2 className={styles.cardTitle}>{post.title}</h2>
                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                    <div className={styles.cardMeta}>
                      <span>{post.author}</span>
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </div>
                    {(post.tags?.length ?? 0) > 0 && (
                      <div className={styles.cardTags}>
                        {post.tags!.slice(0, 3).map(tag => (
                          <span key={tag} className={styles.tag}>
                            #{tag}
                          </span>
                        ))}
                        {post.tags!.length > 3 && (
                          <span className={styles.tag}>+{post.tags!.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </a>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Blog pagination">
              <button
                type="button"
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                className={styles.navButton}
                aria-label="Previous page"
              >
                <ChevronLeft size={20} />
                <span className={styles.navText}>Previous</span>
              </button>
              <div className={styles.pageNumbers}>
                {getPageNumbers(safePage, totalPages).map((page, index) =>
                  page === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`${styles.pageButton} ${safePage === page ? styles.active : ''}`}
                      aria-current={safePage === page ? 'page' : undefined}
                      aria-label={`Page ${page}`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                className={styles.navButton}
                aria-label="Next page"
              >
                <span className={styles.navText}>Next</span>
                <ChevronRight size={20} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
