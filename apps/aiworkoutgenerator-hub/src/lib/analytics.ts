// ============================================
// Analytics Utility
// ============================================

import { getAnalytics, logEvent, type Analytics } from "firebase/analytics";
import { app } from "@/lib/firebase";

let analytics: Analytics | null = null;

function getAnalyticsInstance(): Analytics | null {
  if (typeof window === "undefined") return null;

  try {
    if (!analytics && app) {
      analytics = getAnalytics(app);
    }
    return analytics;
  } catch (error) {
    // Analytics might not be initialized (e.g., in development without measurement ID)
    if (process.env.NODE_ENV === "development") {
      console.warn("[Analytics] Failed to initialize:", error);
    }
    return null;
  }
}

// ============================================
// Support Center Analytics Events
// ============================================

export interface SupportAnalyticsEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Track support center analytics event
 * Logs to both Firebase Analytics (if available) and console
 */
export function trackSupportEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  const analyticsInstance = getAnalyticsInstance();

  // Log to console for debugging
  console.log(`[Analytics] ${eventName}`, params || {});

  // Log to Firebase Analytics if available
  if (analyticsInstance) {
    try {
      logEvent(analyticsInstance, eventName, params);
    } catch (error) {
      console.warn(`[Analytics] Failed to log event ${eventName}:`, error);
    }
  }
}

// ============================================
// Event Helpers
// ============================================

export function trackSupportOpened(): void {
  trackSupportEvent("support_opened");
}

export function trackSupportTypeSelected(type: string): void {
  trackSupportEvent("support_type_selected", { type });
}

export function trackSupportStepCompleted(
  type: string,
  step: number | string
): void {
  trackSupportEvent("support_step_completed", { type, step });
}

export function trackSupportSubmitted(
  type: string,
  impact: string,
  planTier?: string
): void {
  trackSupportEvent("support_submitted", { type, impact, planTier });
}

export function trackSupportCoachUpsellShown(): void {
  trackSupportEvent("support_coach_upsell_shown");
}

export function trackSupportCoachUpsellClicked(): void {
  trackSupportEvent("support_coach_upsell_clicked");
}
