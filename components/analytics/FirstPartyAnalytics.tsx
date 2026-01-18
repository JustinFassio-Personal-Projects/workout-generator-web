'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type CollectPayload = {
  type: 'page_view' | 'click'
  path: string
  href?: string
  referrer?: string
  click_name?: string
  meta?: Record<string, unknown>
}

function shouldTrackClientSide(pathname: string): boolean {
  if (!pathname.startsWith('/')) return false
  if (pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/api')) return false
  if (pathname.startsWith('/_next')) return false
  return true
}

function hasDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.doNotTrack === '1'
}

function sendEvent(payload: CollectPayload) {
  if (typeof window === 'undefined') return
  if (hasDoNotTrackEnabled()) return
  if (!shouldTrackClientSide(payload.path)) return

  const body = JSON.stringify(payload)

  // Prefer sendBeacon for unload safety.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const ok = navigator.sendBeacon(
      '/api/analytics/collect',
      new Blob([body], { type: 'application/json' })
    )
    if (ok) return
  }

  // Fallback
  void fetch('/api/analytics/collect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'include',
  }).catch(() => {
    // Intentionally ignore errors (analytics must never break UX)
  })
}

export function FirstPartyAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastTrackedPath = useRef<string | null>(null)

  // Page views (initial load + App Router navigation)
  useEffect(() => {
    if (!pathname) return
    if (!shouldTrackClientSide(pathname)) return

    // Avoid double-counting in dev / strict mode re-renders.
    if (lastTrackedPath.current === pathname) return
    lastTrackedPath.current = pathname

    const meta: Record<string, unknown> = {}
    const utm_source = searchParams.get('utm_source')
    const utm_medium = searchParams.get('utm_medium')
    const utm_campaign = searchParams.get('utm_campaign')
    const utm_term = searchParams.get('utm_term')
    const utm_content = searchParams.get('utm_content')

    if (utm_source) meta.utm_source = utm_source
    if (utm_medium) meta.utm_medium = utm_medium
    if (utm_campaign) meta.utm_campaign = utm_campaign
    if (utm_term) meta.utm_term = utm_term
    if (utm_content) meta.utm_content = utm_content

    sendEvent({
      type: 'page_view',
      path: pathname,
      href: window.location.href,
      referrer: document.referrer || undefined,
      meta: Object.keys(meta).length ? meta : undefined,
    })
  }, [pathname, searchParams])

  // Annotated click tracking only: data-analytics="..."
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return

      const tracked = target.closest('[data-analytics]')
      if (!(tracked instanceof HTMLElement)) return

      const clickName = tracked.getAttribute('data-analytics')?.trim()
      if (!clickName) return

      const path = window.location.pathname
      if (!shouldTrackClientSide(path)) return

      const link = tracked.closest('a[href]')
      const href =
        link instanceof HTMLAnchorElement
          ? link.href
          : tracked instanceof HTMLAnchorElement
            ? tracked.href
            : undefined

      sendEvent({
        type: 'click',
        path,
        href,
        referrer: document.referrer || undefined,
        click_name: clickName,
        meta: {
          tag: tracked.tagName.toLowerCase(),
        },
      })
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return null
}
