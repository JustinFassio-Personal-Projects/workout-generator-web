/**
 * Canvas overlay that draws pose skeleton and highlights target joints for the current phase.
 * Uses normalized coordinates (0–1); canvas size should match video display size.
 */

import React, { useRef, useEffect } from 'react';
import { POSE_CONNECTIONS } from '../utils/constants';
import type { LandmarkPoint } from '../utils/poseLandmarker';

export type FeedbackState = 'default' | 'wrong' | 'correct';

const FEEDBACK_COLORS: Record<FeedbackState, { stroke: string; targetFill: string; targetStroke: string }> = {
  default: {
    stroke: 'rgba(255, 191, 0, 0.6)',
    targetFill: '#ffbf00',
    targetStroke: '#ffbf00',
  },
  wrong: {
    stroke: 'rgba(239, 68, 68, 0.8)',
    targetFill: 'rgba(239, 68, 68, 0.9)',
    targetStroke: '#ef4444',
  },
  correct: {
    stroke: 'rgba(34, 197, 94, 0.8)',
    targetFill: 'rgba(34, 197, 94, 0.9)',
    targetStroke: '#22c55e',
  },
};

export interface JointOverlayProps {
  /** Normalized landmarks from MediaPipe (x, y in [0,1]) */
  landmarks: LandmarkPoint[] | null;
  /** Indices to highlight (e.g. current phase targetJoints) */
  targetJointIndices: number[];
  width: number;
  height: number;
  /** Visual feedback: default (amber), wrong (red), correct (green) */
  feedbackState?: FeedbackState;
  className?: string;
}

export default function JointOverlay({
  landmarks,
  targetJointIndices,
  width,
  height,
  feedbackState = 'default',
  className = '',
}: JointOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = FEEDBACK_COLORS[feedbackState];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks?.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const toX = (x: number) => x * width;
    const toY = (y: number) => y * height;

    const targetSet = new Set(targetJointIndices);

    // Draw segments
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    for (const [i, j] of POSE_CONNECTIONS) {
      const a = landmarks[i];
      const b = landmarks[j];
      if (a == null || b == null) continue;
      ctx.beginPath();
      ctx.moveTo(toX(a.x), toY(a.y));
      ctx.lineTo(toX(b.x), toY(b.y));
      ctx.stroke();
    }

    // Draw joints
    landmarks.forEach((p, idx) => {
      const isTarget = targetSet.has(idx);
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), isTarget ? 8 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isTarget ? colors.targetFill : 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
      if (isTarget) {
        ctx.strokeStyle = colors.targetStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [landmarks, targetJointIndices, width, height, feedbackState]);

  if (!width || !height) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute left-0 top-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
