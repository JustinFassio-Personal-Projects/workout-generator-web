"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useUser } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { clearPurchaseFlowOnSuccess } from "@/lib/purchase-funnel-analytics";

/**
 * One-shot funnel event when returning from Stripe Checkout success URL.
 */
export function PurchaseReturnAnalytics() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const success = searchParams.get("success");
    const stripeSession = searchParams.get("session_id");
    if (success !== "true" || !stripeSession) return;

    const dedupeKey = `md_ret_${stripeSession}`;
    try {
      if (typeof sessionStorage !== "undefined") {
        if (sessionStorage.getItem(dedupeKey)) {
          fired.current = true;
          return;
        }
        sessionStorage.setItem(dedupeKey, "1");
      }
    } catch {
      // continue
    }

    fired.current = true;
    if (user) {
      void authenticatedFetch("/api/stripe/checkout-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: stripeSession }),
        user,
      }).catch(() => null);
    }
    // Force fresh claims immediately after successful checkout return.
    void user
      ?.getIdToken(true)
      .catch(() => null)
      .finally(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("subscription:refresh"));
        }
      });
    clearPurchaseFlowOnSuccess();
  }, [searchParams, user?.uid]);

  return null;
}
