"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import {
  Zap,
  Home,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Flame,
  Dumbbell,
  Wind,
  ArrowRight,
} from "lucide-react";

import { getDbInstance } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareService } from "@/services/share";
import { getPublicWorkoutUrl } from "@/lib/share-config";
import type { WorkoutSummary } from "@/types/workoutSummary";
import {
  getRpeLabel,
  isValidWeightSelection,
  WEIGHT_SELECTION_LABELS,
  SESSION_FEEDBACK_LABELS,
} from "@/lib/autoregulation";

type PhaseKey = "Warmup" | "Main Workout" | "Finisher" | "Cooldown";
const PHASE_ORDER: PhaseKey[] = [
  "Warmup",
  "Main Workout",
  "Finisher",
  "Cooldown",
];

const PHASE_ICONS: Record<PhaseKey, typeof Flame> = {
  Warmup: Flame,
  "Main Workout": Dumbbell,
  Finisher: Zap,
  Cooldown: Wind,
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PublicSummaryPage() {
  const params = useParams();
  const summaryId = params.id as string;

  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<PhaseKey>("Main Workout");
  const [workoutIsPublic, setWorkoutIsPublic] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      if (!summaryId) {
        setError("Summary not found");
        setLoading(false);
        return;
      }

      try {
        const db = getDbInstance();
        const summaryRef = doc(db, "workout_summaries", summaryId);
        const summarySnap = await getDoc(summaryRef);

        if (!summarySnap.exists()) {
          setError("Summary not found");
          setLoading(false);
          return;
        }

        const data = summarySnap.data();

        // Validate visibility field: must be a string and equal to "public"
        // Use generic "not found" error for private summaries to prevent information disclosure
        if (
          typeof data.visibility !== "string" ||
          data.visibility !== "public"
        ) {
          setError("Summary not found");
          setLoading(false);
          return;
        }

        const summaryData = { ...data, id: summarySnap.id } as WorkoutSummary;
        setSummary(summaryData);

        // Check if workout is also public
        try {
          const shareStatus = await ShareService.getShareStatus(
            summaryId,
            summaryData.workout_id
          );
          setWorkoutIsPublic(shareStatus.workoutIsPublic);
        } catch (shareError) {
          // If we can't check share status, assume workout is not public
          // This is not critical - the link just won't show
          console.error("Failed to check workout visibility:", shareError);
          setWorkoutIsPublic(false);
        }
      } catch (err) {
        // Treat permission errors as "not found" to prevent enumeration attacks
        // This prevents information disclosure about document existence
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("PERMISSION_DENIED") ||
          errorMessage.includes("permission-denied") ||
          errorMessage.includes("false for")
        ) {
          setError("Summary not found");
        } else {
          console.error("Failed to fetch summary:", err);
          setError("Failed to load summary");
        }
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [summaryId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white animate-pulse">
          Loading session report...
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border-slate-700">
          <CardContent className="pt-8 pb-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Not Found</h1>
            <p className="text-slate-400 mb-6">
              This session report doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="https://aiworkoutgenerator.com">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedDate = summary.completed_at.toDate();
  const completionLabel =
    summary.stats.completionPercentage != null
      ? `${summary.stats.completionPercentage.toFixed(0)}% Complete`
      : "Completed";

  // Group exercises by phase
  const sectionsByPhase = new Map<
    PhaseKey,
    (typeof summary.sections)[0]["exercises"]
  >();
  PHASE_ORDER.forEach((p) => sectionsByPhase.set(p, []));

  summary.sections.forEach((section) => {
    const key = section.type as PhaseKey;
    const existing = sectionsByPhase.get(key);
    if (existing) {
      existing.push(...section.exercises);
    }
  });

  const exercises = sectionsByPhase.get(activePhase) ?? [];
  const totalSetsCompleted = exercises.reduce(
    (sum, ex) => sum + ex.setsCompleted,
    0
  );
  const totalSetsPlanned = exercises.reduce(
    (sum, ex) => sum + ex.setsPlanned,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <main className="max-w-5xl mx-auto w-full p-4 space-y-8 py-8">
        {/* HEADER */}
        <header className="bg-slate-900/40 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
              <Zap className="w-5 h-5 text-orange-500" /> Session Report
              <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-2">
                {completionLabel}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {summary.title}
              {summary.focus ? ` • ${summary.focus}` : ""}{" "}
              {` • ${formatDate(completedDate)}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Difficulty: {summary.difficulty}
            </span>
          </div>
        </header>

        {/* INTRO */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700">
          <p className="text-slate-300 leading-relaxed text-sm mb-4">
            This athlete completed a challenging workout session. Below
            you&apos;ll see their performance metrics, exercises completed, and
            training insights from this session.
            {summary.trainer_name &&
              ` Workout designed by ${summary.trainer_name}.`}
          </p>
          {workoutIsPublic && (
            <div className="pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                asChild
              >
                <Link href={getPublicWorkoutUrl(summary.workout_id)}>
                  <Dumbbell className="w-4 h-4 mr-2" />
                  View Full Workout Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <p className="text-xs text-slate-400 mt-2">
                See the complete workout with all exercises, sets, and training
                details.
              </p>
            </div>
          )}
        </section>

        {/* SESSION STATS */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700">
          <div className="mb-6 border-b border-slate-700 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" /> Session Statistics
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Key performance indicators from this session.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Total Time
              </div>
              <div className="text-4xl font-bold text-white">
                {summary.stats.totalTimeMinutes}
                <span className="text-lg text-slate-400 font-normal">m</span>
              </div>
              <div className="text-emerald-400 text-xs mt-2 font-semibold">
                Includes main work, excludes warmup estimate
              </div>
            </div>

            <div className="p-6 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Sets Completed
              </div>
              <div className="text-4xl font-bold text-white">
                {totalSetsCompleted}
                {totalSetsPlanned > 0 && (
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    / {totalSetsPlanned}
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-xs mt-2">
                Across {exercises.length} exercises in {activePhase}
              </div>
            </div>

            <div className="p-6 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Strain Score
              </div>
              <div className="text-4xl font-bold text-orange-500">
                {summary.stats.strainScore ?? "–"}
              </div>
              <div className="text-slate-400 text-xs mt-2">
                Based on difficulty & completion
              </div>
            </div>
          </div>
        </section>

        {/* COMPLETED LOG */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-1 border border-slate-700 shadow-2xl">
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Completed Log
              </h2>
              <p className="text-slate-400 text-sm">
                Exercises completed in this session.
              </p>
            </div>

            {/* Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 mb-6">
              {PHASE_ORDER.map((phase) => {
                const Icon = PHASE_ICONS[phase];
                const isActive = activePhase === phase;
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => setActivePhase(phase)}
                    aria-label={
                      phase === "Main Workout" ? "Main Circuit" : phase
                    }
                    className={`py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      isActive
                        ? "bg-slate-700 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {phase === "Main Workout" ? "Main Circuit" : phase}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Content - Stacked Full Width */}
            <div className="space-y-8 p-6">
              {/* Top Section: Exercise Preview */}
              <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 shadow-inner">
                <div className="flex justify-between items-end mb-4">
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Generated Preview
                  </h4>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">
                    Trainer Verified
                  </span>
                </div>
                <div className="space-y-3">
                  {exercises.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 text-sm">
                      No exercises in this phase.
                    </div>
                  ) : (
                    exercises.map((ex, index) => (
                      <div
                        key={`${ex.name}-${index}`}
                        className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800 hover:border-blue-500/30 transition-colors group"
                      >
                        <div>
                          <p className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                            {ex.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ex.setsCompleted} / {ex.setsPlanned} Sets
                          </p>
                        </div>
                        <div className="h-6 w-6 rounded-full border border-slate-700 flex items-center justify-center text-xs text-slate-400 bg-slate-800">
                          {index + 1}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Section: Session Notes & Autoregulation */}
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">
                  Session Feedback
                </h3>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                  Training insights and feedback from this session.
                </p>

                <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 tracking-wider">
                    Session Notes &amp; Autoregulation
                  </h4>
                  {(() => {
                    const rpe = summary.session_rpe;
                    const weight = summary.weight_selection;
                    const feedback = summary.session_feedback ?? [];
                    const jointLocation = summary.joint_pain_location?.trim();
                    const notes = summary.user_notes?.trim();
                    const hasJointPain = feedback.includes("joint_tendon_pain");
                    const hasAny =
                      (typeof rpe === "number" && rpe >= 1 && rpe <= 10) ||
                      isValidWeightSelection(weight) ||
                      feedback.length > 0 ||
                      (hasJointPain && !!jointLocation) ||
                      !!notes;

                    if (!hasAny) {
                      return (
                        <div className="text-center text-slate-400 py-4">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                          <p className="text-sm">
                            No additional feedback provided for this session.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <ul className="space-y-3 text-sm text-slate-300">
                        {typeof rpe === "number" && rpe >= 1 && rpe <= 10 && (
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="text-emerald-500 mt-0.5 w-4 h-4 shrink-0" />
                            <span>
                              <span className="font-medium">
                                Session Intensity:
                              </span>{" "}
                              {rpe} / 10 ({getRpeLabel(rpe)})
                            </span>
                          </li>
                        )}
                        {isValidWeightSelection(weight) && (
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="text-emerald-500 mt-0.5 w-4 h-4 shrink-0" />
                            <span>
                              <span className="font-medium">
                                Weight Selection:
                              </span>{" "}
                              {WEIGHT_SELECTION_LABELS[weight]}
                            </span>
                          </li>
                        )}
                        {feedback.length > 0 && (
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="text-emerald-500 mt-0.5 w-4 h-4 shrink-0" />
                            <span>
                              <span className="font-medium">
                                What impacted this workout:
                              </span>{" "}
                              {feedback
                                .map((v) => SESSION_FEEDBACK_LABELS[v] ?? v)
                                .join(", ")}
                            </span>
                          </li>
                        )}
                        {hasJointPain && jointLocation && (
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="text-emerald-500 mt-0.5 w-4 h-4 shrink-0" />
                            <span>
                              <span className="font-medium">Joint:</span>{" "}
                              {jointLocation}
                            </span>
                          </li>
                        )}
                        {notes && (
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="text-emerald-500 mt-0.5 w-4 h-4 shrink-0" />
                            <span>
                              <span className="font-medium">
                                Notes for Next Time:
                              </span>{" "}
                              <span className="text-slate-400 whitespace-pre-line block mt-1">
                                {notes}
                              </span>
                            </span>
                          </li>
                        )}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workout Ratings */}
        {(summary.difficulty_rating || summary.enjoyment_rating) && (
          <section className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
              Workout Ratings
            </h3>
            <div className="flex gap-8">
              {summary.difficulty_rating && (
                <div>
                  <span className="text-xs text-slate-400">Difficulty</span>
                  <div className="text-2xl font-bold text-white">
                    {summary.difficulty_rating}/10
                  </div>
                </div>
              )}
              {summary.enjoyment_rating && (
                <div>
                  <span className="text-xs text-slate-400">Enjoyment</span>
                  <div className="text-2xl font-bold text-white">
                    {summary.enjoyment_rating}/10
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 text-white text-center shadow-2xl">
          <h2 className="text-2xl font-bold mb-3">Inspired by this workout?</h2>
          <p className="text-orange-100 mb-6 text-base max-w-2xl mx-auto">
            Get personalized AI-generated workouts tailored to your goals,
            equipment, and fitness level. Start your fitness journey today with
            a free trial.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-white/90 h-12 px-8 text-base font-semibold shadow-lg"
              asChild
            >
              <Link href="https://aiworkoutgenerator.com">
                Get Started Free
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/50 text-white hover:bg-white/10 h-12 px-8 text-base font-semibold"
              asChild
            >
              <Link href="https://aiworkoutgenerator.com">Learn More</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
