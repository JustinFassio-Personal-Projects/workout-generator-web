"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Flame,
  MoreHorizontal,
  Eye,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Calendar,
  FileText,
  Dumbbell,
  Zap,
  Activity,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CertificationStatusBadge } from "@/components/certification";
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import { useUser } from "@/lib/auth";
import type { TrainerWorkout } from "@/types/firestore";

// We need to create this component
// import { AlertDialog } from "@/components/ui/alert-dialog";

interface WorkoutHistoryCardProps {
  workout: TrainerWorkout;
  onRepeat?: (workoutId: string) => Promise<string>;
  onDelete?: (workoutId: string) => Promise<void>;
  onMarkComplete?: (workout: TrainerWorkout) => void;
  /** Optional user ID for "Iterate" action (uses auth user if not provided). */
  userId?: string;
}

type WorkoutStatus = "completed" | "scheduled" | "draft";

function getWorkoutStatus(workout: TrainerWorkout): WorkoutStatus {
  if (workout.completed) return "completed";
  if (workout.scheduled_for) return "scheduled";
  return "draft";
}

function getStatusBadge(status: WorkoutStatus) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "scheduled":
      return (
        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/20">
          <Calendar className="w-3 h-3 mr-1" />
          Scheduled
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary">
          <FileText className="w-3 h-3 mr-1" />
          Draft
        </Badge>
      );
  }
}

function getDifficultyBadge(difficulty: string) {
  const colors = {
    beginner: "bg-green-500/15 text-green-600 border-green-500/30",
    intermediate: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    advanced: "bg-red-500/15 text-red-600 border-red-500/30",
  };

  return (
    <Badge
      className={colors[difficulty as keyof typeof colors] || "bg-muted"}
      variant="outline"
    >
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </Badge>
  );
}

function getFocusIcon(focus: string | null) {
  switch (focus?.toLowerCase()) {
    case "strength":
      return <Dumbbell className="w-3.5 h-3.5" />;
    case "hiit":
      return <Zap className="w-3.5 h-3.5" />;
    case "cardio":
      return <Activity className="w-3.5 h-3.5" />;
    case "flexibility":
    case "yoga":
      return <Sparkles className="w-3.5 h-3.5" />;
    default:
      return <Dumbbell className="w-3.5 h-3.5" />;
  }
}

function formatDate(
  timestamp: {
    toDate?: () => Date;
    seconds?: number;
    toMillis?: () => number;
  } | null
): string {
  if (!timestamp) return "No date";

  // Handle Firestore Timestamp objects (from direct Firestore queries)
  let date: Date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (typeof timestamp.toMillis === "function") {
    date = new Date(timestamp.toMillis());
  } else if (typeof timestamp.seconds === "number") {
    // Handle serialized Timestamp objects (from API responses)
    date = new Date(timestamp.seconds * 1000);
  } else {
    // Fallback: try to use as Date directly
    date = timestamp as unknown as Date;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkoutHistoryCard({
  workout,
  onRepeat,
  onDelete,
  onMarkComplete,
  userId: userIdProp,
}: WorkoutHistoryCardProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [isIterating, setIsIterating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const userId = userIdProp ?? user?.uid;
  const status = getWorkoutStatus(workout);
  const displayDate =
    status === "completed" && workout.completed_at
      ? formatDate(workout.completed_at)
      : formatDate(workout.created_at);

  const handleRepeat = async () => {
    if (!onRepeat) return;
    setIsRepeating(true);
    try {
      const newId = await onRepeat(workout.id);
      toast.success("Workout cloned! Redirecting...", {
        action: {
          label: "View",
          onClick: () =>
            (window.location.href = `/workouts?id=${newId}&from=history`),
        },
      });
    } catch (error) {
      console.error("Failed to repeat workout:", error);
      toast.error("Failed to clone workout");
    } finally {
      setIsRepeating(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(workout.id);
      toast.success("Workout deleted");
    } catch (error) {
      console.error("Failed to delete workout:", error);
      toast.error("Failed to delete workout");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleIterate = async () => {
    if (!userId) return;
    setIsIterating(true);
    try {
      const summary = await WorkoutSummaryService.getSummaryByWorkoutId(
        workout.id,
        userId
      );
      if (summary) {
        router.push(`/generate?iterate=${summary.id}`);
      } else {
        toast.error("No session report found for this workout");
      }
    } catch (error) {
      console.error("Failed to get session report:", error);
      toast.error("Could not open iterate flow");
    } finally {
      setIsIterating(false);
    }
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/30">
        <CardContent className="p-4">
          {/* Header: Status & Date */}
          <div className="flex items-center justify-between mb-3">
            {getStatusBadge(status)}
            <span className="text-xs text-muted-foreground">{displayDate}</span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">
            {workout.title}
          </h3>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {workout.totalDuration || workout.duration_minutes} min
            </span>
            <span className="text-border">•</span>
            {getDifficultyBadge(workout.difficulty)}
            {workout.estimatedCalories > 0 && (
              <>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  {workout.estimatedCalories} kcal
                </span>
              </>
            )}
          </div>

          {/* Tags Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {workout.focus && (
              <Badge variant="outline" className="text-xs gap-1">
                {getFocusIcon(workout.focus)}
                {workout.focus}
              </Badge>
            )}
            {workout.trainerName && (
              <Badge variant="outline" className="text-xs">
                {workout.trainerName}
              </Badge>
            )}
            {/* Certification Status */}
            {workout.certification_status &&
              workout.certification_status !== "none" && (
                <CertificationStatusBadge
                  status={workout.certification_status}
                  size="sm"
                  showIcon={true}
                />
              )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="default" className="flex-1">
              <Link href={`/workouts?id=${workout.id}&from=history`}>
                <Eye className="w-4 h-4 mr-1" />
                View
              </Link>
            </Button>

            {!workout.completed && onMarkComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkComplete(workout)}
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRepeat} disabled={isRepeating}>
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isRepeating ? "animate-spin" : ""}`}
                  />
                  {isRepeating ? "Cloning..." : "Repeat Workout"}
                </DropdownMenuItem>
                {status === "completed" && (
                  <DropdownMenuItem
                    onClick={handleIterate}
                    disabled={isIterating || !userId}
                  >
                    <TrendingUp
                      className={`w-4 h-4 mr-2 ${isIterating ? "animate-pulse" : ""}`}
                    />
                    {isIterating ? "Opening..." : "Iterate this workout"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{workout.title}&quot;. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
