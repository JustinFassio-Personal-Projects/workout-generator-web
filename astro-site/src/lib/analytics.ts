/**
 * Analytics helpers for GA4 and PostHog (client-side).
 * GA4 uses window.gtag; PostHog uses window.posthog when loaded by BaseLayout/script.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    posthog?: { capture: (name: string, props?: Record<string, unknown>) => void }
  }
}

export function isGA4Available(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

export function trackGA4Event(eventName: string, eventParams?: Record<string, unknown>): void {
  if (!isGA4Available()) return
  window.gtag!('event', eventName, eventParams ?? {})
}

export function capturePostHog(name: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const posthog = (
    window as Window & { posthog?: { capture: (n: string, p?: Record<string, unknown>) => void } }
  ).posthog
  if (posthog?.capture) posthog.capture(name, props)
}
