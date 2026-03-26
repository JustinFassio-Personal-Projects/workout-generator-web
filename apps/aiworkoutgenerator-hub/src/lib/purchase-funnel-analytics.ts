/**
 * Monetization drop-off funnel: POSTs to marketing site analytics_funnel_events.
 * session_id = purchase_flow_id (correlates steps); user_id always null (RLS).
 */

const FLOW_ID_KEY = "wg_purchase_flow_id";
const FLOW_TS_KEY = "wg_purchase_flow_started_at";
const PAYWALL_ONCE_PREFIX = "md_po_";
const TTL_MS = 24 * 60 * 60 * 1000;

export const PURCHASE_FUNNEL_EVENT_NAMES = [
  "purchase_paywall_opened",
  "purchase_cta_checkout_started",
  "purchase_checkout_session_created",
  "purchase_stripe_redirect",
  "purchase_return_success",
  "purchase_subscription_activated",
] as const;

export type PurchaseFunnelEventName =
  (typeof PURCHASE_FUNNEL_EVENT_NAMES)[number];

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

function generateFlowId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 12);
  return `pf_${t}_${r}`;
}

/**
 * Returns existing purchase flow id if within TTL; otherwise creates a new one.
 */
export function getOrCreatePurchaseFlowId(): string {
  if (typeof window === "undefined") return generateFlowId();
  try {
    const existing = sessionStorage.getItem(FLOW_ID_KEY);
    const tsRaw = sessionStorage.getItem(FLOW_TS_KEY);
    const ts = tsRaw ? parseInt(tsRaw, 10) : NaN;
    if (existing && Number.isFinite(ts) && Date.now() - ts < TTL_MS) {
      return existing;
    }
    const next = generateFlowId();
    sessionStorage.setItem(FLOW_ID_KEY, next);
    sessionStorage.setItem(FLOW_TS_KEY, String(Date.now()));
    return next;
  } catch {
    return generateFlowId();
  }
}

/** Current flow id if any (no side effects). */
export function getPurchaseFlowId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(FLOW_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear flow correlation after successful return from Stripe (optional cleanup).
 */
export function clearPurchaseFlowOnSuccess(): void {
  if (typeof window === "undefined") return;
  try {
    const id = sessionStorage.getItem(FLOW_ID_KEY);
    sessionStorage.removeItem(FLOW_ID_KEY);
    sessionStorage.removeItem(FLOW_TS_KEY);
    if (id) {
      sessionStorage.removeItem(`${PAYWALL_ONCE_PREFIX}${id}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Fire `purchase_paywall_opened` once per flow (first paywall surface).
 */
export function trackPurchasePaywallFirstTouch(options: {
  modal: "upgrade" | "pricing";
  trigger?: string;
  firebaseUid?: string | null;
  /** e.g. "/pricing" when opened from full page */
  surface?: string;
}): void {
  if (typeof window === "undefined") return;
  const flowId = getOrCreatePurchaseFlowId();
  try {
    const flag = `${PAYWALL_ONCE_PREFIX}${flowId}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    // still try to track
  }

  const props: Record<string, unknown> = {
    modal: options.modal,
  };
  if (options.trigger) props.trigger = options.trigger;
  if (options.firebaseUid) props.firebase_uid = options.firebaseUid;
  if (options.surface) props.surface = options.surface;

  trackPurchaseFunnelEvent("purchase_paywall_opened", props, flowId);
}

export function trackPurchaseFunnelEvent(
  eventName: PurchaseFunnelEventName,
  properties: Record<string, unknown> = {},
  sessionIdOverride?: string | null
): void {
  if (typeof window === "undefined") return;

  const sessionId =
    sessionIdOverride !== undefined
      ? sessionIdOverride
      : getPurchaseFlowId() || getOrCreatePurchaseFlowId();

  const base = getMarketingSiteBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/analytics/track-event`;

  const body = {
    event_name: eventName,
    session_id: sessionId,
    user_id: null,
    properties,
    app_id: "hub",
  };

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    mode: "cors",
  }).catch(() => {});
}

export function trackPurchaseReturnSuccess(
  stripeCheckoutSessionId: string,
  firebaseUid?: string | null
): void {
  const props: Record<string, unknown> = {
    stripe_checkout_session_id: stripeCheckoutSessionId,
  };
  if (firebaseUid) props.firebase_uid = firebaseUid;
  const flowId = getPurchaseFlowId();
  trackPurchaseFunnelEvent("purchase_return_success", props, flowId);
}
