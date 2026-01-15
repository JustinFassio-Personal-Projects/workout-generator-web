/**
 * Auth Event Tracking Hook
 * Hook for tracking authentication-related events (login, signup, etc.)
 */

import { useEffect, useCallback } from 'react'
import { analytics } from '@/lib/analytics'
import { emitFlagToDOM, storeFlagInLocalStorage } from '@/lib/flagTracking'
import { FLAG_NAMES } from '@/lib/flags'

interface UseAuthTrackingOptions {
  /**
   * Track when component mounts if user is already authenticated
   */
  trackOnMount?: boolean
  /**
   * Whether user is currently authenticated
   */
  isAuthenticated?: boolean
}

/**
 * Hook to track authentication events
 * Can be used in components that handle login/signup flows
 *
 * @param options - Configuration options for the hook
 */
export const useAuthTracking = (options: UseAuthTrackingOptions = {}) => {
  const { trackOnMount = false, isAuthenticated = false } = options

  /**
   * Track a successful login event
   */
  const trackUserLogin = useCallback(
    (metadata?: { source?: string; method?: string; location?: string }) => {
      // Set feature flag (client-side)
      // Emit to DOM for Vercel Web Analytics to detect
      emitFlagToDOM(FLAG_NAMES.USER_LOGGED_IN, true)
      storeFlagInLocalStorage(FLAG_NAMES.USER_LOGGED_IN, true)

      // Track the event
      analytics.trackUserLogin(metadata)
    },
    []
  )

  /**
   * Track a successful account creation event
   */
  const trackUserAccountCreated = useCallback(
    (metadata?: { source?: string; method?: string; location?: string }) => {
      // Set feature flag (client-side)
      // Emit to DOM for Vercel Web Analytics to detect
      emitFlagToDOM(FLAG_NAMES.USER_ACCOUNT_CREATED, true)
      storeFlagInLocalStorage(FLAG_NAMES.USER_ACCOUNT_CREATED, true)

      // Track the event
      analytics.trackUserAccountCreated(metadata)
    },
    []
  )

  useEffect(() => {
    if (trackOnMount && isAuthenticated) {
      // Track that user is logged in (e.g., on page load if already authenticated)
      trackUserLogin({ source: 'page_load', location: 'app' })
    }
  }, [trackOnMount, isAuthenticated, trackUserLogin])

  /**
   * Track login intent (when user navigates to login page)
   */
  const trackLoginIntent = useCallback((location: string, destination: string) => {
    analytics.trackLoginIntent(location, destination)
  }, [])

  /**
   * Track signup intent (when user navigates to signup page)
   */
  const trackSignupIntent = useCallback((location: string, destination: string) => {
    analytics.trackSignupIntent(location, destination)
  }, [])

  return {
    trackUserLogin,
    trackUserAccountCreated,
    trackLoginIntent,
    trackSignupIntent,
  }
}
