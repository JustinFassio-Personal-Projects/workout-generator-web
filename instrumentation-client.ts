import posthog, { PostHogInterface } from 'posthog-js'

declare global {
  var __POSTHOG_INITIALIZED__: boolean
  interface Window {
    posthog: PostHogInterface
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
