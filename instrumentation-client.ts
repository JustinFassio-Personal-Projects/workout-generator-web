import posthog, { PostHogInterface } from 'posthog-js'

declare global {
  var __POSTHOG_INITIALIZED__: boolean
  interface Window {
    posthog: PostHogInterface
    __POSTHOG_WEB_VITALS_CALLBACK?: (metric: any) => void
  }
}

// Suppress PostHog's web vitals warning
// PostHog tries to automatically capture web vitals but we handle it manually via Next.js hook
// This prevents the "web vitals callbacks not loaded" console error
// We need to set this up BEFORE any PostHog code runs
if (typeof window !== 'undefined') {
  // Store original console.error before PostHog can override it
  const originalConsoleError = console.error.bind(console)

  // Override console.error to filter out PostHog web vitals warnings
  console.error = function (...args: any[]) {
    // Check if this is the PostHog web vitals warning
    // The error can come in different formats, so we check all args
    const errorString = args
      .map(arg => {
        if (typeof arg === 'string') return arg
        if (arg?.toString) return arg.toString()
        return String(arg)
      })
      .join(' ')

    if (
      errorString.includes('[PostHog.js]') &&
      (errorString.includes('[Web Vitals]') || errorString.includes('Web Vitals')) &&
      (errorString.includes('web vitals callbacks not loaded') ||
        errorString.includes('callbacks not loaded'))
    ) {
      // Suppress this specific warning - we handle web vitals via WebVitals component
      return
    }
    // Call original console.error for all other errors
    originalConsoleError.apply(console, args)
  }
}

// Set up web vitals callback IMMEDIATELY when this module loads
// PostHog checks for this callback during initialization, so it must exist before PostHog.init() is called
if (typeof window !== 'undefined') {
  // Create the callback that PostHog expects
  // This will be called by the WebVitals component when metrics are available
  window.__POSTHOG_WEB_VITALS_CALLBACK = (metric: any) => {
    // Send web vitals to PostHog when the callback is invoked
    if (window.posthog) {
      window.posthog.capture('$web_vitals', {
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
      })
    }
  }
}

function initPostHog() {
  if (typeof window === 'undefined' || globalThis.__POSTHOG_INITIALIZED__) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // ui_host is required when using a proxy so the toolbar knows the actual PostHog URL
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Include the defaults option as required by PostHog
    defaults: '2025-05-24',
    // Enables capturing unhandled exceptions via Error Tracking
    capture_exceptions: true,
    // Turn on debug in development mode
    debug: process.env.NODE_ENV === 'development',
    loaded: function (posthog) {
      // Ensure PostHog is on window object for toolbar access
      window.posthog = posthog

      // Handle toolbar parameters from URL hash (for Next.js App Router)
      const toolbarParams = new URLSearchParams(window.location.hash.substring(1)).get('__posthog')
      if (toolbarParams) {
        try {
          posthog.loadToolbar(JSON.parse(toolbarParams))
        } catch (error) {
          console.error('Failed to load PostHog toolbar:', error)
        }
      }
    },
  })

  globalThis.__POSTHOG_INITIALIZED__ = true
}

// Initialize PostHog after React hydration to avoid hydration mismatches
// PostHog injects scripts dynamically which can cause hydration mismatches
// Delay initialization until well after React hydration completes
if (typeof window !== 'undefined') {
  // Use a longer delay to ensure React hydration warnings have already fired
  // This prevents PostHog's script injection from interfering with hydration
  const initAfterHydration = () => {
    // Wait for window load + additional delay to ensure hydration is complete
    if (document.readyState === 'complete') {
      // Additional delay ensures we're well past hydration phase
      setTimeout(initPostHog, 500)
    } else {
      window.addEventListener(
        'load',
        () => {
          setTimeout(initPostHog, 500)
        },
        { once: true }
      )
    }
  }

  // Defer initialization start until after current execution stack
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAfterHydration)
  } else {
    initAfterHydration()
  }
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
