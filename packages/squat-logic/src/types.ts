export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface RepData {
  id: number;
  timestamp: number;
  duration: number; // seconds
  depth: number; // relative measurement
  rom: number; // range of motion
  velocity: number; // average velocity
  isValid: boolean;
  notes: string[];
}

export interface WorkoutSession {
  id: string;
  type: 'SQUAT' | 'BENCH_PRESS' | 'DEADLIFT';
  startTime: number;
  endTime?: number;
  reps: RepData[];
  overallScore?: number;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT',
  BLUEPRINT = 'BLUEPRINT',
  SQUAT_EVALUATION = 'SQUAT_EVALUATION',
  SQUAT_TEST = 'SQUAT_TEST',
  SQUAT_PROGRAM = 'SQUAT_PROGRAM',
  SQUAT_TUTORIAL = 'SQUAT_TUTORIAL'
}

export enum LiftPhase {
  SETUP = 'SETUP',
  DESCENDING = 'DESCENDING', // Eccentric
  BOTTOM = 'BOTTOM', // Isometric/Turnaround
  ASCENDING = 'ASCENDING', // Concentric
  COMPLETED = 'COMPLETED'
}

export interface BiomechFeedback {
  type: 'correction' | 'praise';
  message: string;
  timestamp: number;
}

export interface AnalysisResult {
  executiveSummary: string; // HTML
  scores: {
    eccentricControl: number;
    concentricExplosiveness: number;
    depthConsistency: number;
    stability: number;
  };
  detailedAnalysis: string; // HTML
  prescribedCues: string[];
}
