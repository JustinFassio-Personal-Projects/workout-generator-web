/**
 * PostHog multivariate flag for Phase 5 urgency copy experiments (days 4–6, reverse_trial_expiring).
 * Create flag `reverse_trial_urgency_copy` in PostHog; variants are arbitrary strings (e.g. control, urgent_a).
 */

export const REVERSE_TRIAL_URGENCY_COPY_FLAG_KEY = "reverse_trial_urgency_copy";

type PostHogFlagClient = { getFeatureFlag: (key: string) => unknown };

export function resolveReverseTrialUrgencyCopyVariant(
  ph: PostHogFlagClient | undefined
): string | undefined {
  if (!ph) return undefined;
  const v = ph.getFeatureFlag(REVERSE_TRIAL_URGENCY_COPY_FLAG_KEY);
  if (typeof v === "string" && v.length > 0) return v;
  if (v === true) return "on";
  if (v === false) return "off";
  return undefined;
}

export function shouldAttachUrgencyCopyVariant(cap: {
  growth_state?: string | null;
  trial_day?: number | null;
}): boolean {
  return (
    cap.growth_state === "reverse_trial_expiring" &&
    cap.trial_day != null &&
    cap.trial_day >= 4 &&
    cap.trial_day <= 6
  );
}
