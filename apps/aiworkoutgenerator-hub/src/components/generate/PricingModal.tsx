"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, X, Zap } from "lucide-react";
import type { User } from "firebase/auth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PRICING_TIERS } from "@/lib/pricing-tiers";
import { getIdToken } from "@/lib/auth";
import { getAppCheckHeaders } from "@/lib/firebase";
import {
  getOrCreatePurchaseFlowId,
  getPurchaseFlowId,
  trackPurchaseFunnelEvent,
} from "@/lib/purchase-funnel-analytics";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

// Tier configuration with page-specific fields
// Only show upgrade options (exclude free tier)
interface TierWithExtras {
  id: "basic" | "pro" | "elite" | "coach" | "coach_pro";
  name: string;
  price: number;
  description: string;
  features: string[];
  limitations: string[];
  popular: boolean;
  cta: string;
  note?: string;
}

const filteredTiers = PRICING_TIERS.filter(
  (
    tier
  ): tier is (typeof PRICING_TIERS)[number] & {
    id: "basic" | "pro" | "elite" | "coach" | "coach_pro";
  } =>
    tier.id === "basic" ||
    tier.id === "pro" ||
    tier.id === "elite" ||
    tier.id === "coach" ||
    tier.id === "coach_pro"
);

const TIERS: TierWithExtras[] = filteredTiers.map((tier): TierWithExtras => {
  if (tier.id === "basic") {
    return {
      ...tier,
      limitations: ["No calendar scheduling", "No coach access"],
      popular: false,
      cta: "Upgrade to Basic",
    };
  }
  if (tier.id === "pro") {
    return {
      ...tier,
      limitations: [],
      popular: false,
      cta: "Upgrade to Pro",
    };
  }
  if (tier.id === "elite") {
    return {
      ...tier,
      limitations: [],
      popular: false,
      cta: "Go Elite",
    };
  }
  if (tier.id === "coach") {
    return {
      ...tier,
      limitations: [],
      popular: false,
      cta: "Work with a Coach",
      note: "Limited spots — coaching is delivered by Justin.",
    };
  }
  // tier.id === "coach_pro"
  return {
    ...tier,
    limitations: [],
    popular: true,
    cta: "Upgrade to Coach Pro",
  };
});

/**
 * Modal component presenting available paid pricing tiers for upgrading.
 *
 * The modal is controlled via the `open` prop and `onOpenChange` callback.
 * When a user selects a tier:
 * - If `user` is null, they are redirected to the login page with a redirect
 *   back to the generate page, and the modal is closed.
 * - If `user` is present, a Stripe Checkout session is created and, on success,
 *   the browser is redirected to the returned Stripe Checkout URL.
 *
 * This component is used in the upgrade flow on the generate page to guide
 * users into purchasing or upgrading their subscription.
 *
 * @param open Controls whether the pricing modal is visible.
 * @param onOpenChange Callback invoked when the modal's open state changes.
 * @param user The currently authenticated Firebase user, or null if logged out.
 */
export function PricingModal({ open, onOpenChange, user }: PricingModalProps) {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (
    tierId: "basic" | "pro" | "elite" | "coach" | "coach_pro"
  ) => {
    if (!user) {
      router.push("/login?redirect=/generate");
      onOpenChange(false);
      return;
    }

    setLoadingTier(tierId);

    try {
      // Force refresh token to ensure it's valid
      const idToken = await getIdToken(true);
      if (!idToken) {
        // If token is still null, user might need to re-authenticate
        logger.warn("Failed to get ID token, redirecting to login", {
          component: "PricingModal",
          tierId,
          hasUser: !!user,
        });
        router.push("/login?redirect=/generate");
        onOpenChange(false);
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
        // Handle 401 (unauthorized) - token might be expired
        if (response.status === 401) {
          logger.warn("Authentication failed, redirecting to login", {
            component: "PricingModal",
            tierId,
            error: data.error,
          });
          router.push("/login?redirect=/generate");
          onOpenChange(false);
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
        component: "PricingModal",
        tierId,
        userId: user?.uid || null,
      });
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
      setLoadingTier(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            You&apos;ve reached your workout limit. Choose a plan to continue
            generating more AI-powered workouts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mt-4">
          {TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.popular
                  ? "border-primary shadow-lg scale-105 z-10"
                  : "border-border"
              }`}
            >
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
                      <X
                        className="h-5 w-5 flex-shrink-0 mt-0.5"
                        aria-label="Not included"
                        aria-hidden="false"
                      />
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  variant={tier.popular ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={loadingTier !== null}
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
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground mt-6">
          <p>All plans include a 7-day free trial. Cancel anytime.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
