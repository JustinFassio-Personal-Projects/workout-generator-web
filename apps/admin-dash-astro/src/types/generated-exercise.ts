/**
 * Types for the generated_exercises collection (Supabase).
 * Stores complete exercise data including parsed biomechanics for detail pages.
 */

import type { TimestampLike } from './timestamp';
import type { ExerciseConfig } from '@/features/TutorialLab/types/tutorial';

/**
 * Source reference with search verification pattern.
 */
export interface ExerciseSource {
  title: string;
  domain: string;
  searchQuery: string;
}

/**
 * Parsed biomechanics data structure.
 */
export interface ParsedBiomechanics {
  biomechanicalChain: string;
  pivotPoints: string;
  stabilizationNeeds: string;
  commonMistakes: string[];
  performanceCues: string[];
}

export type GeneratedExerciseStatus = 'pending' | 'approved' | 'rejected';

export type SuitableBlock = 'warmup' | 'main' | 'finisher' | 'core' | 'cooldown';

export type MainWorkoutType = 'strength' | 'cardio' | 'hiit';

export type ExerciseImageRole =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghosted'
  | 'illustration'
  | 'multiplicity'
  | 'sequenceStart'
  | 'sequenceMid'
  | 'sequenceEnd';

export interface ExerciseImage {
  id: string;
  exerciseId: string;
  role: ExerciseImageRole;
  imageUrl: string;
  storagePath: string;
  imagePrompt?: string;
  visualStyle?: string;
  createdAt: TimestampLike;
  createdBy: string;
  position?: number;
  anatomicalSection?: 'chain' | 'pivot' | 'stabilization';
  hidden?: boolean;
}

export interface ExerciseVideo {
  videoUrl: string;
  videoStoragePath: string;
  label?: string;
  hidden?: boolean;
  position?: number;
}

export type CreateExerciseImageInput = Omit<ExerciseImage, 'id' | 'createdAt'> & {
  createdAt?: TimestampLike;
};

/** Role of a muscle in the exercise (for Muscle Engagement Visualization). */
export type MuscleRole = 'primary' | 'secondary' | 'stabilizer';

/** Single muscle entry in the engagement map. */
export interface MuscleEngagementItem {
  id: string;
  role: MuscleRole;
}

/** Structured muscle engagement for Deep Dive diagram. */
export interface MuscleEngagementMap {
  view: 'anterior' | 'posterior' | 'both';
  muscles: MuscleEngagementItem[];
}

/**
 * Full generated exercise document structure.
 * Used for the Exercise Details page with the "Iceberg Method" layout.
 */
export interface GeneratedExercise {
  id: string;
  /** URL-safe slug (e.g., "sandbag-reverse-lunge") */
  slug: string;
  /** Display name of the exercise */
  exerciseName: string;
  /** Firebase Storage download URL */
  imageUrl: string;
  /** Firebase Storage path */
  storagePath: string;
  /** Kinetic chain classification (e.g., "CLOSED-KINETIC CHAIN") */
  kineticChainType: string;
  /** Parsed biomechanical analysis */
  biomechanics: ParsedBiomechanics;
  /** Original image prompt used for generation */
  imagePrompt: string;
  /** Complexity level (beginner, intermediate, advanced) */
  complexityLevel: string;
  /** Visual style (photorealistic, illustration, etc.) */
  visualStyle: string;
  /** Verified source references */
  sources: ExerciseSource[];
  /** Approval status */
  status: GeneratedExerciseStatus;
  /** UID of the user who generated this exercise */
  generatedBy: string;
  /** When the exercise was generated */
  generatedAt: TimestampLike;
  /** Document creation timestamp */
  createdAt: TimestampLike;
  /** Last update timestamp */
  updatedAt: TimestampLike;
  /** When the exercise was rejected (if applicable) */
  rejectedAt?: TimestampLike;
  /** UID of the admin who rejected (if applicable) */
  rejectedBy?: string;
  /** Reason for rejection (if applicable) */
  rejectionReason?: string;
  deepDiveHtmlContent?: string;
  /** Structured muscle engagement for the Deep Dive diagram (view + muscle IDs and roles). */
  muscleEngagementMap?: MuscleEngagementMap;
  /** URL of AI-generated anatomical muscle diagram image (Supabase storage). */
  muscleDiagramImageUrl?: string;
  /** AI-generated plain-language instructions for the public page (markdown). */
  userFriendlyInstructions?: string;
  /** Tutorial Lab: phases and success criteria for camera-based tutorial (stored per exercise). */
  tutorialConfig?: ExerciseConfig;
  suitableBlocks?: SuitableBlock[];
  mainWorkoutType?: MainWorkoutType;
  videoUrl?: string;
  videoStoragePath?: string;
  videos?: ExerciseVideo[];
}

export type CreateGeneratedExerciseInput = Omit<
  GeneratedExercise,
  'id' | 'createdAt' | 'updatedAt'
> & {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};
