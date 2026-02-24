'use client'

import { useEffect } from 'react'
import { restoreFlagsFromLocalStorage } from '@/lib/flagTracking'

/**
 * DEPRECATED: Flag Restorer Component
 *
 * This component is no longer needed with Statsig flags. Statsig handles
 * flag evaluation and persistence automatically.
 *
 * This component is kept for backward compatibility during the migration
 * but can be removed once all Vercel flag tracking has been removed.
 *
 * To remove this component:
 * 1. Remove the import from app/layout.tsx
 * 2. Delete this file
 */
export const FlagRestorer: React.FC = () => {
  useEffect(() => {
    // Restore flags from localStorage when component mounts (deprecated)
    // This is only for backward compatibility with old Vercel flags
    restoreFlagsFromLocalStorage()
  }, [])

  // This component doesn't render anything
  return null
}
