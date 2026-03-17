"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkoutPicker } from "../WorkoutPicker";
import { CertificationSubmitModal } from "@/components/certification/CertificationSubmitModal";
import type { WorkoutFeedbackData } from "@/types/support";
import type { TrainerWorkout } from "@/types/firestore";
import { useUser, getIdToken } from "@/lib/auth";
import { extractWorkoutContext } from "@/lib/support-utils";
import { formatTimestamp } from "@/lib/utils/timestamp";
import { CheckCircle2 } from "lucide-react";

// ============================================
// Component
// ============================================

interface WorkoutFeedbackFlowProps {
  value: WorkoutFeedbackData;
  onChange: (data: WorkoutFeedbackData) => void;
  disabled?: boolean;
  onWorkoutContextChange?: (
    context: ReturnType<typeof extractWorkoutContext> | null
  ) => void;
  onSubmit?: () => void;
}

export function WorkoutFeedbackFlow({
  value,
  onChange,
  disabled,
  onWorkoutContextChange,
  onSubmit,
}: WorkoutFeedbackFlowProps) {
  const { user } = useUser();
  const [selectedWorkout, setSelectedWorkout] = useState<TrainerWorkout | null>(
    null
  );
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [certificationModalOpen, setCertificationModalOpen] = useState(false);

  // Fetch workout details when workoutId changes
  useEffect(() => {
    if (!value.workoutId || !user) {
      setSelectedWorkout(null);
      onWorkoutContextChange?.(null);
      return;
    }

    let cancelled = false;
    setLoadingWorkout(true);

    async function fetchWorkout() {
      try {
        // Get ID token for API authentication
        const idToken = await getIdToken(true);
        if (!idToken) {
          console.warn("Could not get ID token, skipping workout fetch");
          setLoadingWorkout(false);
          return;
        }

        // Use API route that uses Admin SDK (bypasses security rules)
        const response = await fetch(`/api/users/workouts/${value.workoutId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const workout = data.workout as TrainerWorkout;

        if (workout && !cancelled) {
          setSelectedWorkout(workout);
          const context = extractWorkoutContext(workout);
          onWorkoutContextChange?.(context);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch workout:", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingWorkout(false);
        }
      }
    }

    fetchWorkout();

    return () => {
      cancelled = true;
    };
  }, [value.workoutId, user, onWorkoutContextChange]);

  const handleWorkoutSelect = (workoutId: string) => {
    onChange({ ...value, workoutId });
  };

  const handleReviewAndFix = () => {
    if (value.workoutId) {
      setCertificationModalOpen(true);
    }
  };

  const handleCertificationSuccess = () => {
    // Close the modal
    setCertificationModalOpen(false);
    // Trigger the submit handler which will submit both certification and workout_feedback
    onSubmit?.();
  };

  const formatDate = (timestamp: TrainerWorkout["created_at"]) => {
    if (!timestamp) return "Unknown date";
    try {
      return formatTimestamp(timestamp, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="space-y-6">
      {/* Workout Selection */}
      <div className="space-y-4">
        <WorkoutPicker
          value={value.workoutId}
          onChange={handleWorkoutSelect}
          disabled={disabled}
        />

        {/* Workout Confirmation */}
        {selectedWorkout && !loadingWorkout && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <CardTitle className="text-base">Selected Workout</CardTitle>
                  <CardDescription className="mt-1">
                    Review the details below, then click &quot;Review and
                    Fix&quot; to continue.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Title: </span>
                <span className="text-sm">{selectedWorkout.title}</span>
              </div>
              {selectedWorkout.created_at && (
                <div>
                  <span className="text-sm font-medium">Date: </span>
                  <span className="text-sm">
                    {formatDate(selectedWorkout.created_at)}
                  </span>
                </div>
              )}
              {selectedWorkout.trainerName && (
                <div>
                  <span className="text-sm font-medium">Trainer: </span>
                  <span className="text-sm">{selectedWorkout.trainerName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {loadingWorkout && (
          <Card>
            <CardContent className="py-6">
              <div className="text-center text-sm text-muted-foreground">
                Loading workout details...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review and Fix Button */}
        {selectedWorkout && !loadingWorkout && (
          <Button
            onClick={handleReviewAndFix}
            disabled={disabled || !value.workoutId}
            className="w-full"
            size="lg"
          >
            Review and Fix
          </Button>
        )}
      </div>

      {/* Certification Submit Modal */}
      {selectedWorkout && (
        <CertificationSubmitModal
          workoutId={value.workoutId!}
          workoutTitle={selectedWorkout.title}
          open={certificationModalOpen}
          onOpenChange={setCertificationModalOpen}
          onSuccess={handleCertificationSuccess}
        />
      )}
    </div>
  );
}
