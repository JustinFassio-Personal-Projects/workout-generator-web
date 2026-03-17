/**
 * Funnel event tracking for WorkoutPlanBuilder. POSTs to /api/analytics/track-event
 * with a stable session_id so admin Auth & onboarding can compute drop-off.
 */

import { getOrCreateSessionId } from '@/lib/analytics-session';

export type FunnelEventName =
  | 'onboarding_builder_started'
  | 'onboarding_builder_step_1_completed'
  | 'onboarding_builder_step_2_completed'
  | 'onboarding_builder_preview_shown'
  | 'onboarding_create_account_clicked';

/**
 * Track a funnel event. Fire-and-forget; does not throw.
 */
export function trackFunnelEvent(
  eventName: FunnelEventName,
  properties?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  const sessionId = getOrCreateSessionId();
  fetch('/api/analytics/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: eventName,
      session_id: sessionId || undefined,
      user_id: null,
      properties: properties ?? {},
    }),
  }).catch(() => {});
}
