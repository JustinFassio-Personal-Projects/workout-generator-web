/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal export for Visualization Lab: normalizeExerciseName used by generated-exercises.
 */

/**
 * Normalizes an exercise name to a consistent lookup key (e.g. "Arm Circles" → "arm circles").
 */
export function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim();
}
