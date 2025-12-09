/**
 * Analytics utility functions for Google Analytics 4, Google Tag Manager, and Vercel Analytics
 * Provides type-safe event tracking helpers
 */

import { track } from '@vercel/analytics'

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
 * Track a Vercel Analytics event
 * @param eventName - The name of the event (max 255 characters)
 * @param data - Optional event data (flat object with string, number, boolean, or null values)
 */
export const trackVercelEvent = (
  eventName: string,
  data?: Record<string, string | number | boolean | null>
): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    track(eventName, data)
  } catch (error) {
    console.warn('Failed to track Vercel Analytics event:', error)
  }
}

/**
 * Track a button click event
 * @param buttonName - The name/identifier of the button
 * @param location - Where the button is located (e.g., 'hero', 'navbar', 'footer')
 * @param metadata - Additional metadata about the button click
 */
export const trackButtonClick = (
  buttonName: string,
  location: string,
  metadata?: Record<string, string | number | boolean | null>
): void => {
  trackVercelEvent('Button Click', {
    button_name: buttonName,
    location,
    ...metadata,
  })
}

/**
 * Track scroll depth milestone
 * @param percentage - The scroll depth percentage (25, 50, 75, or 100)
 * @param pagePath - Optional current page path
 */
export const trackScrollDepth = (percentage: number, pagePath?: string): void => {
  const path = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '')
  trackVercelEvent('Page Scroll', {
    scroll_depth: percentage,
    page_path: path,
  })
}

/**
 * Track a navigation click event
 * @param destination - The destination URL or path
 * @param type - Type of navigation (e.g., 'nav_link', 'footer_link')
 * @param location - Where the navigation link is located
 * @param metadata - Additional metadata
 */
export const trackNavigationClick = (
  destination: string,
  type: string,
  location: string,
  metadata?: Record<string, string | number | boolean | null>
): void => {
  trackVercelEvent('Navigation Click', {
    destination,
    type,
    location,
    ...metadata,
  })
}

/**
 * Track a form submission event
 * @param formName - The name/identifier of the form
 * @param metadata - Additional metadata about the form submission
 */
export const trackFormSubmission = (
  formName: string,
  metadata?: Record<string, string | number | boolean | null>
): void => {
  trackVercelEvent('Form Submission', {
    form_name: formName,
    ...metadata,
  })
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
    trackButtonClick(ctaName, location)
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
    trackVercelEvent('Blog Post Click', {
      post_slug: postSlug,
      post_title: postTitle.substring(0, 255), // Ensure within limit
      location: 'blog_card',
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
    trackVercelEvent('Pricing Plan Click', {
      plan_name: planName,
      plan_price: planPrice,
      location: 'pricing',
    })
  },

  // Chat widget interactions
  trackChatOpen: () => {
    trackEvent('chat_open')
    trackVercelEvent('Chat Widget Interaction', {
      action: 'open',
      location: 'chat_widget',
    })
  },

  trackChatMessage: (messageLength: number) => {
    trackEvent('chat_message', {
      message_length: messageLength,
    })
  },
}
