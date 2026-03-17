export {
  WorkoutHistoryService,
  type WorkoutStatus,
  type WorkoutFocusFilter,
  type DurationFilter,
  type DateRangeFilter,
  type SortOption,
  type WorkoutHistoryFilters,
  type WorkoutHistoryPagination,
  type WorkoutHistoryResult,
  type WorkoutStats,
  type CompletionRatings,
} from "./WorkoutHistoryService";

// Re-export WeightSelection from shared types for backward compatibility
export type { WeightSelection } from "@/types/autoregulation";
