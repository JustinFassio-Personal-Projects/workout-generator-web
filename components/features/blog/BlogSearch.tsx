'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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

  // Create stable string representation of searchParams to use as dependency
  // This prevents stale closures while avoiding infinite loops
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams])

  // Debounce search
  useEffect(() => {
    // Capture searchParams values at effect start to avoid stale closures
    // Read values immediately to capture current state, not from closure
    const currentPage = searchParams.get('page')

    const timer = setTimeout(() => {
      onSearch(query)

      // Update URL with search query
      // Build new params from stable searchParamsString to avoid reading from potentially stale closure
      const params = new URLSearchParams(searchParamsString)
      if (query) {
        params.set('search', query)
      } else {
        params.delete('search')
      }
      // Also preserve page param if it exists (unless clearing search)
      if (!query && currentPage) {
        params.set('page', currentPage)
      }
      const newUrl = params.toString() ? `/blog?${params.toString()}` : '/blog'
      router.replace(newUrl, { scroll: false })
    }, 300)

    return () => clearTimeout(timer)
    // Use searchParamsString (memoized) as dependency - stable string that only changes when URL params change
    // This prevents stale closures while avoiding infinite loops (debounce + conditional updates prevent circular updates)
  }, [query, onSearch, router, searchParamsString])

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
