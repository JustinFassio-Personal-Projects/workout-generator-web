"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Loader2, Sparkles, Zap } from "lucide-react";

import { useUser, getIdToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { PRICING_TIERS } from "@/lib/pricing-tiers";
import { getAppCheckHeaders } from "@/lib/firebase";
import {
  getOrCreatePurchaseFlowId,
  getPurchaseFlowId,
  trackPurchaseFunnelEvent,
  trackPurchasePaywallFirstTouch,
} from "@/lib/purchase-funnel-analytics";
import { logger } from "@/lib/logger";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useReverseTrialCapabilities } from "@/components/reverse-trial/ReverseTrialCapabilitiesContext";
import { TrialEndedExplainerTrigger } from "@/components/reverse-trial/TrialEndedExplainer";
import { trackTrialExpiredViewedOnce } from "@/lib/reverse-trial-funnel-analytics";

// ============================================
// Tier Configuration (extends base tiers with page-specific fields)
// ============================================

type TierWithExtras = {
  id: "free" | "basic" | "pro" | "elite" | "coach" | "coach_pro";
  name: string;
  price: number;
  description: string;
  features: string[];
  limitations: string[];
  popular: boolean;
  cta: string;
  note?: string;
};

const TIERS: TierWithExtras[] = PRICING_TIERS.map((tier) => {
  // Add page-specific fields based on tier ID
  switch (tier.id) {
    case "free":
      return {
        ...tier,
        limitations: ["No calendar scheduling", "No coach access"],
        popular: false,
        cta: "Current Plan",
      };
    case "basic":
      return {
        ...tier,
        limitations: ["No calendar scheduling", "No coach access"],
        popular: false,
        cta: "Upgrade to Basic",
      };
    case "pro":
      return {
        ...tier,
        limitations: [],
        popular: false,
        cta: "Upgrade to Pro",
      };
    case "elite":
      return {
        ...tier,
        limitations: [],
        popular: false,
        cta: "Go Elite",
      };
    case "coach":
      return {
        ...tier,
        limitations: [],
        popular: false,
        cta: "Work with a Coach",
        note: "Limited spots — coaching is delivered by Justin.",
      };
    case "coach_pro":
      return {
        ...tier,
        limitations: [],
        popular: true,
        cta: "Upgrade to Coach Pro",
      };
    default:
      return {
        ...tier,
        limitations: [],
        popular: false,
        cta: "Upgrade",
      };
  }
});

// ============================================
// Search Params Handler (requires Suspense)
// ============================================

function CanceledHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (canceled === "true") {
      toast.info("Checkout canceled. You can try again anytime.");
      // Clear the param
      router.replace("/pricing");
    }
  }, [canceled, router]);

  return null;
}

