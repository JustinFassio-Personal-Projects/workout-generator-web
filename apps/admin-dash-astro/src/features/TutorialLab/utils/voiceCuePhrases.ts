/**
 * Angle-to-phrase mapping for wrong-pose voice cues.
 * Maps joint index + operator + current vs target to a short TTS phrase.
 */

import type { SuccessCriterion } from '../types/tutorial';
import { LANDMARK_INDEX_TO_LABEL } from './constants';

const KNEE_JOINTS = [25, 26];
const HIP_JOINTS = [23, 24];
const ELBOW_JOINTS = [13, 14];
const ANKLE_JOINTS = [27, 28];

function jointCategory(jointB: number): 'knee' | 'hip' | 'elbow' | 'ankle' | 'other' {
  if (KNEE_JOINTS.includes(jointB)) return 'knee';
  if (HIP_JOINTS.includes(jointB)) return 'hip';
  if (ELBOW_JOINTS.includes(jointB)) return 'elbow';
  if (ANKLE_JOINTS.includes(jointB)) return 'ankle';
  return 'other';
}

/**
 * Generate a short voice cue when the user's pose is wrong.
 * Picks the worst-off criterion (largest deviation from target).
 */
export function getWrongPoseCue(
  angles: { angle: number; targetAngle: number; operator: string }[],
  criteria: SuccessCriterion[]
): string | null {
  if (!angles.length || !criteria.length) return null;

  let worstIdx = -1;
  let worstDev = 0;

  for (let i = 0; i < angles.length; i++) {
    const { angle, targetAngle, operator } = angles[i];
    if (Number.isNaN(angle)) continue;
    let dev = 0;
    if (operator === '<') {
      if (angle >= targetAngle) dev = angle - targetAngle;
    } else if (operator === '>') {
      if (angle <= targetAngle) dev = targetAngle - angle;
    } else if (operator === '==') {
      dev = Math.abs(angle - targetAngle);
    }
    if (dev > worstDev) {
      worstDev = dev;
      worstIdx = i;
    }
  }

  if (worstIdx < 0 || worstDev < 5) return null;

  const c = criteria[worstIdx];
  const { angle, targetAngle, operator } = angles[worstIdx];
  const jointName = (LANDMARK_INDEX_TO_LABEL[c.jointB] ?? '').toLowerCase();
  const side = jointName.includes('left') ? 'left' : jointName.includes('right') ? 'right' : '';
  const cat = jointCategory(c.jointB);

  if (operator === '<') {
    if (angle > targetAngle) {
      const phrases: Record<string, string> = {
        knee: side ? `${side.charAt(0).toUpperCase() + side.slice(1)} knee: bend more` : 'Bend your knees more',
        hip: side ? `Sink your ${side} hip lower` : 'Sink your hips lower',
        elbow: side ? `Bend your ${side} elbow more` : 'Bend your elbows more',
        ankle: 'Drop your heels or adjust ankle angle',
        other: `Adjust your ${jointName}`,
      };
      return phrases[cat];
    }
  } else if (operator === '>') {
    if (angle < targetAngle) {
      const phrases: Record<string, string> = {
        knee: side ? `Straighten your ${side} knee slightly` : 'Straighten your knees slightly',
        hip: side ? `Open your ${side} hip more` : 'Open your hips more',
        elbow: side ? `Straighten your ${side} elbow more` : 'Straighten your elbows more',
        ankle: 'Adjust your ankle angle',
        other: `Adjust your ${jointName}`,
      };
      return phrases[cat];
    }
  } else if (operator === '==') {
    if (Math.abs(angle - targetAngle) > 10) {
      const phrases: Record<string, string> = {
        knee: 'Adjust your knee angle',
        hip: 'Adjust your hip position',
        elbow: 'Adjust your elbow angle',
        ankle: 'Adjust your ankle',
        other: `Adjust your ${jointName}`,
      };
      return phrases[cat];
    }
  }

  return null;
}

/**
 * Truncate instruction text for TTS (avoid long reads).
 */
export function truncateForTTS(text: string, maxChars = 100): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const firstSentence = trimmed.match(/^[^.!?]+[.!?]/)?.[0] ?? trimmed.slice(0, maxChars);
  return firstSentence.length <= maxChars ? firstSentence : firstSentence.slice(0, maxChars - 3) + '…';
}
