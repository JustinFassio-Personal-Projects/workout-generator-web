/**
 * Re-export Firestore types to maintain single source of truth.
 * These types are defined in firestore.ts and re-exported here for convenience.
 */
export type { LiabilityWaiver, UserWaiverAgreement } from "./firestore";

/**
 * Checkbox state for waiver agreement form.
 */
export interface WaiverAgreementCheckboxes {
  medical_disclaimer: boolean;
  assumption_of_risk: boolean;
  release_of_liability: boolean;
  arbitration: boolean;
  ai_disclaimer: boolean;
  full_terms: boolean;
}

/**
 * Request payload for submitting waiver agreement.
 */
export interface WaiverAgreementRequest {
  full_name: string;
  agreement_checkboxes: WaiverAgreementCheckboxes;
  waiver_version: string; // Version the user is agreeing to (must match what they read)
  waiver_version_hash: string; // Hash of the waiver content for integrity validation
}

/**
 * Response from waiver agreement submission.
 */
export interface WaiverAgreementResponse {
  success: boolean;
  agreement_id?: string;
  waiver_version?: string;
  error?: string;
}
