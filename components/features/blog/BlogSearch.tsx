'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import styles from './BlogSearch.module.scss'

interface BlogSearchProps {
  onSearch: (query: string) => void
  initialQuery?: string
}

export const BlogSearch: React.FC<BlogSearchProps> = ({ onSearch, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query)

      // Update URL with search query
      const params = new URLSearchParams(searchParams.toString())
      if (query) {
        params.set('search', query)
      } else {
        params.delete('search')
      }
      const newUrl = params.toString() ? `/blog?${params.toString()}` : '/blog'
      router.replace(newUrl, { scroll: false })
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch, router, searchParams])

  // Initialize from URL on mount
  useEffect(() => {
    const urlQuery = searchParams.get('search') || ''
    if (urlQuery !== query) {
      setQuery(urlQuery)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
  }, [])

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchInputWrapper}>
        <Search className={styles.searchIcon} size={20} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search articles..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={styles.searchInput}
          aria-label="Search blog posts"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
