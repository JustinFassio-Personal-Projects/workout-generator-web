/**
 * Types for the generated_exercises collection (Supabase).
 * Stores complete exercise data including parsed biomechanics for detail pages.
 */

import type { TimestampLike } from './timestamp';

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

export interface GeneratedExercise {
  id: string;
  slug: string;
  exerciseName: string;
  imageUrl: string;
  storagePath: string;
  kineticChainType: string;
  biomechanics: ParsedBiomechanics;
  imagePrompt: string;
  complexityLevel: string;
  visualStyle: string;
  sources: ExerciseSource[];
  status: GeneratedExerciseStatus;
  generatedBy: string;
  generatedAt: TimestampLike;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  rejectedAt?: TimestampLike;
  rejectedBy?: string;
  rejectionReason?: string;
  deepDiveHtmlContent?: string;
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
