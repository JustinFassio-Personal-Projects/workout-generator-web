/**
 * Reverse-trial funnel events → marketing site `analytics_funnel_events` (Phase 4).
 * Must stay in sync with astro-site `FUNNEL_EVENT_WHITELIST`.
 */

import { getPostHog } from "@/lib/posthog";
import type { UserCapabilitiesResponse } from "@/lib/reverse-trial/user-capabilities-types";
import {
  resolveReverseTrialUrgencyCopyVariant,
  shouldAttachUrgencyCopyVariant,
} from "@/lib/reverse-trial-urgency-variant";

const SESSION_STORAGE_SID_KEY = "wg_reverse_trial_funnel_sid";

export type ReverseTrialFunnelSurface =
  | "pricing_pivot_strip"
  | "trial_ended_explainer"
  | "banner"
  | "generate_page"
  | "summaries_analytics"
  | "ai_edit_panel"
  | "ai_swap_panel"
  | "ai_add_panel";

function getMarketingSiteBaseUrl(): string {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:4321";
  }
  return (
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL ||
    "https://aiworkoutgenerator.com"
  );
}

export function getOrCreateReverseTrialFunnelSessionId(): string {
  if (typeof window === "undefined") return `rt_ssr_${Date.now()}`;
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_SID_KEY);
    if (existing && existing.length <= 64) return existing;
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 12);
    const next = `rt_${t}_${r}`;
    sessionStorage.setItem(SESSION_STORAGE_SID_KEY, next);
    return next;
  } catch {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 12);
    return `rt_${t}_${r}`;
  }
}

function postFunnelEvent(
  eventName: "trial_expired_viewed" | "feature_lock_click",
  properties: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const base = getMarketingSiteBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/analytics/track-event`;
  const sessionId = getOrCreateReverseTrialFunnelSessionId();

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: eventName,
      session_id: sessionId,
      user_id: null,
      properties,
      app_id: "hub",
    }),
    mode: "cors",
  }).catch(() => {});
}

export function buildReverseTrialFunnelProperties(
  surface: ReverseTrialFunnelSurface,
  options: {
    firebaseUid: string | null | undefined;
    capabilities: UserCapabilitiesResponse | null | undefined;
    /** PostHog multivariate key for Phase 5 A/B (days 4–6 urgency). Omit to auto-resolve when eligible. */
    urgencyCopyVariant?: string | null;
  }
): Record<string, unknown> {
  const cap = options.capabilities;
  const props: Record<string, unknown> = { surface };
  if (options.firebaseUid) props.firebase_uid = options.firebaseUid;
  if (cap?.growth_state != null) props.growth_state = cap.growth_state;
  if (cap?.trial_day != null) props.trial_day = cap.trial_day;
  if (cap?.ended_reason) props.ended_reason = cap.ended_reason;
  let variant = options.urgencyCopyVariant;
  if (variant === undefined && cap && shouldAttachUrgencyCopyVariant(cap)) {
    variant = resolveReverseTrialUrgencyCopyVariant(getPostHog()) ?? null;
  }
  if (typeof variant === "string" && variant.length > 0) {
    props.urgency_copy_variant = variant;
  }
  return props;
}

/** Fires every time (e.g. dialog open). */
export function trackTrialExpiredViewed(
  surface: ReverseTrialFunnelSurface,
  options: {
    firebaseUid: string | null | undefined;
    capabilities: UserCapabilitiesResponse | null | undefined;
  }
): void {
  const cap = options.capabilities;
  if (!cap?.enforcement_enabled) return;
  postFunnelEvent(
    "trial_expired_viewed",
    buildReverseTrialFunnelProperties(surface, options)
  );
}

/** One impression per browser tab session per `surface` (e.g. pricing strip). */
export function trackTrialExpiredViewedOnce(
  surface: ReverseTrialFunnelSurface,
  options: {
    firebaseUid: string | null | undefined;
    capabilities: UserCapabilitiesResponse | null | undefined;
  }
): void {
  const cap = options.capabilities;
  if (!cap?.enforcement_enabled) return;

  if (typeof window === "undefined") return;
  const flagKey = `rt_imp_trial_expired_${surface}`;
  try {
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, "1");
  } catch {
    // still send
  }

  trackTrialExpiredViewed(surface, options);
}

export function trackFeatureLockClick(
  surface: ReverseTrialFunnelSurface,
  options: {
    firebaseUid: string | null | undefined;
    capabilities: UserCapabilitiesResponse | null | undefined;
  }
): void {
  const cap = options.capabilities;
  if (!cap?.enforcement_enabled) return;

  postFunnelEvent(
    "feature_lock_click",
    buildReverseTrialFunnelProperties(surface, options)
  );
}
