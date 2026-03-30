import type { GrowthState } from "@workout-generator/growth-state";
import {
  calendarTrialDayNumberSinceSignupUtc,
  deriveGrowthStateFromHubUser,
} from "@workout-generator/growth-state";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";

import { isReverseTrialEnforcementEnabled } from "./enforcement-flag";
import type { ReverseTrialEndedReason } from "./user-capabilities-types";
import {
  firestoreTimeToIsoString,
  normalizeTierField,
  pickTrialEndsAtIso,
} from "./hub-user-fields";

export type ReverseTrialCapabilityCode =
  | "reverse_trial_ai_blocked"
  | "reverse_trial_analytics_blocked";

export type ReverseTrialCapabilities = {
  enforcementEnabled: boolean;
  growthState: GrowthState | null;
  /** Calendar day since signup (UTC), aligned with growth_state derivation; null if unknown. */
  trialDay: number | null;
  /** When enforcement is on and user is expired/churned — block new AI (workouts + AI ops + generative images). */
  blocksAi: boolean;
  /** When enforcement is on and user is expired/churned — block Pro workout summary analytics. */
  blocksProAnalytics: boolean;
};

/** Pure helper for unit tests and server logic: hard blocks after calendar trial / churn. */
export function reverseTrialHardBlocks(
  growthState: GrowthState | null,
  enforcementEnabled: boolean
): { blocksAi: boolean; blocksProAnalytics: boolean } {
  if (!enforcementEnabled) {
    return { blocksAi: false, blocksProAnalytics: false };
  }
  const blocked =
    growthState === "reverse_trial_expired" || growthState === "churned";
  return { blocksAi: blocked, blocksProAnalytics: blocked };
}

/**
 * Load `users/{uid}` and derive growth state (same rules as admin Growth Engine Firestore pipeline).
 */
export async function loadReverseTrialCapabilities(
  uid: string,
  nowMs: number = Date.now()
): Promise<ReverseTrialCapabilities> {
  const enforcementEnabled = isReverseTrialEnforcementEnabled();
  const snap = await adminDb.collection("users").doc(uid).get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;

  const createdAtIso = firestoreTimeToIsoString(data.created_at) ?? undefined;
  const growthState = deriveGrowthStateFromHubUser(
    {
      subscriptionTier: normalizeTierField(data.subscription_tier),
      subscriptionStatus: normalizeTierField(data.subscription_status),
      trialEndsAt: pickTrialEndsAtIso(data) ?? undefined,
      createdAt: createdAtIso,
    },
    nowMs
  );

  const trialDay = calendarTrialDayNumberSinceSignupUtc(
    createdAtIso ?? null,
    nowMs
  );

  const { blocksAi, blocksProAnalytics } = reverseTrialHardBlocks(
    growthState,
    enforcementEnabled
  );

  return {
    enforcementEnabled,
    growthState,
    trialDay,
    blocksAi,
    blocksProAnalytics,
  };
}

export function reverseTrialAiBlockedResponse(
  cap: ReverseTrialCapabilities
): NextResponse {
  return NextResponse.json(
    {
      error:
        "Your trial period has ended. Upgrade to continue using AI features.",
      code: "reverse_trial_ai_blocked" satisfies ReverseTrialCapabilityCode,
      growth_state: cap.growthState,
    },
    { status: 403 }
  );
}

export function reverseTrialAnalyticsBlockedResponse(
  cap: ReverseTrialCapabilities
): NextResponse {
  return NextResponse.json(
    {
      error:
        "Workout analytics are available on Pro. Upgrade to restore access.",
      code: "reverse_trial_analytics_blocked" satisfies ReverseTrialCapabilityCode,
      growth_state: cap.growthState,
    },
    { status: 403 }
  );
}

/**
 * Returns a 403 JSON response when AI must be blocked; otherwise `null`.
 */
export async function assertReverseTrialAllowsAi(
  uid: string
): Promise<NextResponse | null> {
  const cap = await loadReverseTrialCapabilities(uid);
  if (!cap.blocksAi) return null;
  return reverseTrialAiBlockedResponse(cap);
}

/**
 * Returns a 403 JSON response when Pro analytics must be blocked; otherwise `null`.
 */
export async function assertReverseTrialAllowsProAnalytics(
  uid: string
): Promise<NextResponse | null> {
  const cap = await loadReverseTrialCapabilities(uid);
  if (!cap.blocksProAnalytics) return null;
  return reverseTrialAnalyticsBlockedResponse(cap);
}

export type { ReverseTrialEndedReason } from "./user-capabilities-types";

export type UserCapabilitiesPayload = {
  enforcement_enabled: boolean;
  growth_state: GrowthState | null;
  /** Calendar day since signup (UTC); null if `created_at` missing. */
  trial_day: number | null;
  show_reverse_trial_expiring_banner: boolean;
  show_reverse_trial_ended_banner: boolean;
  can_access_pro_analytics: boolean;
  /** False when enforcement blocks new AI (expired trial or churned). */
  can_use_ai: boolean;
  ended_reason: ReverseTrialEndedReason;
};

/**
 * Maps loaded capabilities to the API payload (pure — used by tests without Firestore).
 */
export function toUserCapabilitiesPayload(
  cap: ReverseTrialCapabilities
): UserCapabilitiesPayload {
  const gs = cap.growthState;
  const endedLike = gs === "reverse_trial_expired" || gs === "churned";
  let ended_reason: ReverseTrialEndedReason = null;
  if (cap.enforcementEnabled) {
    if (gs === "churned") ended_reason = "churned";
    else if (gs === "reverse_trial_expired")
      ended_reason = "reverse_trial_expired";
  }

  return {
    enforcement_enabled: cap.enforcementEnabled,
    growth_state: gs,
    trial_day: cap.trialDay,
    show_reverse_trial_expiring_banner:
      cap.enforcementEnabled && gs === "reverse_trial_expiring",
    show_reverse_trial_ended_banner: cap.enforcementEnabled && endedLike,
    can_access_pro_analytics: !cap.blocksProAnalytics,
    can_use_ai: !cap.blocksAi,
    ended_reason,
  };
}

export async function getUserCapabilitiesPayload(
  uid: string,
  nowMs: number = Date.now()
): Promise<UserCapabilitiesPayload> {
  const cap = await loadReverseTrialCapabilities(uid, nowMs);
  return toUserCapabilitiesPayload(cap);
}
