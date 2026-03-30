/**
 * When enabled, Hub API routes enforce reverse-trial calendar expiry (block AI / Pro analytics
 * for `reverse_trial_expired` and `churned`) in addition to existing tier limits.
 */
export function isReverseTrialEnforcementEnabled(): boolean {
  const raw = (process.env.REVERSE_TRIAL_ENFORCEMENT ?? "")
    .trim()
    .toLowerCase();
  return raw === "true" || raw === "1";
}
