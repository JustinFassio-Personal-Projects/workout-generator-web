import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { UserCapabilitiesResponse } from "@/lib/reverse-trial/user-capabilities-types";
import {
  buildReverseTrialFunnelProperties,
  getOrCreateReverseTrialFunnelSessionId,
  trackFeatureLockClick,
  trackTrialExpiredViewedOnce,
} from "@/lib/reverse-trial-funnel-analytics";
import * as posthogModule from "@/lib/posthog";

function cap(
  partial: Partial<UserCapabilitiesResponse>
): UserCapabilitiesResponse {
  return {
    enforcement_enabled: false,
    growth_state: null,
    trial_day: null,
    show_reverse_trial_expiring_banner: false,
    show_reverse_trial_ended_banner: false,
    can_access_pro_analytics: true,
    can_use_ai: true,
    ended_reason: null,
    ...partial,
  };
}

describe("reverse-trial-funnel-analytics", () => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    sessionStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_MARKETING_SITE_URL", "https://marketing.example");
    vi.stubGlobal("location", {
      ...window.location,
      hostname: "hub.test",
      href: "https://hub.test/",
    } as Location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("buildReverseTrialFunnelProperties merges surface and capability fields", () => {
    expect(
      buildReverseTrialFunnelProperties("generate_page", {
        firebaseUid: "fb1",
        capabilities: cap({
          growth_state: "reverse_trial_expired",
          trial_day: 8,
          ended_reason: "reverse_trial_expired",
        }),
      })
    ).toEqual({
      surface: "generate_page",
      firebase_uid: "fb1",
      growth_state: "reverse_trial_expired",
      trial_day: 8,
      ended_reason: "reverse_trial_expired",
    });
  });

  it("buildReverseTrialFunnelProperties adds urgency_copy_variant in days 4–6 expiring window from PostHog", () => {
    vi.spyOn(posthogModule, "getPostHog").mockReturnValue({
      getFeatureFlag: () => "urgent_a",
    } as unknown as NonNullable<ReturnType<typeof posthogModule.getPostHog>>);
    expect(
      buildReverseTrialFunnelProperties("banner", {
        firebaseUid: "fb1",
        capabilities: cap({
          enforcement_enabled: true,
          growth_state: "reverse_trial_expiring",
          trial_day: 5,
        }),
      })
    ).toMatchObject({
      surface: "banner",
      urgency_copy_variant: "urgent_a",
    });
  });

  it("getOrCreateReverseTrialFunnelSessionId is stable per sessionStorage", () => {
    const a = getOrCreateReverseTrialFunnelSessionId();
    const b = getOrCreateReverseTrialFunnelSessionId();
    expect(a).toBe(b);
    expect(a.startsWith("rt_")).toBe(true);
  });

  it("trackFeatureLockClick does not fetch when enforcement is off", () => {
    trackFeatureLockClick("generate_page", {
      firebaseUid: "u",
      capabilities: cap({ enforcement_enabled: false, can_use_ai: false }),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trackFeatureLockClick POSTs to marketing track-event when enforcement on", () => {
    trackFeatureLockClick("summaries_analytics", {
      firebaseUid: "uid9",
      capabilities: cap({
        enforcement_enabled: true,
        can_use_ai: false,
        growth_state: "churned",
        ended_reason: "churned",
      }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const row = fetchMock.mock.calls.at(0) as [string, RequestInit] | undefined;
    expect(row).toBeDefined();
    const [url, init] = row!;
    expect(url).toBe("https://marketing.example/api/analytics/track-event");
    const body = JSON.parse(init.body as string);
    expect(body.event_name).toBe("feature_lock_click");
    expect(body.user_id).toBeNull();
    expect(body.app_id).toBe("hub");
    expect(body.properties.surface).toBe("summaries_analytics");
    expect(body.properties.firebase_uid).toBe("uid9");
    expect(body.properties.growth_state).toBe("churned");
  });

  it("trackTrialExpiredViewedOnce sends once per surface per tab", () => {
    const opts = {
      firebaseUid: "u1",
      capabilities: cap({
        enforcement_enabled: true,
        growth_state: "reverse_trial_expired",
        ended_reason: "reverse_trial_expired",
      }),
    };
    trackTrialExpiredViewedOnce("pricing_pivot_strip", opts);
    trackTrialExpiredViewedOnce("pricing_pivot_strip", opts);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const row = fetchMock.mock.calls.at(0) as [string, RequestInit] | undefined;
    expect(row?.[1]).toBeDefined();
    const body = JSON.parse((row![1] as RequestInit).body as string);
    expect(body.event_name).toBe("trial_expired_viewed");
    expect(body.properties.surface).toBe("pricing_pivot_strip");
  });
});
