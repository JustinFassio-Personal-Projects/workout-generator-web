/**
 * Analytics utility functions for Google Analytics 4 and Google Tag Manager
 * Provides type-safe event tracking helpers
 */

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

// Google Analytics 4 Event Types
export interface GA4Event {
  event_name: string
  event_params?: Record<string, unknown>
}

// Google Tag Manager Event
export interface GTMEvent {
  event: string
  [key: string]: unknown
}

/**
 * Check if Google Analytics is available
 */
export const isGA4Available = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/**
 * Check if Google Tag Manager is available
 */
export const isGTMAvailable = (): boolean => {
  return typeof window !== 'undefined' && Array.isArray(window.dataLayer)
}

/**
 * Track a Google Analytics 4 event
 * @param eventName - The name of the event
 * @param eventParams - Optional event parameters
 */
export const trackGA4Event = (eventName: string, eventParams?: Record<string, unknown>): void => {
  if (!isGA4Available()) {
    console.warn('Google Analytics 4 is not available')
    return
  }

  if (window.gtag) {
    window.gtag('event', eventName, eventParams || {})
  }
}

/**
 * Track a Google Tag Manager event
 * @param eventName - The name of the event
 * @param eventData - Optional event data
 */
export const trackGTMEvent = (eventName: string, eventData?: Record<string, unknown>): void => {
  if (!isGTMAvailable()) {
    console.warn('Google Tag Manager is not available')
    return
  }

  window.dataLayer.push({
    event: eventName,
    ...eventData,
  })
}

/**
 * Track an event to both GA4 and GTM
 * @param eventName - The name of the event
 * @param eventData - Optional event data
 */
export const trackEvent = (eventName: string, eventData?: Record<string, unknown>): void => {
  trackGA4Event(eventName, eventData)
  trackGTMEvent(eventName, eventData)
}

/**
 * Track a page view (useful for client-side navigation)
 * @param path - The page path
 * @param title - Optional page title
 */
export const trackPageView = (path: string, title?: string): void => {
  if (isGA4Available() && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: path,
      page_title: title,
    })
  }

  if (isGTMAvailable()) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: path,
      page_title: title,
    })
  }
}

/**
 * Common event tracking functions for common use cases
 */
export const analytics = {
  // CTA clicks
  trackCTAClick: (ctaName: string, location: string) => {
    trackEvent('cta_click', {
      cta_name: ctaName,
      location,
    })
  },

  // Blog interactions
  trackBlogPostView: (postSlug: string, postTitle: string) => {
    trackEvent('blog_post_view', {
      post_slug: postSlug,
      post_title: postTitle,
    })
  },

  trackBlogPostClick: (postSlug: string, postTitle: string) => {
    trackEvent('blog_post_click', {
      post_slug: postSlug,
      post_title: postTitle,
    })
  },

  // Feature interactions
  trackFeatureClick: (featureName: string) => {
    trackEvent('feature_click', {
      feature_name: featureName,
    })
  },

  // Pricing interactions
  trackPricingPlanClick: (planName: string, planPrice: number) => {
    trackEvent('pricing_plan_click', {
      plan_name: planName,
      plan_price: planPrice,
    })
  },

  // Chat widget interactions
  trackChatOpen: () => {
    trackEvent('chat_open', {})
  },

  trackChatMessage: (messageLength: number) => {
    trackEvent('chat_message', {
      message_length: messageLength,
    })
  },
}
