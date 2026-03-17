"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Copy,
  Check,
  Zap,
  BarChart3,
  CheckCircle2,
  Flame,
  Dumbbell,
  Wind,
  X,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { SessionSummaryService } from "@/services/session/SessionSummaryService";
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import { ShareService, type ShareStatus } from "@/services/share";
import { ShareModal, ShareFAB } from "@/components/share";
import { SessionFeedbackEditModal } from "@/components/session/SessionFeedbackEditModal";
import { getPublicSummaryUrl } from "@/lib/share-config";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/auth";
import {
  getRpeLabel,
  WEIGHT_SELECTION_LABELS,
  SESSION_FEEDBACK_LABELS,
} from "@/lib/autoregulation";
import type { TrainerWorkout } from "@/types/firestore";
import type { SessionExerciseSummary } from "@/types/sessionSummary";
import type { WorkoutSummary } from "@/types/workoutSummary";

interface WorkoutSessionSummaryProps {
  workout: TrainerWorkout;
}

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

export function WorkoutSessionSummary({ workout }: WorkoutSessionSummaryProps) {
  const router = useRouter();
  const [activePhase, setActivePhase] = useState<PhaseKey>("Main Workout");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [isCreatingSummary, setIsCreatingSummary] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [summaryForEdit, setSummaryForEdit] = useState<WorkoutSummary | null>(
    null
  );
  const [loadingSummary, setLoadingSummary] = useState(false);
  const { user } = useUser();

  // Generate share URL when we have a summaryId
  const shareUrl = summaryId ? getPublicSummaryUrl(summaryId) : null;

  // Fetch the persisted summary ID for sharing
  // Note: This may fail with permission errors for older workouts without summaries,
  // which is handled gracefully - the Share FAB will create a summary on-demand
  useEffect(() => {
    async function fetchSummaryId() {
      if (!user?.uid) return;
      try {
        const persistedSummary =
          await WorkoutSummaryService.getSummaryByWorkoutId(
            workout.id,
            user.uid
          );
        if (persistedSummary) {
          setSummaryId(persistedSummary.id);
        }
      } catch (error) {
        // Permission errors are expected for workouts without summaries
        // The Share FAB will create a summary on-demand when clicked
        // Only log non-permission errors
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          !errorMessage.includes("PERMISSION_DENIED") &&
          !errorMessage.includes("false for")
        ) {
          console.error("Failed to fetch summary ID:", error);
        }
      }
    }
    fetchSummaryId();
  }, [workout.id, user?.uid]);

  // Fetch share status when summaryId is available
  useEffect(() => {
    async function fetchShareStatus() {
      if (!summaryId) {
        setShareStatus(null);
        return;
      }
      try {
        const status = await ShareService.getShareStatus(summaryId, workout.id);
        setShareStatus(status);
      } catch (error) {
        // Silently handle errors - share status is not critical
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          !errorMessage.includes("PERMISSION_DENIED") &&
          !errorMessage.includes("false for")
        ) {
          console.error("Failed to fetch share status:", error);
        }
      }
    }
    fetchShareStatus();
  }, [summaryId, workout.id]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Handle copy link to clipboard
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  };

  // Handle edit session feedback button click
  const handleEditFeedback = async () => {
    if (!user?.uid) {
      toast.error("Please sign in to edit feedback");
      return;
    }

    setLoadingSummary(true);
    try {
      // Fetch the summary by workout_id
      const persistedSummary =
        await WorkoutSummaryService.getSummaryByWorkoutId(workout.id, user.uid);

      if (!persistedSummary) {
        toast.error("Summary not found. Please complete the workout first.");
        return;
      }

      setSummaryForEdit(persistedSummary);
      setEditModalOpen(true);
    } catch (error) {
      console.error("Failed to load summary for editing:", error);
      toast.error("Failed to load summary for editing");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Handle successful edit - refetch summary ID and close modal
  const handleEditSuccess = async () => {
    // Close the edit modal
    setEditModalOpen(false);

    // Refetch the summary ID in case it was just created or updated
    // The workout prop will automatically update via useTrainerWorkout's onSnapshot listener
    if (user?.uid) {
      try {
        const persistedSummary =
          await WorkoutSummaryService.getSummaryByWorkoutId(
            workout.id,
            user.uid
          );
        if (persistedSummary) {
          setSummaryId(persistedSummary.id);
        }
      } catch (error) {
        // Non-critical - summary ID fetch failure doesn't break the UI
        console.error("Failed to refetch summary ID:", error);
      }
    }

    toast.success("Session feedback updated");
  };

  // Handle share button click - create summary on-demand if needed
  const handleShareClick = async () => {
    // If we already have a summary ID, just open the modal
    if (summaryId) {
      setShareModalOpen(true);
      return;
    }

    // No summary exists yet - create one on-demand
    if (!user?.uid) {
      toast.error("Please sign in to share");
      return;
    }

    setIsCreatingSummary(true);
    try {
      const sessionSummary =
        SessionSummaryService.generateSessionSummary(workout);
      // Pass user.uid explicitly to ensure it matches the authenticated user (Firestore security rule compliance)
      const newSummaryId = await WorkoutSummaryService.saveSummary(
        workout,
        sessionSummary,
        undefined, // no completion data for on-demand creation
        user.uid // explicit userId for security rules
      );
      setSummaryId(newSummaryId);
      setShareModalOpen(true);
    } catch (error) {
      console.error("Failed to create summary for sharing:", error);
      toast.error("Failed to prepare session for sharing");
    } finally {
      setIsCreatingSummary(false);
    }
  };

  const summary = useMemo(
    () => SessionSummaryService.generateSessionSummary(workout),
    [workout]
  );

  const sectionsByPhase = useMemo(() => {
    const map = new Map<PhaseKey, SessionExerciseSummary[]>();
    PHASE_ORDER.forEach((p) => map.set(p, []));

    summary.sections.forEach((section) => {
      const key = section.type as PhaseKey;
      const existing = map.get(key);
      if (!existing) return;
      existing.push(...section.exercises);
    });

    return map;
  }, [summary.sections]);

  const exercises = sectionsByPhase.get(activePhase) ?? [];

  const totalSetsCompleted = exercises.reduce(
    (sum, ex) => sum + ex.setsCompleted,
    0
  );
  const totalSetsPlanned = exercises.reduce(
    (sum, ex) => sum + ex.setsPlanned,
    0
  );

  const completionLabel =
    summary.stats.completionPercentage != null
      ? `${summary.stats.completionPercentage.toFixed(0)}% Complete`
      : "Completed";

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full p-4 space-y-8">
      {/* HEADER */}
      <header className="bg-slate-900/40 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" /> Session Report
            <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-2">
              {completionLabel}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {summary.title}
            {summary.focus ? ` • ${summary.focus}` : ""}{" "}
            {summary.completedAt
              ? `• ${summary.completedAt.toLocaleDateString()}`
              : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Difficulty: {summary.difficulty}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/summaries")}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
            aria-label="Close and return to Session Reports"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Share Modal - only render when we have a summaryId */}
      {summaryId && (
        <ShareModal
          summaryId={summaryId}
          workoutId={workout.id}
          workoutTitle={workout.title}
          open={shareModalOpen}
          onOpenChange={(open) => {
            setShareModalOpen(open);
            // Refresh share status when modal closes (in case user published)
            if (!open && summaryId) {
              ShareService.getShareStatus(summaryId, workout.id)
                .then(setShareStatus)
                .catch(() => {});
            }
          }}
        />
      )}

      {/* Share FAB - always visible, creates summary on-demand if needed */}
      <ShareFAB onClick={handleShareClick} disabled={isCreatingSummary} />

      {/* Edit Session Feedback Modal */}
      <SessionFeedbackEditModal
        summary={summaryForEdit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Share Link Banner - show when summary is published */}
      {summaryId && shareStatus?.summaryIsPublic && shareUrl && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-emerald-400">
              Shared publicly
            </span>
            {shareStatus?.workoutIsPublic && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                + Workout
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <code className="flex-1 sm:flex-none text-xs bg-slate-900 px-3 py-1.5 rounded border border-emerald-500/20 text-emerald-300 truncate max-w-xs">
              {shareUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-emerald-400" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* INTRO */}
      <section className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700">
        <p className="text-slate-300 leading-relaxed text-sm">
          Great work. Below is a snapshot of your performance metrics and the
          completed log for this workout. Use this to track progress over time
          and share with your coach if needed.
        </p>
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
              Review your sets, reps, and performance notes.
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
                  aria-label={phase === "Main Workout" ? "Main Circuit" : phase}
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">
                  Session Feedback
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditFeedback}
                  disabled={loadingSummary}
                  className="text-slate-300 hover:text-white border-slate-600 hover:border-slate-500"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {loadingSummary ? "Loading..." : "Edit"}
                </Button>
              </div>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Your autoregulation data and notes from this session.
              </p>

              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 tracking-wider">
                  Session Notes &amp; Autoregulation
                </h4>
                {(() => {
                  const rpe = workout.session_rpe;
                  const weight = workout.weight_selection;
                  const feedback = workout.session_feedback ?? [];
                  const jointLocation = workout.joint_pain_location?.trim();
                  const notes = workout.user_notes ?? summary.userNotes;
                  const hasJointPain = feedback.includes("joint_tendon_pain");
                  const hasAny =
                    (typeof rpe === "number" && rpe >= 1 && rpe <= 10) ||
                    (weight != null &&
                      (weight === "too_light" ||
                        weight === "perfect" ||
                        weight === "too_heavy")) ||
                    feedback.length > 0 ||
                    (hasJointPain && !!jointLocation) ||
                    !!notes?.trim();

                  if (!hasAny) {
                    return (
                      <div className="text-center text-slate-400 py-4">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                        <p className="text-sm">
                          Complete this workout and add notes to see a richer
                          summary here.
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
                      {weight != null &&
                        (weight === "too_light" ||
                          weight === "perfect" ||
                          weight === "too_heavy") && (
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
                              What impacted your workout:
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
                      {notes?.trim() && (
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="text-emerald-500 mt-0.5 w-4 h-4 shrink-0" />
                          <span>
                            <span className="font-medium">
                              Notes for Next Time:
                            </span>{" "}
                            <span className="text-slate-400 whitespace-pre-line block mt-1">
                              {notes.trim()}
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
    </main>
  );
}
