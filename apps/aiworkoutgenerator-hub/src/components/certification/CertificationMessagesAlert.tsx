"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ChevronRight,
  Shield,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useCertificationQueue } from "@/hooks/useCertification";
import { useAvailableWorkoutsForCertification } from "@/hooks/useAvailableWorkoutsForCertification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CertificationStatusBadge } from "./CertificationStatusBadge";
import { CertificationSubmitModal } from "./CertificationSubmitModal";

/**
 * Component that displays certification status and allows submission.
 * Always visible with different states:
 * - Has unread messages: Show workouts with unread trainer messages
 * - Has submissions, no unread: Show active certification submissions
 * - Has workouts available: Show dropdown to select and submit workout
 * - No workouts: Show message to generate workouts first
 */
export function CertificationMessagesAlert() {
  const {
    items: queueItems,
    loading: queueLoading,
    error: queueError,
  } = useCertificationQueue();
  const {
    workouts: availableWorkouts,
    loading: workoutsLoading,
    error: workoutsError,
  } = useAvailableWorkoutsForCertification();

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);

  const loading = queueLoading || workoutsLoading;
  const error = queueError || workoutsError;

  // Determine state
  const workoutsWithUnread = queueItems.filter(
    (item) => item.hasUnreadMessages
  );
  const hasUnreadMessages = workoutsWithUnread.length > 0;
  const hasSubmissions = queueItems.length > 0;
  const hasAvailableWorkouts = availableWorkouts.length > 0;

  // Get selected workout title
  const selectedWorkout = availableWorkouts.find(
    (w) => w.id === selectedWorkoutId
  );
  const selectedWorkoutTitle = selectedWorkout?.title || "";

  const handleSubmitClick = () => {
    if (selectedWorkoutId && selectedWorkoutTitle) {
      setModalOpen(true);
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setSelectedWorkoutId("");
  };

  // Show loading skeleton
  if (loading) {
    return (
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background"
              >
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state (but still render)
  if (error) {
    return (
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Coach Review & Certification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load certification information. Please refresh the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  // State 1: Has unread messages (highest priority)
  if (hasUnreadMessages) {
    return (
      <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              New Messages from Your Trainer
            </CardTitle>
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            >
              {workoutsWithUnread.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {workoutsWithUnread.map((item) => (
              <Link
                key={item.workoutId}
                href={`/workouts?id=${item.workoutId}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {item.workoutTitle}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {item.assignedTrainerName && (
                      <>
                        <span>From {item.assignedTrainerName}</span>
                        <span>•</span>
                      </>
                    )}
                    <CertificationStatusBadge status={item.status} size="sm" />
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <Badge className="bg-orange-500 text-white text-xs">
                    New
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 2: Has submissions, no unread messages
  if (hasSubmissions) {
    return (
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Coach Review & Certification
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {queueItems.map((item) => (
              <Link
                key={item.workoutId}
                href={`/workouts?id=${item.workoutId}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {item.workoutTitle}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {item.assignedTrainerName && (
                      <>
                        <span>Assigned to {item.assignedTrainerName}</span>
                        <span>•</span>
                      </>
                    )}
                    <CertificationStatusBadge status={item.status} size="sm" />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 3: Has workouts available, none submitted
  if (hasAvailableWorkouts) {
    return (
      <>
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Coach Review & Certification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Submit a workout for review and certification by a live coach.
                The coach will review your workout and your profile, then
                provide feedback and updates.
              </p>
              <div className="space-y-2">
                <label htmlFor="workout-select" className="text-sm font-medium">
                  Select a workout to submit
                </label>
                <Select
                  value={selectedWorkoutId}
                  onValueChange={setSelectedWorkoutId}
                >
                  <SelectTrigger id="workout-select">
                    <SelectValue placeholder="Choose a workout..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkouts.map((workout) => (
                      <SelectItem key={workout.id} value={workout.id}>
                        {workout.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSubmitClick}
                disabled={!selectedWorkoutId}
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Submit for Coach Review & Certification
              </Button>
            </div>
          </CardContent>
        </Card>

        <CertificationSubmitModal
          workoutId={selectedWorkoutId}
          workoutTitle={selectedWorkoutTitle}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={handleModalSuccess}
        />
      </>
    );
  }

  // State 4: No workouts available
  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Coach Review & Certification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a workout first, then submit it for review and
            certification by a live coach.
          </p>
          <Button asChild>
            <Link href="/generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Workout
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
