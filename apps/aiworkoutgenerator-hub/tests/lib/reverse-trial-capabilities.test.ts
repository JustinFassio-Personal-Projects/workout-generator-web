import { describe, expect, it } from "vitest";

import {
  reverseTrialHardBlocks,
  toUserCapabilitiesPayload,
  type ReverseTrialCapabilities,
} from "@/lib/reverse-trial/capabilities";

describe("reverseTrialHardBlocks", () => {
  it("does not block when enforcement is off", () => {
    expect(
      reverseTrialHardBlocks("reverse_trial_expired", false)
    ).toEqual({
      blocksAi: false,
      blocksProAnalytics: false,
    });
    expect(reverseTrialHardBlocks("churned", false)).toEqual({
      blocksAi: false,
      blocksProAnalytics: false,
    });
  });

  it("blocks AI and analytics for expired and churned when enforcement on", () => {
    expect(
      reverseTrialHardBlocks("reverse_trial_expired", true)
    ).toEqual({
      blocksAi: true,
      blocksProAnalytics: true,
    });
    expect(reverseTrialHardBlocks("churned", true)).toEqual({
      blocksAi: true,
      blocksProAnalytics: true,
    });
  });

  it("does not block active trial states", () => {
    for (const gs of ["reverse_trial_active", "reverse_trial_expiring"] as const) {
      expect(reverseTrialHardBlocks(gs, true)).toEqual({
        blocksAi: false,
        blocksProAnalytics: false,
      });
    }
  });

  it("does not block premium subscriber", () => {
    expect(
      reverseTrialHardBlocks("premium_subscriber", true)
    ).toEqual({
      blocksAi: false,
      blocksProAnalytics: false,
    });
  });

  it("does not block null growth state", () => {
    expect(reverseTrialHardBlocks(null, true)).toEqual({
      blocksAi: false,
      blocksProAnalytics: false,
    });
  });
});

function cap(partial: Partial<ReverseTrialCapabilities>): ReverseTrialCapabilities {
  return {
    enforcementEnabled: false,
    growthState: null,
    trialDay: null,
    blocksAi: false,
    blocksProAnalytics: false,
    ...partial,
  };
}

describe("toUserCapabilitiesPayload", () => {
  it("sets can_use_ai and ended_reason for expired trial with enforcement", () => {
    expect(
      toUserCapabilitiesPayload(
        cap({
          enforcementEnabled: true,
          growthState: "reverse_trial_expired",
          blocksAi: true,
          blocksProAnalytics: true,
        })
      )
    ).toMatchObject({
      can_use_ai: false,
      can_access_pro_analytics: false,
      ended_reason: "reverse_trial_expired",
      show_reverse_trial_ended_banner: true,
      trial_day: null,
    });
  });

  it("sets ended_reason churned when enforcement on", () => {
    expect(
      toUserCapabilitiesPayload(
        cap({
          enforcementEnabled: true,
          growthState: "churned",
          blocksAi: true,
          blocksProAnalytics: true,
        })
      )
    ).toMatchObject({
      ended_reason: "churned",
      can_use_ai: false,
    });
  });

  it("clears ended_reason when enforcement off even if growth_state is expired", () => {
    expect(
      toUserCapabilitiesPayload(
        cap({
          enforcementEnabled: false,
          growthState: "reverse_trial_expired",
          blocksAi: false,
          blocksProAnalytics: false,
        })
      )
    ).toMatchObject({
      ended_reason: null,
      can_use_ai: true,
      show_reverse_trial_ended_banner: false,
    });
  });

  it("allows AI for active reverse trial with enforcement", () => {
    expect(
      toUserCapabilitiesPayload(
        cap({
          enforcementEnabled: true,
          growthState: "reverse_trial_active",
          blocksAi: false,
          blocksProAnalytics: false,
        })
      )
    ).toMatchObject({
      can_use_ai: true,
      ended_reason: null,
    });
  });
});
