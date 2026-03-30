"use client";

import { useCallback } from "react";

import { useUser } from "@/lib/auth";
import { useReverseTrialCapabilities } from "@/components/reverse-trial/ReverseTrialCapabilitiesContext";
import { useUpgradeModal } from "@/components/upgrade";
import {
  trackFeatureLockClick,
  type ReverseTrialFunnelSurface,
} from "@/lib/reverse-trial-funnel-analytics";

/**
 * When reverse-trial enforcement blocks AI, use this to short-circuit client actions
 * before calling Hub API routes.
 */
export function useReverseTrialAiLock(surface: ReverseTrialFunnelSurface) {
  const { user } = useUser();
  const { capabilities } = useReverseTrialCapabilities();
  const { showUpgradeModal } = useUpgradeModal();

  const aiLocked = Boolean(
    capabilities?.enforcement_enabled && capabilities.can_use_ai === false
  );

  const onLockedAction = useCallback(() => {
    trackFeatureLockClick(surface, {
      firebaseUid: user?.uid ?? null,
      capabilities,
    });
    showUpgradeModal(
      capabilities?.ended_reason === "churned"
        ? "churned_winback"
        : "reverse_trial_ai"
    );
  }, [capabilities, showUpgradeModal, surface, user?.uid]);

  return { aiLocked, onLockedAction };
}
