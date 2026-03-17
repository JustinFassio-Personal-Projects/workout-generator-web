import { NextRequest, NextResponse } from "next/server";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Helper Functions
// ============================================

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Validate that a Stripe customer exists in the current account.
 * Returns false only for resource_missing (404) errors.
 * Re-throws transient errors (network failures, rate limits, service outages).
 */
async function validateStripeCustomer(customerId: string): Promise<boolean> {
  try {
    await stripe.customers.retrieve(customerId);
    return true;
  } catch (error) {
    // Only treat resource_missing (404) as "customer doesn't exist"
    // Re-throw transient errors (network failures, rate limits, service outages)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "resource_missing"
    ) {
      logger.info("Stripe customer not found in current account", {
        route: "/api/stripe/portal",
        customerId,
      });
      return false;
    }
    // Log transient errors before re-throwing for debugging
    logger.error(
      "Failed to validate Stripe customer (transient error)",
      error,
      {
        route: "/api/stripe/portal",
        operation: "validate_stripe_customer",
        customerId,
      }
    );
    // Re-throw transient errors to be handled by outer catch block
    throw error;
  }
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 0. Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured. Subscriptions are unavailable." },
        { status: 503 }
      );
    }

    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error) {
      logger.error("Token verification failed", error, {
        route: "/api/stripe/portal",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Get user's Stripe customer ID
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();

    if (!userData?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    // Validate customer exists in current Stripe account (handles test/live mode switch)
    const customerExists = await validateStripeCustomer(
      userData.stripe_customer_id
    );
    if (!customerExists) {
      // Clear invalid customer ID and prompt user to resubscribe
      await adminDb.collection("users").doc(uid).update({
        stripe_customer_id: null,
      });
      return NextResponse.json(
        { error: "Subscription not found. Please subscribe again." },
        { status: 400 }
      );
    }

    // 3. Create Customer Portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${appUrl}/dashboard`,
    });

    // 4. Return portal URL
    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    // Capture error in Sentry - payment portal errors are critical
    captureApiError(error, {
      endpoint: "stripe_portal",
      operation: "create_portal_session",
    });

    logger.error("Customer portal error", error, {
      route: "/api/stripe/portal",
      operation: "create_portal_session",
    });

    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
