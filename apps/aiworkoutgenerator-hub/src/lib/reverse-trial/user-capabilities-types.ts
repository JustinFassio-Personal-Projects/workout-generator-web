/**
 * Client-safe shapes for `GET /api/users/capabilities`.
 * Keep aligned with `toUserCapabilitiesPayload` in `./capabilities` (server).
 */

export type ReverseTrialEndedReason =
  | "reverse_trial_expired"
  | "churned"
  | null;

export type UserCapabilitiesResponse = {
  enforcement_enabled: boolean;
  growth_state: string | null;
  trial_day: number | null;
  show_reverse_trial_expiring_banner: boolean;
  show_reverse_trial_ended_banner: boolean;
  can_access_pro_analytics: boolean;
  can_use_ai: boolean;
  ended_reason: ReverseTrialEndedReason;
};
