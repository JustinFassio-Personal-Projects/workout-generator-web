import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyIdToken } from "@/lib/firebase-admin";
import { requireAppCheck } from "@/lib/app-check";
import { stripe } from "@/lib/stripe";
import { recordPurchaseFunnelServerEvent } from "@/lib/record-purchase-subscription-analytics";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  session_id: z.string().min(6).max(128),
});

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;

  try {
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const decoded = await verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const sessionId = parsed.data.session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUid = session.metadata?.firebaseUID;
    const flowId =
      typeof session.metadata?.purchase_flow_id === "string"
        ? session.metadata.purchase_flow_id
        : null;

    // Final handshake validation: session must belong to current Firebase user.
    if (!sessionUid || sessionUid !== uid) {
      return NextResponse.json(
        { error: "Session does not belong to user" },
        { status: 403 }
      );
    }

    // Guard against manual /dashboard navigation with fake session IDs.
    if (
      session.status !== "complete" ||
      (session.payment_status !== "paid" &&
        session.payment_status !== "no_payment_required")
    ) {
      return NextResponse.json(
        { error: "Checkout session not completed" },
        { status: 409 }
      );
    }

    void recordPurchaseFunnelServerEvent({
      eventName: "purchase_return_success",
      funnelSessionId: flowId || session.id,
      firebaseUid: uid,
      stripeCheckoutSessionId: session.id,
      checkoutTier:
        typeof session.metadata?.tier === "string"
          ? session.metadata.tier
          : undefined,
      idempotencyKey: `return_success:${session.id}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Checkout success tracking failed", error, {
      route: "/api/stripe/checkout-success",
    });
    return NextResponse.json(
      { error: "Failed to track checkout success" },
      { status: 500 }
    );
  }
}
