/**
 * Stable session ID for analytics (page-view and funnel events).
 * Persisted in localStorage so all events in the flow link to the same session.
 */

const STORAGE_KEY = 'wg_analytics_session_id';

function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Get or create a session ID for the current browser tab. Same ID is used for
 * page-view and funnel events so admin Acquisition and Auth & onboarding can join.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateSessionId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateSessionId();
  }
}
