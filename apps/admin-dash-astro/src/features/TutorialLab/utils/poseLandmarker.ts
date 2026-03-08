/**
 * MediaPipe Pose Landmarker: load model and run detection on video frames.
 * Uses VIDEO running mode; call detectForVideo with performance.now() for timestamps.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let landmarkerInstance: PoseLandmarker | null = null;

export type LandmarkPoint = { x: number; y: number; z?: number };

/**
 * Create and cache the PoseLandmarker instance (VIDEO mode).
 * Safe to call multiple times; returns the same instance after first load.
 */
export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  landmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_PATH },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  return landmarkerInstance;
}

/**
 * Run pose detection on a video frame. Use performance.now() for timestamp.
 * Returns normalized landmarks for the first pose, or null if none detected.
 */
export function detectLandmarks(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): LandmarkPoint[] | null {
  if (video.readyState < 2) return null;
  const result: PoseLandmarkerResult = landmarker.detectForVideo(
    video,
    timestampMs
  );
  const poses = result.landmarks;
  if (!poses?.length) return null;
  const normalized = poses[0] as NormalizedLandmark[];
  return normalized.map((p) => ({ x: p.x, y: p.y, z: p.z }));
}
