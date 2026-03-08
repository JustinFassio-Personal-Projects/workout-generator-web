/**
 * Generic joint angle and success-criteria evaluation for Tutorial Lab.
 * Angle at vertex B formed by segments A-B and B-C (degrees 0–180).
 */

import type { SuccessCriterion } from '../types/tutorial';

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

/**
 * Compute angle at the middle point (jointB) between segments jointA–jointB and jointB–jointC.
 * Uses 2D normalized coordinates (x, y). Returns degrees in [0, 180].
 */
export function angleAtJoint(
  a: LandmarkPoint,
  b: LandmarkPoint,
  c: LandmarkPoint
): number {
  const radToDeg = (rad: number) => (rad * 180) / Math.PI;
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y) || 1e-6;
  const mag2 = Math.hypot(v2x, v2y) || 1e-6;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return radToDeg(Math.acos(cos));
}

/**
 * Evaluate a single criterion: get angle at jointB from landmarks and compare to target.
 */
function evaluateOne(
  landmarks: LandmarkPoint[],
  c: SuccessCriterion
): boolean {
  const pa = landmarks[c.jointA];
  const pb = landmarks[c.jointB];
  const pc = landmarks[c.jointC];
  if (pa == null || pb == null || pc == null) return false;
  const angle = angleAtJoint(pa, pb, pc);
  switch (c.operator) {
    case '<':
      return angle < c.targetAngle;
    case '>':
      return angle > c.targetAngle;
    case '==':
      return Math.abs(angle - c.targetAngle) < 5;
    default:
      return false;
  }
}

/**
 * Return true only when we have landmarks for all joints used in criteria.
 * Used to decide if the user is "attempting" (overlay can show red/green).
 */
export function canEvaluateCriteria(
  landmarks: LandmarkPoint[] | null,
  criteria: SuccessCriterion[]
): boolean {
  if (!landmarks?.length || !criteria.length) return false;
  return criteria.every((c) => {
    const pa = landmarks[c.jointA];
    const pb = landmarks[c.jointB];
    const pc = landmarks[c.jointC];
    return pa != null && pb != null && pc != null;
  });
}

/**
 * Return true only if all success criteria for the current phase are met.
 */
export function evaluateCriteria(
  landmarks: LandmarkPoint[] | null,
  criteria: SuccessCriterion[]
): boolean {
  if (!landmarks?.length || !criteria.length) return false;
  return criteria.every((c) => evaluateOne(landmarks, c));
}

/**
 * Format operator + targetAngle as user-facing text for "need X°".
 */
export function formatCriterionTarget(
  operator: string,
  targetAngle: number
): string {
  switch (operator) {
    case '<':
      return `less than ${targetAngle}°`;
    case '>':
      return `greater than ${targetAngle}°`;
    case '==':
      return `about ${targetAngle}°`;
    default:
      return `${operator} ${targetAngle}°`;
  }
}

/**
 * Compute angles for each criterion (for debug display). Returns array of { angle, criterion }.
 */
export function getAnglesForCriteria(
  landmarks: LandmarkPoint[] | null,
  criteria: SuccessCriterion[]
): { angle: number; targetAngle: number; operator: string }[] {
  if (!landmarks?.length || !criteria.length) return [];
  return criteria.map((c) => {
    const pa = landmarks[c.jointA];
    const pb = landmarks[c.jointB];
    const pc = landmarks[c.jointC];
    const angle =
      pa != null && pb != null && pc != null
        ? angleAtJoint(pa, pb, pc)
        : NaN;
    return {
      angle,
      targetAngle: c.targetAngle,
      operator: c.operator,
    };
  });
}
