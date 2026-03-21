"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { useUser } from "@/lib/auth";
import type { TrainerWorkout } from "@/types/firestore";
import {
  WorkoutHistoryService,
  type WorkoutHistoryFilters,
  type WorkoutStats,
} from "@/services/history";
import { mapWorkoutImagesBatch } from "@/services/image/ImageMappingService.client";

interface UseWorkoutHistoryState {
  workouts: TrainerWorkout[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  stats: WorkoutStats | null;
  statsLoading: boolean;
}

interface UseWorkoutHistoryReturn extends UseWorkoutHistoryState {
  loadMore: () => Promise<void>;
  refresh: () => void;
  deleteWorkout: (workoutId: string) => Promise<void>;
  repeatWorkout: (workoutId: string) => Promise<string>;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook for fetching and managing workout history with real-time updates,
 * pagination, filtering, and stats.
 */
export function useWorkoutHistory(
  filters: WorkoutHistoryFilters = {},
  pageSize: number = DEFAULT_PAGE_SIZE
): UseWorkoutHistoryReturn {
  const { user, loading: authLoading } = useUser();

  const [state, setState] = useState<UseWorkoutHistoryState>({
    workouts: [],
    loading: true,
    error: null,
    hasMore: false,
    stats: null,
    statsLoading: true,
  });

  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isLoadingMoreRef = useRef(false);
  const isMappingImagesRef = useRef(false);

  // Stringify filters for dependency comparison
  const filtersKey = JSON.stringify(filters);

  // Helper to get start date from date range filter
  const getDateFromRange = (range: string | undefined): Date | null => {
    if (!range || range === "all") return null;

    const now = new Date();
    switch (range) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  // Real-time subscription for initial data
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState((prev) => ({
        ...prev,
        workouts: [],
        loading: false,
        error: null,
        hasMore: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const db = getDbInstance();
    const workoutsRef = collection(db, "trainer_workouts");

    // Parse filters to get date range
    const parsedFilters = JSON.parse(filtersKey) as WorkoutHistoryFilters;
    const startDate = getDateFromRange(parsedFilters.dateRange);

    // Build query - include date range filter if specified
    let q;
    if (startDate) {
      q = query(
        workoutsRef,
        where("user_id", "==", user.uid),
        where("created_at", ">=", Timestamp.fromDate(startDate)),
        orderBy("created_at", "desc"),
        limit(pageSize + 1)
      );
    } else {
      q = query(
        workoutsRef,
        where("user_id", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(pageSize + 1)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        let workouts = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as TrainerWorkout[];

        // Apply client-side filters
        const parsedFilters = JSON.parse(filtersKey) as WorkoutHistoryFilters;

        if (parsedFilters.status && parsedFilters.status !== "all") {
          workouts = workouts.filter((w) => {
            if (parsedFilters.status === "completed") return w.completed;
            if (parsedFilters.status === "scheduled")
              return !w.completed && w.scheduled_for;
            if (parsedFilters.status === "draft")
              return !w.completed && !w.scheduled_for;
            return true;
          });
        }

        if (parsedFilters.focus && parsedFilters.focus !== "all") {
          workouts = workouts.filter(
            (w) => w.focus?.toLowerCase() === parsedFilters.focus?.toLowerCase()
          );
        }

        if (parsedFilters.duration && parsedFilters.duration !== "all") {
          workouts = workouts.filter((w) => {
            const mins = w.duration_minutes;
            // Handle undefined/null duration_minutes
            if (mins == null) return false;
            // Use consistent ranges matching WorkoutHistoryService.ts
            switch (parsedFilters.duration) {
              case "quick":
                return mins < 30; // 0-29 minutes
              case "standard":
                return mins >= 30 && mins <= 45; // 30-45 minutes (inclusive)
              case "long":
                return mins > 45; // 46+ minutes
              default:
                return true;
            }
          });
        }

        // Apply sorting
        if (parsedFilters.sort) {
          switch (parsedFilters.sort) {
            case "oldest":
              workouts.reverse();
              break;
            case "duration_asc":
              workouts.sort((a, b) => a.duration_minutes - b.duration_minutes);
              break;
            case "duration_desc":
              workouts.sort((a, b) => b.duration_minutes - a.duration_minutes);
              break;
            case "difficulty": {
              const order = { beginner: 1, intermediate: 2, advanced: 3 };
              workouts.sort(
                (a, b) =>
                  (order[a.difficulty] || 0) - (order[b.difficulty] || 0)
              );
              break;
            }
          }
        }

        // Determine pagination based on filtered workouts
        // If we have more than pageSize after filtering, there are more results
        const hasMore = workouts.length > pageSize;
        const displayWorkouts = hasMore
          ? workouts.slice(0, pageSize)
          : workouts;

        lastDocRef.current =
          snapshot.docs.length > 0
            ? snapshot.docs[Math.min(snapshot.docs.length - 1, pageSize - 1)]
            : null;

        // Map images from master_exercise_images for workouts that need it
        // Check if any workout has exercises without images
        const needsMapping = displayWorkouts.some(
          (workout) =>
            workout.sections &&
            workout.sections.some((section) =>
              section.exercises?.some((exercise) => !exercise.image_url)
            )
        );

        if (needsMapping && !isMappingImagesRef.current) {
          // Prevent concurrent mapping calls from rapid Firestore updates
          isMappingImagesRef.current = true;
          try {
            // Map images in parallel for all workouts
            const workoutsWithImages = await mapWorkoutImagesBatch(
              displayWorkouts,
              user
            );
            setState((prev) => ({
              ...prev,
              workouts: workoutsWithImages,
              loading: false,
              error: null,
              hasMore,
            }));
          } catch (error) {
            // If image mapping fails, still return workouts without images
            console.error("Error mapping workout images:", error);
            setState((prev) => ({
              ...prev,
              workouts: displayWorkouts,
              loading: false,
              error: null,
              hasMore,
            }));
          } finally {
            isMappingImagesRef.current = false;
          }
        } else {
          // All workouts already have images, no exercises to map, or mapping in progress
          setState((prev) => ({
            ...prev,
            workouts: displayWorkouts,
            loading: false,
            error: null,
            hasMore,
          }));
        }
      },
      (err) => {
        console.error("Workout history subscription error:", err);
        setState((prev) => ({
          ...prev,
          workouts: [],
          loading: false,
          error: err.message || "Failed to load workout history",
          hasMore: false,
        }));
      }
    );

    return () => unsubscribe();
  }, [authLoading, user, filtersKey, pageSize]);

  // Load stats separately (not real-time, just on mount/user change)
  useEffect(() => {
    if (authLoading || !user) {
      setState((prev) => ({ ...prev, stats: null, statsLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, statsLoading: true }));

    WorkoutHistoryService.getWorkoutStats(user.uid)
      .then((stats) => {
        setState((prev) => ({ ...prev, stats, statsLoading: false }));
      })
      .catch((err) => {
        console.error("Failed to load workout stats:", err);
        setState((prev) => ({ ...prev, stats: null, statsLoading: false }));
      });
  }, [authLoading, user]);

  // Load more workouts (pagination)
  const loadMore = useCallback(async () => {
    if (!user || isLoadingMoreRef.current || !state.hasMore) return;

    isLoadingMoreRef.current = true;

    try {
      const result = await WorkoutHistoryService.getUserWorkouts(
        user.uid,
        JSON.parse(filtersKey),
        {
          pageSize,
          lastDoc: lastDocRef.current || undefined,
        }
      );

      lastDocRef.current = result.lastDoc;

      // Map images for newly loaded workouts
      // If mapping fails, use workouts without images (graceful degradation)
      let workoutsToAdd = result.workouts;
      if (!isMappingImagesRef.current) {
        // Prevent concurrent mapping calls
        isMappingImagesRef.current = true;
        try {
          workoutsToAdd = await mapWorkoutImagesBatch(result.workouts, user);
        } catch (mappingError) {
          // If image mapping fails, still add workouts without images
          console.error("Error mapping workout images:", mappingError);
          // workoutsToAdd already contains result.workouts (without images)
        } finally {
          isMappingImagesRef.current = false;
        }
      }

      setState((prev) => ({
        ...prev,
        workouts: [...prev.workouts, ...workoutsToAdd],
        hasMore: result.hasMore,
      }));
    } catch (err) {
      // Only log errors from the initial fetch, not from mapping
      console.error("Failed to load more workouts:", err);
      // Don't retry here - let the user retry manually to avoid duplicate entries
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [user, filtersKey, pageSize, state.hasMore]);

  // Refresh data
  const refresh = useCallback(() => {
    lastDocRef.current = null;
    setState((prev) => ({ ...prev, loading: true }));
    // The useEffect will handle the refresh due to state change
  }, []);

  // Delete a workout
  const deleteWorkout = useCallback(
    async (workoutId: string) => {
      if (!user) throw new Error("Not authenticated");
      await WorkoutHistoryService.deleteWorkout(workoutId);
      // Real-time subscription will update the list automatically
    },
    [user]
  );

  // Repeat/clone a workout
  const repeatWorkout = useCallback(
    async (workoutId: string): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      return WorkoutHistoryService.repeatWorkout(workoutId);
    },
    [user]
  );

  return {
    ...state,
    loading: authLoading || state.loading,
    loadMore,
    refresh,
    deleteWorkout,
    repeatWorkout,
  };
}

/**
 * Hook for fetching recent workouts (for dashboard widget)
 */
export function useRecentWorkouts(count: number = 3) {
  const { user, loading: authLoading } = useUser();
  const [workouts, setWorkouts] = useState<TrainerWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if still loading auth or no user
    if (authLoading || !user) {
      return;
    }

    const db = getDbInstance();
    const workoutsRef = collection(db, "trainer_workouts");
    const q = query(
      workoutsRef,
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc"),
      limit(count)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as TrainerWorkout[];

        // Map images from master_exercise_images
        try {
          const workoutsWithImages = await mapWorkoutImagesBatch(data, user);
          setWorkouts(workoutsWithImages);
        } catch (err) {
          // If mapping fails, still return workouts without images
          console.error("Error mapping recent workout images:", err);
          setWorkouts(data);
        }

        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Recent workouts error:", err);
        setError(err.message || "Failed to load recent workouts");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, user, count]);

  // Derive loading state: loading if auth is loading or we haven't finished initial fetch
  const isLoading = authLoading || (!user ? false : loading);
  // Return empty array when no user
  const displayWorkouts = user ? workouts : [];

  return { workouts: displayWorkouts, loading: isLoading, error };
}

/**
 * Hook for fetching workout stats
 */
export function useWorkoutStats() {
  const { user, loading: authLoading } = useUser();
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    // Skip if still loading auth or no user
    if (authLoading || !user) {
      return;
    }

    let cancelled = false;

    WorkoutHistoryService.getWorkoutStats(user.uid)
      .then((s) => {
        if (!cancelled) {
          setStats(s);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, refreshTrigger]);

  // Derive loading state
  const isLoading = authLoading || (!user ? false : loading);

  return { stats: user ? stats : null, loading: isLoading, error, refresh };
}
