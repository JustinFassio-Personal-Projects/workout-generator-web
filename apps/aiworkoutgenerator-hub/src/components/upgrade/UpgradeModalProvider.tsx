"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@/lib/auth";
import type { UpgradeTrigger } from "./UpgradeModal";

// Lazy-load modals to keep them out of the initial client bundle; chunks load when first opened
const UpgradeModal = dynamic(
  () => import("./UpgradeModal").then((m) => ({ default: m.UpgradeModal })),
  { ssr: false }
);
const PricingModal = dynamic(
  () =>
    import("@/components/generate/PricingModal").then((m) => ({
      default: m.PricingModal,
    })),
  { ssr: false }
);

interface UpgradeModalContextType {
  /**
   * Show the focused upgrade modal with context-aware messaging.
   * @param trigger - What action caused the limit to be hit
   */
  showUpgradeModal: (trigger?: UpgradeTrigger) => void;
  /**
   * Show the full pricing comparison modal with all tiers.
   */
  showPricingModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(
  undefined
);

/**
 * Provider that renders both the focused upgrade modal and the full pricing modal.
 * Wrap the app with this to enable any component to trigger upgrade prompts
 * via the useUpgradeModal() hook.
 */
export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [trigger, setTrigger] = useState<UpgradeTrigger>("general");
  const [hasOpenedUpgrade, setHasOpenedUpgrade] = useState(false);
  const [hasOpenedPricing, setHasOpenedPricing] = useState(false);

  const showUpgradeModal = useCallback((t: UpgradeTrigger = "general") => {
    setTrigger(t);
    setHasOpenedUpgrade(true);
    setUpgradeOpen(true);
  }, []);

  const showPricingModal = useCallback(() => {
    setHasOpenedPricing(true);
    setPricingOpen(true);
  }, []);

  const handleViewAllPlans = useCallback(() => {
    setUpgradeOpen(false);
    setPricingOpen(true);
    setHasOpenedPricing(true);
  }, []);

  return (
    <UpgradeModalContext.Provider
      value={{ showUpgradeModal, showPricingModal }}
    >
      {children}
      {hasOpenedUpgrade && (
        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          user={user}
          trigger={trigger}
          onViewAllPlans={handleViewAllPlans}
        />
      )}
      {hasOpenedPricing && (
        <PricingModal
          open={pricingOpen}
          onOpenChange={setPricingOpen}
          user={user}
        />
      )}
    </UpgradeModalContext.Provider>
  );
}

/**
 * Hook to trigger the upgrade modal from any component.
 * Must be used within an UpgradeModalProvider.
 *
 * @example
 * ```tsx
 * const { showUpgradeModal } = useUpgradeModal();
 * // When user hits edit limit:
 * showUpgradeModal("ai_edit_limit");
 * ```
 */
export function useUpgradeModal(): UpgradeModalContextType {
  const context = useContext(UpgradeModalContext);
  if (context === undefined) {
    throw new Error(
      "useUpgradeModal must be used within an UpgradeModalProvider"
    );
  }
  return context;
}
