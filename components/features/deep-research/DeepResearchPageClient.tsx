'use client'

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import type { DeepResearch } from '@/types/deep-research'
import type { DeepResearchProfile } from '@/types/deep-research-profile'
import { DeepResearchProfileFilter } from './DeepResearchProfileFilter'
import { DeepResearchCard } from './DeepResearchCard'
import styles from './DeepResearchPageClient.module.scss'

const ITEMS_PER_PAGE = 10
const PROFILE_STORAGE_KEY = 'deep-research-profile'

type SortOption = 'relevance' | 'newest' | 'oldest' | 'title'

function computeRelevanceScore(article: DeepResearch, profile: DeepResearchProfile): number {
  let score = 0

  if (profile.equipment_zone) {
    const zones = article.equipment_zones || []
    if (zones.includes(profile.equipment_zone) || zones.includes('any')) score++
  }

  if (profile.experience) {
    const levels = article.experience_levels || []
    if (levels.includes(profile.experience)) score++
  }

  if (profile.injuries && profile.injuries.length > 0) {
    const addressed = article.injuries_addressed || []
    profile.injuries.forEach(inj => {
      if (addressed.includes(inj)) score++
    })
  }

  if (profile.goal) {
    const goals = article.goals || []
    if (goals.includes(profile.goal)) score++
  }

  if (profile.days_per_week != null) {
    const min = article.days_per_week_min
    const max = article.days_per_week_max
    if (min == null && max == null) score++
    else if (
      min != null &&
      max != null &&
      profile.days_per_week >= min &&
      profile.days_per_week <= max
    )
      score++
    else if (min != null && max == null && profile.days_per_week >= min) score++
    else if (min == null && max != null && profile.days_per_week <= max) score++
  }

  if (profile.diet_type) {
    const types = article.diet_types || []
    if (types.includes(profile.diet_type)) score++
  }

  if (profile.nutrition_goal) {
    const goals = article.nutrition_goals || []
    if (goals.includes(profile.nutrition_goal)) score++
  }

  if (profile.dietary_restrictions && profile.dietary_restrictions.length > 0) {
    const articleRestrictions = article.dietary_restrictions || []
    profile.dietary_restrictions.forEach(r => {
      if (articleRestrictions.includes(r)) score++
    })
  }

  if (profile.macro_focus) {
    const focus = article.macro_focus || []
    if (Array.isArray(focus) && focus.includes(profile.macro_focus)) score++
  }

  return score
}

function compareByDate(a: DeepResearch, b: DeepResearch, ascending: boolean): number {
  const aDate = a.published_at || a.created_at
  const bDate = b.published_at || b.created_at
  const diff = new Date(aDate).getTime() - new Date(bDate).getTime()
  return ascending ? diff : -diff
}

function getMaxRelevanceScore(profile: DeepResearchProfile): number {
  let max = 0
  if (profile.equipment_zone) max++
  if (profile.experience) max++
  if (profile.injuries && profile.injuries.length > 0) max += profile.injuries.length
  if (profile.goal) max++
  if (profile.days_per_week != null) max++
  if (profile.diet_type) max++
  if (profile.nutrition_goal) max++
  if (profile.dietary_restrictions && profile.dietary_restrictions.length > 0)
    max += profile.dietary_restrictions.length
  if (profile.macro_focus) max++
  return max
}

function parseProfileFromUrl(params: URLSearchParams): Partial<DeepResearchProfile> {
  const p: Partial<DeepResearchProfile> = {}
  const eq = params.get('equipment_zone')
  if (eq) p.equipment_zone = eq
  const days = params.get('days_per_week')
  if (days) {
    const n = parseInt(days, 10)
    if (!isNaN(n)) p.days_per_week = n
  }
  const exp = params.get('experience')
  if (exp) p.experience = exp
  const injuries = params.get('injuries')
  if (injuries) p.injuries = injuries.split(',').filter(Boolean)
  const goal = params.get('goal')
  if (goal) p.goal = goal
  const diet = params.get('diet_type')
  if (diet) p.diet_type = diet
  const nutGoal = params.get('nutrition_goal')
  if (nutGoal) p.nutrition_goal = nutGoal
  const restrictions = params.get('dietary_restrictions')
  if (restrictions) p.dietary_restrictions = restrictions.split(',').filter(Boolean)
  const macro = params.get('macro_focus')
  if (macro) p.macro_focus = macro
  return p
}

function profileToParams(profile: DeepResearchProfile): URLSearchParams {
  const params = new URLSearchParams()
  if (profile.equipment_zone) params.set('equipment_zone', profile.equipment_zone)
  if (profile.days_per_week != null) params.set('days_per_week', String(profile.days_per_week))
  if (profile.experience) params.set('experience', profile.experience)
  if (profile.injuries?.length) params.set('injuries', profile.injuries.join(','))
  if (profile.goal) params.set('goal', profile.goal)
  if (profile.diet_type) params.set('diet_type', profile.diet_type)
  if (profile.nutrition_goal) params.set('nutrition_goal', profile.nutrition_goal)
  if (profile.dietary_restrictions?.length)
    params.set('dietary_restrictions', profile.dietary_restrictions.join(','))
  if (profile.macro_focus) params.set('macro_focus', profile.macro_focus)
  return params
}

