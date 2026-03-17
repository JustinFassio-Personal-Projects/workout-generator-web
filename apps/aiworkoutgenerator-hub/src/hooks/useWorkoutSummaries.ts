"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import type { WorkoutSummary } from "@/types/workoutSummary";

const CACHE_KEY_PREFIX = "workout_summaries_cache_";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ITEMS = 5;

/** Restore Timestamp-like fields from JSON cache (completed_at, created_at, updated_at). */
function restoreCachedSummaries(cached: unknown): WorkoutSummary[] {
  if (!Array.isArray(cached)) return [];
  return cached.map((item) => {
    if (!item || typeof item !== "object") return item as WorkoutSummary;
    const rec = { ...item } as Record<string, unknown>;
    for (const key of [
      "completed_at",
      "created_at",
      "updated_at",
      "published_at",
    ]) {
      const v = rec[key];
      if (
        v &&
        typeof v === "object" &&
        "seconds" in (v as Record<string, unknown>)
      ) {
        const sec = (v as { seconds: number }).seconds;
        rec[key] = {
          toDate: () => new Date(sec * 1000),
          seconds: sec,
        };
      }
    }
    return rec as unknown as WorkoutSummary;
  });
}

export interface WorkoutSummariesFilters {
  dateFrom?: Date;
  dateTo?: Date;
  trainerName?: string;
  focus?: string;
  searchQuery?: string;
}

interface UseWorkoutSummariesOptions extends WorkoutSummariesFilters {
  pageSize?: number;
  enabled?: boolean;
}

interface UseWorkoutSummariesResult {
  summaries: WorkoutSummary[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage a user's workout summaries
 *
 * Used by the workout iteration feature to display a dropdown
 * of previous completed workouts.
 *
 * @param userId - The user ID to fetch summaries for
 * @param options - Configuration options
 * @returns Summaries data, loading state, and pagination controls
 */
export function useWorkoutSummaries(
  userId: string | undefined,
  options: UseWorkoutSummariesOptions = {}
): UseWorkoutSummariesResult {
  const {
    pageSize = 20,
    enabled = true,
    dateFrom,
    dateTo,
    trainerName,
    focus,
    searchQuery,
  } = options;

  const [summaries, setSummaries] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const hasFilters =
    dateFrom != null ||
    dateTo != null ||
    (trainerName != null && trainerName.trim() !== "") ||
    (focus != null && focus.trim() !== "");

  // Fetch summaries (initial or refresh)
  const fetchSummaries = useCallback(async () => {
    if (!userId || !enabled) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await WorkoutSummaryService.getUserSummaries(userId, {
        pageSize,
        dateFrom,
        dateTo,
        trainerName,
        focus,
      });

      setSummaries(result.summaries);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);

      // Cache first page when no filters (for optimistic display next time)
      if (!hasFilters && result.summaries.length > 0) {
        try {
          const toCache = result.summaries.slice(0, CACHE_MAX_ITEMS);
          sessionStorage.setItem(
            `${CACHE_KEY_PREFIX}${userId}`,
            JSON.stringify({
              summaries: toCache,
              cachedAt: Date.now(),
            })
          );
        } catch {
          // ignore storage errors
        }
      }
    } catch (err) {
      console.error("Error fetching workout summaries:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch summaries")
      );
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    enabled,
    pageSize,
    dateFrom,
    dateTo,
    trainerName,
    focus,
    hasFilters,
  ]);

  // Client-side filter by title (searchQuery)
  const filteredSummaries = useMemo(() => {
    if (!searchQuery?.trim()) return summaries;
    const q = searchQuery.trim().toLowerCase();
    return summaries.filter((s) => (s.title ?? "").toLowerCase().includes(q));
  }, [summaries, searchQuery]);

  // Load more summaries (pagination)
  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || loading || !lastDoc) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await WorkoutSummaryService.getUserSummaries(userId, {
        pageSize,
        lastDoc,
        dateFrom,
        dateTo,
        trainerName,
        focus,
      });

      setSummaries((prev) => [...prev, ...result.summaries]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Error loading more workout summaries:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to load more summaries")
      );
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    hasMore,
    loading,
    lastDoc,
    pageSize,
    dateFrom,
    dateTo,
    trainerName,
    focus,
  ]);

  // Refresh summaries (reset pagination)
  const refresh = useCallback(async () => {
    setLastDoc(null);
    await fetchSummaries();
  }, [fetchSummaries]);

  // Optimistic cache: show cached list immediately when no filters, then fetch in background
  useEffect(() => {
    if (!userId || !enabled) {
      if (!enabled) {
        setSummaries([]);
        setLoading(false);
        setLastDoc(null);
        setHasMore(false);
      }
      return;
    }

    if (!hasFilters) {
      try {
        const raw = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
        if (raw) {
          const { summaries: cached, cachedAt } = JSON.parse(raw) as {
            summaries: unknown;
            cachedAt: number;
          };
          if (
            Array.isArray(cached) &&
            cached.length > 0 &&
            Date.now() - cachedAt < CACHE_TTL_MS
          ) {
            setSummaries(restoreCachedSummaries(cached));
          }
        }
      } catch {
        // ignore parse/storage errors
      }
    }

    fetchSummaries();
  }, [userId, enabled, hasFilters, fetchSummaries]);

  // Reset when userId changes
  useEffect(() => {
    setSummaries([]);
    setLastDoc(null);
    setHasMore(false);
  }, [userId]);

  return {
    summaries: filteredSummaries,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
