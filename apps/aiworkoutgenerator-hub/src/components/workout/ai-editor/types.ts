import type {
  TrainerWorkoutExercise,
  WorkoutSectionType,
} from "@/types/firestore";
import type {
  ExerciseAIEditHistory,
  ExerciseAIAddHistoryEntry,
} from "@/types/ai-exercise-editor";

/**
 * Props for the main AIExerciseEditor dialog component.
 */
export interface AIExerciseEditorProps {
  exercise: TrainerWorkoutExercise;
  sectionType: WorkoutSectionType;
  sectionIndex: number;
  exerciseIndex: number;
  workoutId: string;
  workout: {
    focus: string | null;
    difficulty: "beginner" | "intermediate" | "advanced";
    generation_context?: {
      profile_snapshot?: {
        fitness_level?: string;
        injuries?: string[];
        available_equipment?: string[];
      };
    };
    sections: Array<{
      exercises: Array<{ name: string }>;
    }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyEdit: (
    modifiedExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIEditHistory
  ) => Promise<void>;
  onApplyAdd?: (
    newExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIAddHistoryEntry,
    insertPosition: "before" | "after"
  ) => Promise<void>;
  onUpdateImageUrl?: (imageUrl: string) => Promise<void>;
  initialAction?: string;
}

/**
 * Props for EditModePanel component.
 */
export interface EditModePanelProps {
  exercise: TrainerWorkoutExercise;
  sectionType: WorkoutSectionType;
  workoutId: string;
  sectionIndex: number;
  exerciseIndex: number;
  workout: {
    focus: string | null;
    difficulty: "beginner" | "intermediate" | "advanced";
    generation_context?: {
      profile_snapshot?: {
        fitness_level?: string;
        injuries?: string[];
        available_equipment?: string[];
      };
    };
    sections: Array<{
      exercises: Array<{ name: string }>;
    }>;
  };
  onApply: (
    modifiedExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIEditHistory
  ) => Promise<void>;
  onUpdateImageUrl?: (imageUrl: string) => Promise<void>;
  initialAction?: string;
}

/**
 * Props for SwapModePanel component.
 */
export interface SwapModePanelProps {
  exercise: TrainerWorkoutExercise;
  sectionType: WorkoutSectionType;
  workoutId: string;
  sectionIndex: number;
  exerciseIndex: number;
  workout: {
    focus: string | null;
    difficulty: "beginner" | "intermediate" | "advanced";
    generation_context?: {
      profile_snapshot?: {
        fitness_level?: string;
        injuries?: string[];
        available_equipment?: string[];
      };
    };
    sections: Array<{
      exercises: Array<{ name: string }>;
    }>;
  };
  onApply: (
    modifiedExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIEditHistory
  ) => Promise<void>;
  onUpdateImageUrl?: (imageUrl: string) => Promise<void>;
}

/**
 * Props for AddModePanel component.
 */
export interface AddModePanelProps {
  exercise: TrainerWorkoutExercise;
  sectionType: WorkoutSectionType;
  workoutId: string;
  sectionIndex: number;
  exerciseIndex: number;
  insertPosition: "before" | "after";
  workout: {
    focus: string | null;
    difficulty: "beginner" | "intermediate" | "advanced";
    generation_context?: {
      profile_snapshot?: {
        fitness_level?: string;
        injuries?: string[];
        available_equipment?: string[];
      };
    };
    sections: Array<{
      exercises: Array<{ name: string }>;
    }>;
  };
  onApplyAdd: (
    newExercise: TrainerWorkoutExercise,
    editHistory: ExerciseAIAddHistoryEntry,
    insertPosition: "before" | "after"
  ) => Promise<void>;
  onUpdateImageUrl?: (imageUrl: string) => Promise<void>;
}

/**
 * Props for ExercisePreview component.
 */
export interface ExercisePreviewProps {
  originalExercise: TrainerWorkoutExercise;
  modifiedExercise: TrainerWorkoutExercise;
  fieldsModified: string[];
  explanation?: string;
}

/**
 * Props for AIProcessingState component.
 */
export interface AIProcessingStateProps {
  state: "idle" | "loading" | "success" | "error";
  message?: string;
  error?: string;
  onRetry?: () => void;
}

/**
 * Props for EditHistoryView component.
 */
export interface EditHistoryViewProps {
  history: ExerciseAIEditHistory[] | undefined;
  exercise: TrainerWorkoutExercise;
}
