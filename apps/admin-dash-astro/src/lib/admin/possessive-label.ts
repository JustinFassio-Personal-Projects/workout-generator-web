/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * English possessive for short UI titles (e.g. journey explorer timeline heading).
 */

/** Names ending in "s" (any case) use trailing apostrophe only; others get "'s". */
export function possessiveEnglish(name: string): string {
  const t = name.trim();
  if (!t) return '';
  return /s$/i.test(t) ? `${t}'` : `${t}'s`;
}

export function timelineHeadingWithPossessive(displayName: string | null | undefined): string {
  const t = displayName?.trim();
  if (!t) return 'Timeline';
  return `${possessiveEnglish(t)} Timeline`;
}
