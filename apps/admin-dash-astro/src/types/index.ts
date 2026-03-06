/**
 * Shared types for display (e.g. ExerciseDetailModal).
 * Program/schedule types live in ai-program.ts, ai-workout.ts.
 */

export interface Exercise {
  name: string;
  images: string[];
  instructions: string[];
  videoUrl?: string;
}

/** Extended biomechanics for ExerciseDetailModal; also used by approved-exercise-maps. */
export interface ExtendedBiomechanics {
  biomechanicalChain?: string;
  pivotPoints?: string;
  stabilizationNeeds?: string;
  commonMistakes?: string[];
}
