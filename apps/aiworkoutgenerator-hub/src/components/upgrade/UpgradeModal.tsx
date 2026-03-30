"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Sparkles,
  Zap,
  Dumbbell,
  ChevronRight,
} from "lucide-react";
import type { User } from "firebase/auth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getIdToken } from "@/lib/auth";
import { getAppCheckHeaders } from "@/lib/firebase";
import {
  getOrCreatePurchaseFlowId,
  getPurchaseFlowId,
  trackPurchaseFunnelEvent,
} from "@/lib/purchase-funnel-analytics";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/**
 * The type of action that triggered the upgrade modal.
 * Used to show context-aware messaging.
 */
export type UpgradeTrigger =
  | "workout_limit"
  | "ai_edit_limit"
  | "ai_swap_limit"
  | "ai_add_limit"
  | "coach_explain_limit"
  | "image_limit"
  | "reverse_trial_ai"
  | "reverse_trial_analytics"
  | "churned_winback"
  | "general";

/** Loss-aversion / post-trial paywall — show Premium entry ($11.99) copy (see PHASE2_APP_STRIPE_NOTE). */
export function isPremiumEntryUpgradeTrigger(trigger: UpgradeTrigger): boolean {
  return (
    trigger === "reverse_trial_ai" ||
    trigger === "reverse_trial_analytics" ||
    trigger === "churned_winback"
  );
}

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  trigger?: UpgradeTrigger;
  onViewAllPlans?: () => void;
}

const TRIGGER_COPY: Record<
  UpgradeTrigger,
  { headline: string; subtext: string }
> = {
  workout_limit: {
    headline: "You've used all your free workouts",
    subtext:
      "Unlock 20 AI-generated workouts every month and keep your training on track.",
  },
  ai_edit_limit: {
    headline: "You've used all your free AI edits",
    subtext:
      "Get 100 AI Actions per month to customize every workout to your needs.",
  },
  ai_swap_limit: {
    headline: "You've used all your free AI swaps",
    subtext:
      "Get 100 AI Actions per month to swap exercises and make workouts yours.",
  },
  ai_add_limit: {
    headline: "You've used all your free AI adds",
    subtext:
      "Get 100 AI Actions per month to add exercises and build the perfect routine.",
  },
  coach_explain_limit: {
    headline: "You've used all your free Coach Explains",
    subtext:
      "Get 100 AI Actions per month for unlimited learning about every exercise.",
  },
  image_limit: {
    headline: "Image generation requires a Pro plan",
    subtext:
      "Upgrade to Pro or higher to generate exercise demonstration images.",
  },
  general: {
    headline: "Upgrade to unlock more",
    subtext: "Get more workouts, AI Actions, and premium features.",
  },
  reverse_trial_ai: {
    headline: "Your Pro trial ended — keep building with Premium",
    subtext:
      "You still have every workout you created. Subscribe to unlock AI generation and coaching tools again.",
  },
  reverse_trial_analytics: {
    headline: "Analytics are part of Premium",
    subtext:
      "Restore advanced workout reports and trends. Your completed workouts stay in your library.",
  },
  churned_winback: {
    headline: "Welcome back — restore your full access",
    subtext:
      "Reactivate Premium to get AI workouts, analytics, and the features you had before.",
  },
};

/** Display pricing for post-trial / win-back modal (entry paid tier; Stripe price from env). */
const PREMIUM_ENTRY_PRICE_LABEL = 11.99;
const PREMIUM_ENTRY_FEATURES = [
  "20 AI-generated workouts/month",
  "100 AI Actions/month (edits, adds, swaps)",
  "Workout history analytics",
  "Basic exercise library & check-ins",
];

const BASIC_FEATURES = [
  "20 AI-generated workouts/month",
  "100 AI Actions/month (edits, adds, swaps)",
  "Basic exercise library",
  "Daily check-in tracking",
  "Profile customization",
];

/**
 * High-converting upgrade modal that displays when a free user
 * reaches their free-plan monthly limits. Features the Basic plan ($5.99/mo)
 * as the primary conversion target with context-aware messaging
 * based on what action triggered the modal.
 */
