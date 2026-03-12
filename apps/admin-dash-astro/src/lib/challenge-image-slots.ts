/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared constants for challenge image slots. Hero + sections 1–5.
 */

/** Valid challenge image slot values. */
export const CHALLENGE_IMAGE_SLOTS = ['hero', '1', '2', '3', '4', '5'] as const;

export type ChallengeImageSlot = (typeof CHALLENGE_IMAGE_SLOTS)[number];

/** Slots with labels for UI. */
export const CHALLENGE_IMAGE_SLOTS_WITH_LABELS = [
  { value: 'hero' as const, label: 'Hero' },
  { value: '1' as const, label: 'Section 1' },
  { value: '2' as const, label: 'Section 2' },
  { value: '3' as const, label: 'Section 3' },
  { value: '4' as const, label: 'Section 4' },
  { value: '5' as const, label: 'Section 5' },
] as const;