interface DeepResearchPageClientProps {
  items: DeepResearch[]
}

function DeepResearchPageClientInner({ items }: DeepResearchPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('search') || ''
  const initialSort = (searchParams.get('sort') as SortOption) || 'relevance'
  const initialPage = parseInt(searchParams.get('page') || '1', 10)

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [sortOption, setSortOption] = useState<SortOption>(initialSort)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [profile, setProfile] = useState<DeepResearchProfile>(() => {
    const fromUrl = parseProfileFromUrl(searchParams)
    if (Object.keys(fromUrl).length > 0) return fromUrl as DeepResearchProfile
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
        if (stored) return JSON.parse(stored) as DeepResearchProfile
      } catch {
        // ignore
      }
    }
    return {}
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // ignore
    }
  }, [profile])

  const updateUrl = useCallback(
    (updates: { search?: string; sort?: string; page?: number; profile?: DeepResearchProfile }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (updates.search !== undefined) {
        if (updates.search) params.set('search', updates.search)
        else params.delete('search')
      }
      if (updates.sort !== undefined) {
        if (updates.sort && updates.sort !== 'relevance') params.set('sort', updates.sort)
        else params.delete('sort')
      }
      if (updates.page !== undefined) {
        if (updates.page > 1) params.set('page', String(updates.page))
        else params.delete('page')
      }
      if (updates.profile !== undefined) {
        const profileParams = profileToParams(updates.profile)
        profileParams.forEach((v, k) => params.set(k, v))
        const current = profileToParams(profile)
        current.forEach((_, k) => {
          if (!profileParams.has(k)) params.delete(k)
        })
      }
      const qs = params.toString()
      router.replace(qs ? `/deep-research?${qs}` : '/deep-research', { scroll: false })
    },
    [router, searchParams, profile]
  )

  const maxScore = useMemo(() => getMaxRelevanceScore(profile), [profile])

  const filteredItems = useMemo(() => {
    let result = items
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        item =>
          item.title.toLowerCase().includes(q) || (item.excerpt?.toLowerCase().includes(q) ?? false)
      )
    }
    return result
  }, [items, searchQuery])

  const scoredAndSortedItems = useMemo(() => {
    const withScores = filteredItems.map(item => ({
      item,
      score: computeRelevanceScore(item, profile),
    }))
    if (sortOption === 'relevance' && maxScore > 0) {
      withScores.sort((a, b) => b.score - a.score)
    } else if (sortOption === 'relevance' || sortOption === 'newest') {
      withScores.sort((a, b) => compareByDate(a.item, b.item, false))
    } else if (sortOption === 'oldest') {
      withScores.sort((a, b) => compareByDate(a.item, b.item, true))
    } else if (sortOption === 'title') {
      withScores.sort((a, b) => a.item.title.localeCompare(b.item.title))
    }
    return withScores
  }, [filteredItems, profile, sortOption, maxScore])

  const totalPages = Math.ceil(scoredAndSortedItems.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = scoredAndSortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleProfileChange = useCallback(
    (newProfile: DeepResearchProfile) => {
      setProfile(newProfile)
      setCurrentPage(1)
      updateUrl({ profile: newProfile, page: 1 })
    },
    [updateUrl]
  )

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as SortOption
      setSortOption(value)
      setCurrentPage(1)
      updateUrl({ sort: value, page: 1 })
    },
    [updateUrl]
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchQuery(value)
      setCurrentPage(1)
      updateUrl({ search: value, page: 1 })
    },
    [updateUrl]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      updateUrl({ page })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [updateUrl]
  )

  return (
    <div className={styles.client}>
      <DeepResearchProfileFilter profile={profile} onChange={handleProfileChange} />

      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={20} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search deep research..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles.searchInput}
            aria-label="Search deep research"
          />
        </div>
        <select
          value={sortOption}
          onChange={handleSortChange}
          className={styles.sortSelect}
          aria-label="Sort by"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {searchQuery && (
        <p className={styles.resultsCount}>
          {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'} for &ldquo;
          {searchQuery}&rdquo;
        </p>
      )}

      {paginatedItems.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No deep research found.</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {paginatedItems.map(({ item, score }) => (
              <DeepResearchCard
                key={item.id}
                item={item}
                relevanceScore={sortOption === 'relevance' && maxScore > 0 ? score : undefined}
                maxScore={sortOption === 'relevance' && maxScore > 0 ? maxScore : undefined}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={styles.navButton}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={styles.navButton}
                aria-label="Next page"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}

export function DeepResearchPageClient(props: DeepResearchPageClientProps) {
  return (
    <Suspense fallback={<div className={styles.client}>Loading...</div>}>
      <DeepResearchPageClientInner {...props} />
    </Suspense>
  )
}
