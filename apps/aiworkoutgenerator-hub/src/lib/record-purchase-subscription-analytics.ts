/**
 * Server-only: records monetization funnel events via astro-site internal endpoint.
 */

/** When true, funnel payloads may include `profile_snapshot` (set ANALYTICS_FUNNEL_INCLUDE_PROFILE_SNAPSHOT=true). */
export function shouldIncludeProfileSnapshotInAnalytics(): boolean {
  return process.env.ANALYTICS_FUNNEL_INCLUDE_PROFILE_SNAPSHOT === "true";
}

export type PurchaseServerEventName =
  | "purchase_cta_checkout_started"
  | "purchase_checkout_session_created"
  | "purchase_return_success"
  | "purchase_subscription_activated";

export async function recordPurchaseFunnelServerEvent(options: {
  eventName: PurchaseServerEventName;
  funnelSessionId: string;
  firebaseUid: string;
  stripeCheckoutSessionId?: string;
  checkoutTier?: string;
  idempotencyKey: string;
  profileSnapshot?: Record<string, unknown>;
  extraProperties?: Record<string, unknown>;
}): Promise<void> {
  const secret = process.env.ANALYTICS_FUNNEL_SERVER_SECRET;
  const base =
    process.env.MARKETING_SITE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL ||
    "https://aiworkoutgenerator.com";

  if (!secret) {
    return;
  }

  const includeProfile = shouldIncludeProfileSnapshotInAnalytics();

  const url = `${base.replace(/\/$/, "")}/api/analytics/track-event-internal`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        event_name: options.eventName,
        session_id: options.funnelSessionId,
        // user_id omitted: marketing-site insert uses anon Supabase; RLS allows only user_id IS NULL.
        app_id: "hub",
        properties: {
          firebase_uid: options.firebaseUid,
          stripe_checkout_session_id: options.stripeCheckoutSessionId ?? null,
          checkout_tier: options.checkoutTier ?? null,
          idempotency_key: options.idempotencyKey,
          ...(includeProfile && options.profileSnapshot
            ? { profile_snapshot: options.profileSnapshot }
            : {}),
          ...(options.extraProperties ?? {}),
        },
      }),
    });
  } catch {
    // non-blocking
  }
}

export async function recordPurchaseSubscriptionActivated(options: {
  /** purchase_flow_id from Checkout metadata, or Stripe checkout session id */
  funnelSessionId: string;
  firebaseUid: string;
  stripeCheckoutSessionId: string;
  profileSnapshot?: Record<string, unknown>;
}): Promise<void> {
  return recordPurchaseFunnelServerEvent({
    eventName: "purchase_subscription_activated",
    funnelSessionId: options.funnelSessionId,
    firebaseUid: options.firebaseUid,
    stripeCheckoutSessionId: options.stripeCheckoutSessionId,
    idempotencyKey: `subscription_activated:${options.stripeCheckoutSessionId}`,
    profileSnapshot: options.profileSnapshot,
  });
}
