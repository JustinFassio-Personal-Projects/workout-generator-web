"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Moon,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { WorkoutHistoryService } from "@/services/history";
import { TrainerService } from "@/services/trainer/TrainerService";
import { SessionSummaryService } from "@/services/session/SessionSummaryService";
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import { devLogError } from "@/lib/devLog";
import { useUser } from "@/lib/auth";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";
import type { WorkoutPlayerSurface } from "@/contexts/WorkoutAnalyticsAttemptContext";
import type { TrainerWorkout } from "@/types/firestore";
import {
  getRpeLabel,
  weightIndexToSelection,
  WEIGHT_INDEX_LABELS,
  SESSION_FEEDBACK_OPTIONS as SESSION_FEEDBACK_OPTIONS_BASE,
} from "@/lib/autoregulation";
import { getExerciseCompletionPercentRounded } from "@/lib/workout/exerciseCompletionPercent";

const FEEDBACK_ICONS: Record<string, typeof Clock> = {
  ran_out_of_time: Clock,
  joint_tendon_pain: AlertCircle,
  high_energy: Zap,
  low_energy: Moon,
  equipment_busy: Users,
};

const SESSION_FEEDBACK_OPTIONS = SESSION_FEEDBACK_OPTIONS_BASE.map((opt) => {
  const Icon = FEEDBACK_ICONS[opt.value] ?? Clock;
  return {
    ...opt,
    Icon,
  };
});

function hasPositiveSectionTiming(
  t: Record<number, number> | undefined
): boolean {
  if (!t) return false;
  return Object.values(t).some((s) => s != null && Number.isFinite(s) && s > 0);
}

interface CompletionModalProps {
  workout: TrainerWorkout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Per Firestore section index → elapsed seconds from manual section timers. */
  sessionSectionTiming?: Record<number, number>;
  /** When set (player pages under WorkoutAnalyticsAttemptProvider), enriches workout:complete. */
  analyticsSurface?: WorkoutPlayerSurface;
  workoutAttemptId?: string;
}

