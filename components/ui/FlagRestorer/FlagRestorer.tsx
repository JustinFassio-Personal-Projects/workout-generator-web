'use client'

import { useEffect } from 'react'
import { restoreFlagsFromLocalStorage } from '@/lib/flagTracking'

/**
 * Client component that restores feature flags from localStorage on page load
 * This ensures flags persist across page navigations and are available to Vercel Web Analytics
 */
export const FlagRestorer: React.FC = () => {
  useEffect(() => {
    // Restore flags from localStorage when component mounts
    restoreFlagsFromLocalStorage()
  }, [])

  // This component doesn't render anything
  return null
}
