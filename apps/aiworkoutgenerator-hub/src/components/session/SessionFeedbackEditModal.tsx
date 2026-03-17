"use client";

import { useState, useEffect } from "react";
import { Edit, Clock, AlertCircle, Zap, Moon, Users } from "lucide-react";
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
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import { WorkoutHistoryService } from "@/services/history";
import { useUser } from "@/lib/auth";
import type { WorkoutSummary } from "@/types/workoutSummary";
import {
  getRpeLabel,
  weightIndexToSelection,
  weightSelectionToIndex,
  WEIGHT_INDEX_LABELS,
  SESSION_FEEDBACK_OPTIONS as SESSION_FEEDBACK_OPTIONS_BASE,
} from "@/lib/autoregulation";

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

interface SessionFeedbackEditModalProps {
  summary: WorkoutSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SessionFeedbackEditModal({
  summary,
  open,
  onOpenChange,
  onSuccess,
}: SessionFeedbackEditModalProps) {
  const { user } = useUser();
  const [sessionRpe, setSessionRpe] = useState(5);
  const [weightIndex, setWeightIndex] = useState(1); // Perfect
  const [sessionFeedback, setSessionFeedback] = useState<string[]>([]);
  const [jointPainLocation, setJointPainLocation] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate form fields from summary data
  useEffect(() => {
    if (open && summary) {
      setSessionRpe(summary.session_rpe ?? 5);
      setWeightIndex(weightSelectionToIndex(summary.weight_selection));
      setSessionFeedback(summary.session_feedback ?? []);
      setJointPainLocation(summary.joint_pain_location ?? "");
      setCoachNotes(summary.user_notes ?? "");
      setIsSubmitting(false);
    }
  }, [open, summary]);

  const toggleFeedback = (value: string) => {
    setSessionFeedback((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!summary) return;
    if (!user?.uid) {
      toast.error("Please sign in to edit feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      const completionData = {
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

      // Update both summary and workout document for consistency
      await Promise.all([
        WorkoutSummaryService.updateSessionFeedback(summary.id, completionData),
        // Also update the workout document so changes show immediately
        WorkoutHistoryService.markComplete(summary.workout_id, completionData),
      ]);

      toast.success("Session feedback updated!", {
        description: "Your changes have been saved.",
      });

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to update session feedback:", error);
      toast.error("Failed to update session feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!summary) return null;

  const showJointPainInput = sessionFeedback.includes("joint_tendon_pain");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[min(28rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-500" />
            Edit Session Feedback
          </DialogTitle>
          <DialogDescription>
            Update your autoregulation feedback and notes for &quot;
            {summary.title}&quot;.
          </DialogDescription>
          <p className="text-sm text-muted-foreground mt-2">
            Modify your session feedback to provide updated data to the
            algorithm.
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
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:flex-1"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
