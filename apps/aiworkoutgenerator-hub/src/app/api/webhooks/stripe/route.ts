import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb, setUserClaims } from "@/lib/firebase-admin";
import {
  stripe,
  getTierFromPriceId,
  type SubscriptionTier,
} from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { getMonetizationProfileSnapshot } from "@/lib/monetization-profile-snapshot";
import {
  recordPurchaseSubscriptionActivated,
  shouldIncludeProfileSnapshotInAnalytics,
} from "@/lib/record-purchase-subscription-analytics";
import { captureApiError, incrementMetric } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Configuration
// ============================================

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Relevant events for subscription management
const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
]);

// ============================================
// Helper Functions
// ============================================

/**
 * Update user's subscription status in Firestore and custom claims.
 */
async function updateUserSubscription(
  uid: string,
  tier: SubscriptionTier,
  status: "active" | "canceled" | "past_due",
  subscriptionId: string | null,
  trialEndsAt: string | null = null
) {
  // Update Firestore
  await adminDb.collection("users").doc(uid).set(
    {
      subscription_tier: tier,
      subscription_status: status,
      stripe_subscription_id: subscriptionId,
      trial_ends_at: trialEndsAt,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Update custom claims for real-time access control
  await setUserClaims(uid, {
    subscription_tier: tier,
    subscription_status: status,
  });
}

/**
 * Handle checkout session completed event.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const uid = session.metadata?.firebaseUID;
  if (!uid) {
    logger.error("No firebaseUID in checkout session metadata", undefined, {
      route: "/api/webhooks/stripe",
      operation: "handle_checkout_completed",
      sessionId: session.id,
    });
    return;
  }

  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const priceId = subscription.items.data[0]?.price.id;
    const tier = priceId ? getTierFromPriceId(priceId) : "free";

    const trialEndsAt =
      typeof subscription.trial_end === "number" && subscription.trial_end > 0
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null;
    await updateUserSubscription(
      uid,
      tier,
      "active",
      subscription.id,
      trialEndsAt
    );
    incrementMetric("stripe.conversion", 1, { tier });

    const flowId =
      typeof session.metadata?.purchase_flow_id === "string"
        ? session.metadata.purchase_flow_id
        : null;
    const profileSnapshot = shouldIncludeProfileSnapshotInAnalytics()
      ? await getMonetizationProfileSnapshot(uid)
      : null;
    void recordPurchaseSubscriptionActivated({
      funnelSessionId: flowId || session.id,
      firebaseUid: uid,
      stripeCheckoutSessionId: session.id,
      profileSnapshot: profileSnapshot ?? undefined,
    });
  }
}

/**
 * Handle subscription updated/created event.
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.firebaseUID;
  if (!uid) {
    logger.error("No firebaseUID in subscription metadata", undefined, {
      route: "/api/webhooks/stripe",
      operation: "handle_subscription_change",
      subscriptionId: subscription.id,
    });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : "free";

  // Map Stripe status to our status
  let status: "active" | "canceled" | "past_due" = "active";
  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    status = "canceled";
  } else if (subscription.status === "past_due") {
    status = "past_due";
  }

  const trialEndsAt =
    typeof subscription.trial_end === "number" && subscription.trial_end > 0
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
  await updateUserSubscription(uid, tier, status, subscription.id, trialEndsAt);
}

/**
 * Handle subscription deleted event.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.firebaseUID;
  if (!uid) {
    logger.error("No firebaseUID in subscription metadata", undefined, {
      route: "/api/webhooks/stripe",
      operation: "handle_subscription_deleted",
      subscriptionId: subscription.id,
    });
    return;
  }

  // Downgrade to free tier
  await updateUserSubscription(uid, "free", "canceled", null, null);
}

/**
 * Handle invoice payment failed event.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Get subscription ID from the invoice's parent subscription
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : invoice.parent?.subscription_details?.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const uid = subscription.metadata?.firebaseUID;

  if (uid) {
    await adminDb.collection("users").doc(uid).set(
      {
        subscription_status: "past_due",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await setUserClaims(uid, {
      subscription_status: "past_due",
    });
  }
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Check if webhook secret is configured
    if (!webhookSecret) {
      const isDevelopment = process.env.NODE_ENV === "development";
      const errorMessage = isDevelopment
        ? "STRIPE_WEBHOOK_SECRET not configured. For local testing, use Stripe CLI: 'stripe listen --forward-to localhost:3000/api/webhooks/stripe' or set STRIPE_WEBHOOK_SECRET in .env.local with your test webhook secret."
        : "STRIPE_WEBHOOK_SECRET not configured";
      logger.error(
        "STRIPE_WEBHOOK_SECRET not configured",
        new Error(errorMessage),
        {
          route: "/api/webhooks/stripe",
          operation: "webhook_config_check",
        }
      );
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // 2. Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // 3. Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logger.error("Webhook signature verification failed", err, {
        route: "/api/webhooks/stripe",
        operation: "verify_webhook_signature",
      });
      const isDevelopment = process.env.NODE_ENV === "development";
      const errorMessage = isDevelopment
        ? `Invalid webhook signature. Make sure you're using the correct webhook secret for your Stripe mode (test vs live). If using Stripe CLI, use the webhook secret shown by 'stripe listen'.`
        : "Invalid signature";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // 4. Check if this is a relevant event
    if (!RELEVANT_EVENTS.has(event.type)) {
      return NextResponse.json({ received: true, skipped: true });
    }

    // 5. Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "invoice.payment_succeeded": {
        // Payment succeeded, subscription should be active
        // This is handled by subscription.updated event
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Capture error in Sentry - webhook failures are critical (payments may not process)
    captureApiError(error, {
      endpoint: "stripe_webhook",
      operation: "handle_webhook",
    });

    logger.error("Webhook handler error", error, {
      route: "/api/webhooks/stripe",
      operation: "handle_webhook",
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
