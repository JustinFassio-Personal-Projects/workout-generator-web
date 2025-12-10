'use client'

import { useEffect, useRef } from 'react'
import { trackScrollDepth } from '@/lib/analytics'

/**
 * Custom hook to track scroll depth milestones (25%, 50%, 75%, 100%)
 * Debounces scroll events to prevent excessive tracking
 */
export const useScrollTracking = () => {
  const trackedMilestones = useRef<Set<number>>(new Set())
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Debounce scroll events
      scrollTimeoutRef.current = setTimeout(() => {
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const scrollPercentage = Math.round(((scrollTop + windowHeight) / documentHeight) * 100)

        // Track milestones: 25%, 50%, 75%, 100%
        const milestones = [25, 50, 75, 100]
        milestones.forEach(milestone => {
          if (scrollPercentage >= milestone && !trackedMilestones.current.has(milestone)) {
            trackedMilestones.current.add(milestone)
            trackScrollDepth(milestone)
          }
        })
      }, 150) // 150ms debounce
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      // Reset tracked milestones on unmount
      trackedMilestones.current.clear()
    }
  }, [])
}
