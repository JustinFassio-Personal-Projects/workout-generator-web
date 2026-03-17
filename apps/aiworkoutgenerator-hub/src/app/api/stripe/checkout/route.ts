import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import {
  stripe,
  isStripeConfigured,
  isStripeTestMode,
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
} from "@/lib/stripe";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const RequestBodySchema = z.object({
  tier: z.enum(["basic", "pro", "elite", "coach", "coach_pro"]),
});

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
 * Get or create a Stripe customer for the user.
 * Validates existing customer IDs to handle test/live mode switches.
 */
async function getOrCreateStripeCustomer(
  uid: string,
  email: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const userDoc = await adminDb.collection("users").doc(uid).get();
  const userData = userDoc.data();

  if (userData?.stripe_customer_id) {
    // Validate that the customer exists in the current Stripe account
    try {
      await stripe.customers.retrieve(userData.stripe_customer_id);
      return userData.stripe_customer_id;
    } catch (error) {
      // Only treat resource_missing (404) as "customer doesn't exist"
      // Re-throw transient errors (network failures, rate limits, service outages)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "resource_missing"
      ) {
        // Customer doesn't exist in this Stripe account (test/live mode switch)
        // Fall through to create a new customer
        logger.info("Stripe customer not found, creating new one", {
          route: "/api/stripe/checkout",
          customerId: userData.stripe_customer_id,
        });
      } else {
        // Re-throw transient errors to be handled by outer catch block
        throw error;
      }
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      firebaseUID: uid,
    },
  });

  // Save customer ID to Firestore
  await adminDb.collection("users").doc(uid).set(
    {
      stripe_customer_id: customer.id,
    },
    { merge: true }
  );

  return customer.id;
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  // Declare tier outside try block for error handling
  let tier: SubscriptionTier | null = null;

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
    let email: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email || "";
    } catch (error) {
      logger.error("Token verification failed", error, {
        route: "/api/stripe/checkout",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = RequestBodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    tier = (parseResult.data as { tier: SubscriptionTier }).tier;

    // 3. Get price ID for the tier
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    const priceId = tierConfig.priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this tier" },
        { status: 500 }
      );
    }

    // Note: Price validation removed - Stripe will validate the price when creating the checkout session
    // This allows checkout to proceed even if there are mode mismatches during validation
    // The actual checkout session creation will fail with a clear error if prices don't match

    // 4. Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(uid, email);

    // 5. Create Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        firebaseUID: uid,
        tier,
      },
      subscription_data: {
        metadata: {
          firebaseUID: uid,
        },
      },
    });

    // 6. Return session ID for client redirect
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    // Capture error in Sentry - payment errors are critical
    captureApiError(error, {
      endpoint: "stripe_checkout",
      operation: "create_checkout_session",
      extra: {
        tier: tier || undefined,
      },
    });

    logger.error("Checkout session error", error, {
      route: "/api/stripe/checkout",
      operation: "create_checkout_session",
      tier: tier || undefined,
    });

    // Extract more detailed error information
    let errorMessage = "Failed to create checkout session";
    let errorDetails: Record<string, unknown> = {};

    // Get tier config for error details (if available)
    const tierConfigForError = tier ? SUBSCRIPTION_TIERS[tier] : null;

    if (error && typeof error === "object") {
      // Stripe errors have a type and message
      if ("type" in error && "message" in error) {
        errorMessage = error.message as string;
        errorDetails = {
          type: error.type,
          code: "code" in error ? error.code : undefined,
          param: "param" in error ? error.param : undefined,
          decline_code:
            "decline_code" in error ? error.decline_code : undefined,
        };
      } else if ("message" in error) {
        errorMessage = error.message as string;
      }
    }

    // Provide helpful context for common errors
    const stripeMode = isStripeTestMode();
    if (
      errorMessage.includes("No such price") ||
      errorMessage.includes("Invalid price")
    ) {
      let modeGuidance = "";

      if (stripeMode === true) {
        modeGuidance =
          " You are using test mode keys, so ensure the price ID is from your Stripe test mode dashboard. This could also be a typo or the price may have been deleted.";
        errorDetails.liveModeHint =
          "If you intended to use live mode, ensure App Hosting secrets (stripe-secret-key and price IDs) are set to live values and the backend was redeployed.";
      } else if (stripeMode === false) {
        modeGuidance =
          " You are using live mode keys, so ensure the price ID is from your Stripe live mode dashboard. This could also be a typo or the price may have been deleted.";
      } else {
        modeGuidance =
          " This might be a mode mismatch (test vs live), a typo, or the price may have been deleted. Verify your price IDs match your Stripe mode.";
      }

      errorMessage = `Price ID not found.${modeGuidance}`;

      if (tierConfigForError) {
        errorDetails.priceId = tierConfigForError.priceId;
      }
      if (tier) {
        errorDetails.tier = tier;
      }
      // Expose detected mode so operators can verify backend is using intended keys
      errorDetails.stripeMode =
        stripeMode === true
          ? "test"
          : stripeMode === false
            ? "live"
            : "unknown";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        // Include stripeMode and hints for price errors so production can verify backend config
        ...(Object.keys(errorDetails).length > 0 && { details: errorDetails }),
        // Development-only: full details and stack
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
