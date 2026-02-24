import { BiomechFeedback } from './types';

export const APP_NAME = "KineticAI";

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

export const SQUAT_DEPTH_THRESHOLD = 0.1; // Normalized coordinate difference

export const MOCK_FEEDBACK: BiomechFeedback[] = [
  { type: 'correction', message: 'Drive knees out', timestamp: Date.now() },
  { type: 'correction', message: 'Chest up', timestamp: Date.now() },
];

export const ROADMAP_STEPS = [
  {
    title: "Phase 1: Computer Vision Core",
    description: "Implement MediaPipe Pose Landmarker for 30fps real-time skeletal tracking. Establish coordinate normalization to handle different user heights and camera distances."
  },
  {
    title: "Phase 2: The Biomechanical Engine",
    description: "Develop the state machine for Temporal Analysis (Eccentric/Concentric detection). Implement joint angle calculation (e.g., Hip Flexion = vector(Hip, Knee) vs vector(Hip, Shoulder))."
  },
  {
    title: "Phase 3: Real-Time Feedback Loop",
    description: "Integrate Text-to-Speech API for sub-200ms audio corrections. Build the 'Quality Filter' to discard reps that don't meet IPF depth standards."
  },
  {
    title: "Phase 4: Gemini Context Integration",
    description: "Connect the 'Gold Standard' feature. Upload set kinematics to Gemini-1.5-Pro to compare against elite athlete templates and generate the 'PhD Audit'."
  },
  {
    title: "Phase 5: Predictive Analytics",
    description: "Use historical velocity loss data to predict 1RM and suggest autoregulated load adjustments for the next session."
  }
];

export const CRITICAL_LANDMARKS = {
  SQUAT: [
    "Hip (23, 24): To track depth relative to knees.",
    "Knee (25, 26): To detect valgus/varus collapse.",
    "Ankle (27, 28): To measure shin angle and mobility.",
    "Shoulder (11, 12): To monitor torso inclination and bar path."
  ],
  BENCH: [
    "Wrist (15, 16): To ensure stacked joints under the bar.",
    "Elbow (13, 14): To track flare angle relative to torso.",
    "Shoulder (11, 12): To detect scapular retraction loss."
  ]
};
