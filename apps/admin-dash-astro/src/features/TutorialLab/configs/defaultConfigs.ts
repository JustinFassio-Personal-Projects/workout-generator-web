/**
 * In-memory tutorial configs keyed by exercise slug/name (Phase 1; no DB).
 * Squat config mirrors the standalone flow: Setup → Descent → Depth check → Pain check → Complete.
 */

import type { ExerciseConfig } from '../types/tutorial';
import { POSE_LANDMARKS } from '../utils/constants';

const { LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE } =
  POSE_LANDMARKS;

export const DEFAULT_SQUAT_CONFIG: ExerciseConfig = {
  id: 'squat',
  name: 'Squat',
  description: 'Bodyweight squat with depth and form check.',
  phases: [
    {
      id: 'setup',
      name: 'Setup',
      instructionText:
        'Stand in view of the camera with your full body visible. Position yourself so we can see your hips, knees, and ankles.',
      targetJoints: [LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE],
      successCriteria: [],
      cameraOrientation: 'side',
    },
    {
      id: 'descent',
      name: 'Descent',
      instructionText: 'Slowly lower into a squat. We will check your depth on the next step.',
      targetJoints: [LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE],
      successCriteria: [],
      cameraOrientation: 'side',
    },
    {
      id: 'depth_check',
      name: 'Depth Check',
      instructionText:
        'Hold the bottom of your squat. We need to see your knee angle at or below 90° (hip crease at or below knee).',
      targetJoints: [LEFT_KNEE, RIGHT_KNEE, LEFT_HIP, RIGHT_HIP, LEFT_ANKLE, RIGHT_ANKLE],
      successCriteria: [
        {
          jointA: LEFT_HIP,
          jointB: LEFT_KNEE,
          jointC: LEFT_ANKLE,
          targetAngle: 90,
          operator: '<',
        },
        {
          jointA: RIGHT_HIP,
          jointB: RIGHT_KNEE,
          jointC: RIGHT_ANKLE,
          targetAngle: 90,
          operator: '<',
        },
      ],
      cameraOrientation: 'side',
    },
    {
      id: 'pain_check',
      name: 'Pain Check',
      instructionText: 'If you feel any pain, stop. Otherwise, stand back up to complete the tutorial.',
      targetJoints: [LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE],
      successCriteria: [],
      cameraOrientation: 'side',
    },
    {
      id: 'complete',
      name: 'Complete',
      instructionText: 'Great job! You have completed the squat tutorial.',
      targetJoints: [],
      successCriteria: [],
      cameraOrientation: 'front',
    },
  ],
};

const configByKey: Record<string, ExerciseConfig> = {
  squat: DEFAULT_SQUAT_CONFIG,
  'bodyweight-squat': DEFAULT_SQUAT_CONFIG,
  'Bodyweight Squat': DEFAULT_SQUAT_CONFIG,
};

/**
 * Resolve config by exercise slug or name. Prefer slug; fallback to name.
 */
export function getConfigForExercise(slugOrName: string): ExerciseConfig | null {
  const key = slugOrName.trim().toLowerCase().replace(/\s+/g, '-');
  return configByKey[key] ?? configByKey[slugOrName.trim()] ?? null;
}

/**
 * All configs (for dropdown or listing).
 */
export function getDefaultConfigs(): ExerciseConfig[] {
  return [DEFAULT_SQUAT_CONFIG];
}
