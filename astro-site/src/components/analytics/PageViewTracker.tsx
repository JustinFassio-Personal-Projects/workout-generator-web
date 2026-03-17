import { useEffect } from 'react';
import { getOrCreateSessionId } from '@/lib/analytics-session';

/**
 * Sends a page-view to /api/analytics/page-view on mount (route load).
 * Uses pathname, referrer, UTM params, and shared session_id for Acquisition analytics.
 */
export function PageViewTracker() {
  useEffect(() => {
    const path = window.location.pathname || '/';
    const referrer = document.referrer || undefined;
    const params = new URLSearchParams(window.location.search);
    const sessionId = getOrCreateSessionId();

    fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        referrer: referrer || undefined,
        utm_source: params.get('utm_source') ?? undefined,
        utm_medium: params.get('utm_medium') ?? undefined,
        utm_campaign: params.get('utm_campaign') ?? undefined,
        session_id: sessionId || undefined,
      }),
    }).catch(() => {});
  }, []);

  return null;
}
