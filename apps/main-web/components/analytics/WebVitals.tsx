'use client'

import { useReportWebVitals } from 'next/web-vitals'

/**
 * Web Vitals Component
 * Reports Core Web Vitals to PostHog
 *
 * This component uses Next.js's useReportWebVitals hook to capture
 * web vitals metrics and send them to PostHog for performance monitoring.
 *
 * The callback is set up in instrumentation-client.ts before PostHog initializes,
 * which satisfies PostHog's requirement for web vitals callbacks to be available.
 */
export function WebVitals() {
  useReportWebVitals(metric => {
    // Call the callback that was set up before PostHog initialization
    // This satisfies PostHog's requirement for web vitals callbacks
    if (typeof window !== 'undefined' && window.__POSTHOG_WEB_VITALS_CALLBACK) {
      window.__POSTHOG_WEB_VITALS_CALLBACK(metric)
    }
  })

  return null
}