export function UpgradeModal({
  open,
  onOpenChange,
  user,
  trigger = "general",
  onViewAllPlans,
}: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const copy = TRIGGER_COPY[trigger];
  const premiumEntry = isPremiumEntryUpgradeTrigger(trigger);
  const featureList = premiumEntry ? PREMIUM_ENTRY_FEATURES : BASIC_FEATURES;
  const displayPrice = premiumEntry ? PREMIUM_ENTRY_PRICE_LABEL : 5.99;
  const planLabel = premiumEntry ? "Premium" : "Basic";

  const handleUpgrade = async () => {
    if (!user) {
      router.push("/login?redirect=/generate");
      onOpenChange(false);
      return;
    }

    setLoading(true);

    try {
      const idToken = await getIdToken(true);
      if (!idToken) {
        logger.warn("Failed to get ID token, redirecting to login", {
          component: "UpgradeModal",
          trigger,
        });
        router.push("/login?redirect=/generate");
        onOpenChange(false);
        setLoading(false);
        return;
      }

      // Derive checkout tier from ID token so existing subscribers (basic/pro) are routed to the next plan, not Basic
      let checkoutTier: "basic" | "pro" | "elite" = "basic";
      try {
        const [, payloadBase64] = idToken.split(".");
        if (payloadBase64) {
          const payloadJson = atob(
            payloadBase64.replace(/-/g, "+").replace(/_/g, "/")
          );
          const payload = JSON.parse(payloadJson) as {
            subscription_tier?: string;
          };
          const current = payload.subscription_tier?.trim?.();
          if (current === "basic") checkoutTier = "pro";
          else if (current === "pro") checkoutTier = "elite";
          // free / elite / coach / missing → basic (or elite for already-top-tier; API accepts)
          else if (
            current === "elite" ||
            current === "coach" ||
            current === "coach_pro"
          )
            checkoutTier = "elite";
        }
      } catch (tokenError) {
        logger.warn(
          "Failed to decode ID token for tier; defaulting to basic",
          tokenError,
          { component: "UpgradeModal", trigger }
        );
      }

      const flowId = getPurchaseFlowId() || getOrCreatePurchaseFlowId();

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(await getAppCheckHeaders()),
        },
        body: JSON.stringify({
          tier: checkoutTier,
          purchase_flow_id: flowId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login?redirect=/generate");
          onOpenChange(false);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to create checkout session");
      }

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
        component: "UpgradeModal",
        trigger,
        userId: user?.uid || null,
      });
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
      setLoading(false);
    }
  };

  const handleViewAllPlans = () => {
    if (onViewAllPlans) {
      onViewAllPlans();
    } else {
      router.push(
        isPremiumEntryUpgradeTrigger(trigger)
          ? "/pricing?from=trial_ended"
          : "/pricing"
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden">
        {/* Hero section with gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 pt-8 pb-6">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {copy.headline}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground max-w-sm mx-auto">
              {copy.subtext}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Plan card */}
        <div className="px-6 pb-6 space-y-5">
          {/* Price + trial badge */}
          <div className="text-center space-y-2">
            {premiumEntry ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {planLabel}
              </p>
            ) : null}
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold tracking-tight">
                ${displayPrice.toFixed(2)}
              </span>
              <span className="text-muted-foreground text-base">/month</span>
            </div>
            {premiumEntry ? (
              <div className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-sm font-medium px-3 py-1 rounded-full">
                Billed monthly · Cancel anytime
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium px-3 py-1 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                7-day free trial included
              </div>
            )}
          </div>

          {/* Features list */}
          <ul className="space-y-2.5">
            {featureList.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                {premiumEntry ? "Subscribe to Premium" : "Start Free Trial"}
              </>
            )}
          </Button>

          {/* Secondary actions */}
          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleViewAllPlans}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Compare all plans
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </button>
            <p className="text-xs text-muted-foreground">
              Cancel anytime. No commitment.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
