import type { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type { SummaryAnalytics } from "@/types/workoutSummary";

type SummaryDoc = {
  focus?: string | null;
  difficulty?: string;
  stats?: {
    totalTimeMinutes?: number;
    strainScore?: number | null;
    completionPercentage?: number | null;
  };
  completed_at?: Timestamp;
};

function completedAtToDate(value: SummaryDoc["completed_at"]): Date | null {
  if (!value || typeof value.toDate !== "function") return null;
  try {
    return value.toDate();
  } catch {
    return null;
  }
}

/**
 * Server-side aggregate analytics for `workout_summaries` (Admin SDK).
 * Mirrors {@link WorkoutSummaryService.getSummaryAnalytics} for use after reverse-trial gate.
 */
export async function computeSummaryAnalyticsAdmin(
  userId: string
): Promise<SummaryAnalytics> {
  const snapshot = await adminDb
    .collection("workout_summaries")
    .where("user_id", "==", userId)
    .orderBy("completed_at", "desc")
    .get();

  const summaries = snapshot.docs.map((d) => d.data() as SummaryDoc);

  if (summaries.length === 0) {
    return {
      totalSummaries: 0,
      totalTimeMinutes: 0,
      averageStrainScore: null,
      averageCompletionPercentage: null,
      mostCommonFocus: null,
      mostCommonDifficulty: null,
      summariesThisWeek: 0,
      summariesThisMonth: 0,
    };
  }

  const totalTimeMinutes = summaries.reduce(
    (sum, s) => sum + (s.stats?.totalTimeMinutes || 0),
    0
  );

  const strainScores = summaries
    .map((s) => s.stats?.strainScore)
    .filter((score): score is number => score !== null && score !== undefined);
  const averageStrainScore =
    strainScores.length > 0
      ? strainScores.reduce((a, b) => a + b, 0) / strainScores.length
      : null;

  const completionPercentages = summaries
    .map((s) => s.stats?.completionPercentage)
    .filter((pct): pct is number => pct !== null && pct !== undefined);
  const averageCompletionPercentage =
    completionPercentages.length > 0
      ? completionPercentages.reduce((a, b) => a + b, 0) /
        completionPercentages.length
      : null;

  const focusCounts = new Map<string, number>();
  summaries.forEach((s) => {
    if (s.focus) {
      focusCounts.set(s.focus, (focusCounts.get(s.focus) || 0) + 1);
    }
  });
  const mostCommonFocus =
    focusCounts.size > 0
      ? Array.from(focusCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  const difficultyCounts = new Map<
    "beginner" | "intermediate" | "advanced",
    number
  >();
  summaries.forEach((s) => {
    const d = s.difficulty;
    if (d === "beginner" || d === "intermediate" || d === "advanced") {
      difficultyCounts.set(d, (difficultyCounts.get(d) || 0) + 1);
    }
  });
  const mostCommonDifficulty =
    difficultyCounts.size > 0
      ? (Array.from(difficultyCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0][0] as "beginner" | "intermediate" | "advanced")
      : null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summariesThisWeek = summaries.filter((s) => {
    const completedDate = completedAtToDate(s.completed_at);
    return completedDate !== null && completedDate >= weekAgo;
  }).length;

  const summariesThisMonth = summaries.filter((s) => {
    const completedDate = completedAtToDate(s.completed_at);
    return completedDate !== null && completedDate >= monthAgo;
  }).length;

  return {
    totalSummaries: summaries.length,
    totalTimeMinutes,
    averageStrainScore,
    averageCompletionPercentage,
    mostCommonFocus,
    mostCommonDifficulty,
    summariesThisWeek,
    summariesThisMonth,
  };
}
