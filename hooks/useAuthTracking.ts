/**
 * Auth Event Tracking Hook
 * Hook for tracking authentication-related events (login, signup, etc.)
 */

import { useEffect, useCallback } from 'react'
import posthog from 'posthog-js'
import { analytics } from '@/lib/analytics'

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
 * Metadata for user account creation tracking
 * Extended version includes PostHog-specific fields
 */
interface UserAccountCreatedMetadata {
  source?: string
  method?: string
  location?: string
  subscription_tier?: string
  fitness_level?: string
  signup_date?: string
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
      // Track the event
      analytics.trackUserLogin(metadata)
    },
    []
  )

  /**
   * Track a successful account creation event
   * Note: userId is optional since this site doesn't track logged-in users.
   * Users authenticate on aiworkoutgen.app, so we only identify if userId is provided.
   */
  const trackUserAccountCreated = useCallback(
    (
      userIdOrMetadata?: string | { source?: string; method?: string; location?: string },
      metadata?: UserAccountCreatedMetadata
    ) => {
      // Handle both signatures: (userId, metadata) or (metadata)
      let userId: string | undefined
      let finalMetadata: UserAccountCreatedMetadata | undefined

      if (typeof userIdOrMetadata === 'string') {
        // First parameter is userId
        userId = userIdOrMetadata
        finalMetadata = metadata
      } else {
        // First parameter is metadata (backward compatible)
        finalMetadata = userIdOrMetadata
      }

      // Track the event
      analytics.trackUserAccountCreated(finalMetadata)

      // PostHog: Track user_signed_up event (works with anonymous users)
      try {
        posthog.capture('user_signed_up', {
          signup_method: finalMetadata?.method || 'email',
          source: finalMetadata?.source,
          location: finalMetadata?.location,
        })

        // PostHog: Identify user only if userId is provided
        // If no userId, PostHog will use anonymous ID automatically
        if (userId) {
          posthog.identify(userId, {
            subscription_tier: finalMetadata?.subscription_tier || 'free',
            fitness_level: finalMetadata?.fitness_level || 'beginner',
            signup_date: finalMetadata?.signup_date || new Date().toISOString().split('T')[0],
          })
        }
      } catch (posthogError) {
        console.warn('PostHog tracking error:', posthogError)
      }
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