// ============================================
// Main Component
// ============================================

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useUser();
  const { capabilities } = useReverseTrialCapabilities();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const fromTrialEnded = searchParams.get("from") === "trial_ended";
  const growthState = capabilities?.growth_state ?? null;
  const showPaywallPivot =
    fromTrialEnded ||
    Boolean(
      capabilities?.enforcement_enabled &&
      (growthState === "reverse_trial_expired" || growthState === "churned")
    );
  const pivotChurned = capabilities?.ended_reason === "churned";

  // Handle scroll to anchor on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }

    // Remove the # and extract tier ID
    const tierId = hash.slice(1); // e.g., "tier-basic"
    let frameId: number | null = null;
    let timeoutId: number | null = null;

    const scrollIfReady = () => {
      const element = document.getElementById(tierId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        frameId = null;
        return;
      }
      // Try again on next animation frame
      frameId = window.requestAnimationFrame(scrollIfReady);
    };

    // Start trying to scroll on the next paint
    frameId = window.requestAnimationFrame(scrollIfReady);

    // Safety timeout: stop trying after a reasonable time window
    timeoutId = window.setTimeout(() => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      // Final attempt
      const element = document.getElementById(tierId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 1000);

    // Cleanup function
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    trackPurchasePaywallFirstTouch({
      modal: "pricing",
      firebaseUid: user.uid,
      surface: "/pricing",
    });
  }, [authLoading, user]);

  useEffect(() => {
    if (!capabilities?.enforcement_enabled) return;
    if (growthState !== "reverse_trial_expired" && growthState !== "churned") {
      return;
    }
    if (!showPaywallPivot) return;
    trackTrialExpiredViewedOnce("pricing_pivot_strip", {
      firebaseUid: user?.uid ?? null,
      capabilities,
    });
  }, [capabilities, growthState, showPaywallPivot, user?.uid]);

  const handleSubscribe = async (
    tierId: "basic" | "pro" | "elite" | "coach" | "coach_pro"
  ) => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push("/login?redirect=/pricing");
      return;
    }

    setLoadingTier(tierId);

    try {
      // Force refresh token to ensure it's valid
      const idToken = await getIdToken(true);
      if (!idToken) {
        // If token is still null, user might need to re-authenticate
        logger.warn("Failed to get ID token, redirecting to login", {
          component: "PricingPage",
          tierId,
          hasUser: !!user,
        });
        router.push("/login?redirect=/pricing");
        setLoadingTier(null);
        return;
      }

      const flowId = getPurchaseFlowId() || getOrCreatePurchaseFlowId();

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(await getAppCheckHeaders()),
        },
        body: JSON.stringify({ tier: tierId, purchase_flow_id: flowId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Log API details when present (e.g. stripeMode, liveModeHint) for production debugging
        if (data.details && Object.keys(data.details).length > 0) {
          logger.error("Checkout API error details", data.error, {
            component: "PricingPage",
            tierId,
            details: data.details,
          });
        }
        // Handle 401 (unauthorized) - token might be expired
        if (response.status === 401) {
          logger.warn("Authentication failed, redirecting to login", {
            component: "PricingPage",
            tierId,
            error: data.error,
          });
          router.push("/login?redirect=/pricing");
          setLoadingTier(null);
          return;
        }
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout (URL is required; session id is best-effort for funnel correlation)
      if (data.url) {
        const redirectProps: Record<string, unknown> = {
          firebase_uid: user.uid,
        };
        if (data.sessionId) {
          redirectProps.stripe_checkout_session_id = data.sessionId;
        }
        trackPurchaseFunnelEvent(
          "purchase_stripe_redirect",
          redirectProps,
          flowId
        );
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      logger.error("Checkout error", error, {
        component: "PricingPage",
        tierId,
        userId: user?.uid || null,
      });
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          AI-powered workouts and AI Actions (edits, adds, swaps) tailored to
          your goals, energy levels, and available equipment.
        </p>
      </div>

      {showPaywallPivot ? (
        <Alert className="mb-10 border-primary/35 bg-primary/5 text-left">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle>
            {pivotChurned ? "Reactivate Premium" : "After your Pro trial"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {pivotChurned
                ? "Restore AI workout generation, advanced analytics, and the rest of your paid features. Workouts you already completed stay in your account."
                : "You keep every workout you created during the trial. Subscribe to unlock new AI generation and advanced summary analytics again."}
            </p>
            <div className="flex flex-wrap gap-2">
              <TrialEndedExplainerTrigger
                endedReason={
                  capabilities?.ended_reason ??
                  (growthState === "churned"
                    ? "churned"
                    : "reverse_trial_expired")
                }
                variant="outline"
                size="sm"
              />
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {TIERS.map((tier) => (
          <Card
            key={tier.id}
            id={`tier-${tier.id}`}
            className={`relative flex flex-col ${
              tier.popular
                ? "border-primary shadow-lg scale-105 z-10"
                : "border-border"
            } ${
              showPaywallPivot && tier.id === "pro"
                ? "ring-2 ring-primary/70 border-primary/40 shadow-md md:scale-[1.02] z-[5]"
                : ""
            }`}
          >
            {showPaywallPivot && tier.id === "pro" ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Restores AI &amp; analytics
                </span>
              </div>
            ) : null}
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              {/* Price */}
              <div className="text-center mb-6">
                <span className="text-4xl font-bold">${tier.price}</span>
                {tier.price > 0 && (
                  <span className="text-muted-foreground">/month</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
                {tier.limitations.map((limitation, index) => (
                  <li
                    key={`limit-${index}`}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <span className="h-5 w-5 flex items-center justify-center flex-shrink-0">
                      —
                    </span>
                    <span className="text-sm">{limitation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              {tier.id === "free" ? (
                <Button variant="outline" className="w-full" disabled>
                  {tier.cta}
                </Button>
              ) : (
                <>
                  <Button
                    variant={tier.popular ? "default" : "outline"}
                    className="w-full"
                    onClick={() => {
                      if (tier.id !== "free") {
                        handleSubscribe(tier.id);
                      }
                    }}
                    disabled={authLoading || loadingTier !== null}
                  >
                    {loadingTier === tier.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {tier.popular && <Zap className="mr-2 h-4 w-4" />}
                        {tier.cta}
                      </>
                    )}
                  </Button>
                  {tier.note && (
                    <p className="text-xs text-muted-foreground text-center">
                      {tier.note}
                    </p>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* FAQ or Additional Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>All plans include a 7-day free trial. Cancel anytime.</p>
        <p className="mt-1">
          Questions?{" "}
          <a href="mailto:support@aiworkoutgen.app" className="underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}

// ============================================
// Page Export with Suspense Boundary
// ============================================

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-12 text-center text-muted-foreground">
          Loading pricing…
        </div>
      }
    >
      <CanceledHandler />
      <PricingContent />
    </Suspense>
  );
}