export function CompletionModal({
  workout,
  open,
  onOpenChange,
  sessionSectionTiming,
  analyticsSurface,
  workoutAttemptId,
}: CompletionModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const { sessionId } = useSession();
  const [sessionRpe, setSessionRpe] = useState(5);
  const [weightIndex, setWeightIndex] = useState(1); // Perfect
  const [sessionFeedback, setSessionFeedback] = useState<string[]>([]);
  const [jointPainLocation, setJointPainLocation] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateExerciseCompletion = useCallback(() => {
    return getExerciseCompletionPercentRounded(workout);
  }, [workout]);

  useEffect(() => {
    if (open && workout) {
      setSessionRpe(5);
      setWeightIndex(1);
      setSessionFeedback([]);
      setJointPainLocation("");
      setCoachNotes("");
      setIsSubmitting(false);
    }
  }, [open, workout?.id]);

  const toggleFeedback = (value: string) => {
    setSessionFeedback((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!workout) return;
    if (!user?.uid) {
      toast.error("Please sign in to complete workouts");
      return;
    }

    setIsSubmitting(true);
    try {
      if (workout.sections) {
        await TrainerService.updateWorkoutSections(
          workout.id,
          workout.sections
        );
      }

      const completionPct = calculateExerciseCompletion();
      const completionData = {
        completion_percentage: completionPct,
        session_rpe: sessionRpe,
        weight_selection: weightIndexToSelection(weightIndex),
        session_feedback: sessionFeedback,
        joint_pain_location:
          sessionFeedback.includes("joint_tendon_pain") &&
          jointPainLocation.trim()
            ? jointPainLocation.trim()
            : undefined,
        user_notes: coachNotes.trim() || undefined,
      };

      await WorkoutHistoryService.markComplete(workout.id, completionData);

      void logUserActivity(
        user.uid,
        "workout:complete",
        "workout",
        workout.id,
        {
          difficulty_rating: null,
          enjoyment_rating: null,
          completion_percentage: completionPct,
          completed_at: new Date().toISOString(),
          ...(analyticsSurface ? { surface: analyticsSurface } : {}),
          ...(workoutAttemptId ? { workout_attempt_id: workoutAttemptId } : {}),
        },
        {
          sessionId: sessionId || undefined,
          ...(workoutAttemptId ? { workoutAttemptId } : {}),
        }
      ).catch(() => {
        /* non-blocking */
      });

      try {
        const summaryOpts = hasPositiveSectionTiming(sessionSectionTiming)
          ? { sectionActualSeconds: sessionSectionTiming }
          : undefined;
        const summary = SessionSummaryService.generateSessionSummary(
          workout,
          summaryOpts
        );
        await WorkoutSummaryService.saveSummary(
          workout,
          summary,
          completionData,
          user.uid
        );
      } catch (summaryError) {
        devLogError("CompletionModal.saveSummary", summaryError);
        toast.warning(
          "Workout marked complete, but session report didn't save",
          {
            description:
              "You can still view the workout. Iterate from this session may not be available. Please check your connection and try again later.",
            duration: 6000,
          }
        );
      }

      toast.success("Workout marked as complete!", {
        description: "Great job finishing your workout!",
      });

      onOpenChange(false);
      router.push(`/workouts/${workout.id}/summary`);
    } catch (error) {
      devLogError("CompletionModal.handleSubmit", error);
      toast.error("Failed to save completion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickComplete = async () => {
    if (!workout) return;
    if (!user?.uid) {
      toast.error("Please sign in to complete workouts");
      return;
    }

    setIsSubmitting(true);
    try {
      if (workout.sections) {
        await TrainerService.updateWorkoutSections(
          workout.id,
          workout.sections
        );
      }

      const completionData = { completion_percentage: 100 };
      await WorkoutHistoryService.markComplete(workout.id, completionData);

      if (user) {
        void logUserActivity(
          user.uid,
          "workout:complete",
          "workout",
          workout.id,
          {
            difficulty_rating: null,
            enjoyment_rating: null,
            completion_percentage: 100,
            completed_at: new Date().toISOString(),
            ...(analyticsSurface ? { surface: analyticsSurface } : {}),
            ...(workoutAttemptId ? { workout_attempt_id: workoutAttemptId } : {}),
          },
          {
            sessionId: sessionId || undefined,
            ...(workoutAttemptId ? { workoutAttemptId } : {}),
          }
        ).catch(() => {
          /* non-blocking */
        });
      }

      try {
        const summaryOpts = hasPositiveSectionTiming(sessionSectionTiming)
          ? { sectionActualSeconds: sessionSectionTiming }
          : undefined;
        const summary = SessionSummaryService.generateSessionSummary(
          workout,
          summaryOpts
        );
        await WorkoutSummaryService.saveSummary(
          workout,
          summary,
          completionData,
          user.uid
        );
      } catch (summaryError) {
        devLogError(
          "CompletionModal.handleQuickComplete.saveSummary",
          summaryError
        );
        toast.warning(
          "Workout marked complete, but session report didn't save",
          {
            description:
              "Iterate from this session may not be available. Please check your connection and try again later.",
            duration: 6000,
          }
        );
      }

      toast.success("Workout marked as complete!");
      onOpenChange(false);
      router.push(`/workouts/${workout.id}/summary`);
    } catch (error) {
      devLogError("CompletionModal.handleQuickComplete", error);
      toast.error("Failed to save completion");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workout) return null;

  const showJointPainInput = sessionFeedback.includes("joint_tendon_pain");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[min(28rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Complete Workout
          </DialogTitle>
          <DialogDescription>
            Mark &quot;{workout.title}&quot; as complete.
          </DialogDescription>
          <p className="text-sm text-muted-foreground mt-2">
            Optionally add autoregulation feedback and notes to provide data to
            the algorithm and improve your next workout.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Session Intensity (RPE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rpe">Session Intensity (RPE)</Label>
              <span className="text-sm font-medium">{sessionRpe} / 10</span>
            </div>
            <p className="text-xs text-muted-foreground">
              How much effort did this session require?
            </p>
            <Slider
              id="rpe"
              value={[sessionRpe]}
              onValueChange={(v) => setSessionRpe(v[0] ?? 5)}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
            <p className="text-sm font-medium text-foreground">
              {sessionRpe} / 10 ({getRpeLabel(sessionRpe)})
            </p>
          </div>

          {/* Weight Selection */}
          <div className="space-y-2">
            <Label>Weight Selection</Label>
            <p className="text-xs text-muted-foreground">
              How did the weights feel overall?
            </p>
            <div className="flex gap-2">
              {WEIGHT_INDEX_LABELS.map((label, value) => (
                <Button
                  key={value}
                  type="button"
                  variant={weightIndex === value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setWeightIndex(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Session Feedback */}
          <div className="space-y-2">
            <Label>What impacted your workout today?</Label>
            <p className="text-xs text-muted-foreground">
              (Select all that apply)
            </p>
            <div className="flex flex-wrap gap-2">
              {SESSION_FEEDBACK_OPTIONS.map(({ value, label, Icon }) => {
                const isSelected = sessionFeedback.includes(value);
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFeedback(value)}
                    className="rounded-full gap-1.5"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Button>
                );
              })}
            </div>
            {showJointPainInput && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="joint-pain" className="text-sm">
                  Which joint?
                </Label>
                <Input
                  id="joint-pain"
                  placeholder="e.g. Shoulder, Knee, Back"
                  value={jointPainLocation}
                  onChange={(e) => setJointPainLocation(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}
          </div>

          {/* Coach&apos;s Notes */}
          <div className="space-y-2">
            <Label htmlFor="coach-notes">Notes for Next Time</Label>
            <p className="text-xs text-muted-foreground">
              Specific pain points or requests.
            </p>
            <Textarea
              id="coach-notes"
              placeholder="Shoulder hurt on the lateral raises, need a substitute..."
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleQuickComplete}
            disabled={isSubmitting}
            className="w-full sm:flex-1"
          >
            Quick Complete
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:flex-1"
          >
            {isSubmitting ? "Saving..." : "Save with Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
