import { Landmark } from '../types';

export const calculateAngle = (a: Landmark, b: Landmark, c: Landmark): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
};

export const calculateDistance = (a: Landmark, b: Landmark): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

export const normalizeLandmark = (landmark: Landmark, width: number, height: number) => {
  return {
    ...landmark,
    x: landmark.x * width,
    y: landmark.y * height,
  };
};

// Simple EMA smoothing
export const smoothValue = (current: number, previous: number, alpha: number = 0.5): number => {
  return alpha * current + (1 - alpha) * previous;
};
