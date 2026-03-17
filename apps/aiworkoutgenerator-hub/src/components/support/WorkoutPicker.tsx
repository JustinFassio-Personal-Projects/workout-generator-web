"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, getIdToken } from "@/lib/auth";
import { formatTimestamp } from "@/lib/utils/timestamp";
import type { TrainerWorkout } from "@/types/firestore";

// ============================================
// Component
// ============================================

interface WorkoutPickerProps {
  value?: string;
  onChange: (workoutId: string) => void;
  disabled?: boolean;
}

export function WorkoutPicker({
  value,
  onChange,
  disabled,
}: WorkoutPickerProps) {
  const { user } = useUser();
  const [workouts, setWorkouts] = useState<TrainerWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = user?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchWorkouts() {
      try {
        // Get ID token for API authentication
        const idToken = await getIdToken(true);
        if (!idToken) {
          console.warn("Could not get ID token, skipping workout fetch");
          setLoading(false);
          return;
        }

        // Use API route that uses Admin SDK (bypasses security rules)
        const response = await fetch("/api/users/workouts?limit=10", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const workoutList = (data.workouts || []) as TrainerWorkout[];

        setWorkouts(workoutList);

        // Auto-select most recent if no value and workouts exist
        if (!value && workoutList.length > 0) {
          onChange(workoutList[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch workouts:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkouts();
  }, [user?.uid, value, onChange]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Workout</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Workout</Label>
        <p className="text-sm text-muted-foreground">
          No workouts found. Generate a workout first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="workout-picker">Workout</Label>
      <Select
        value={value || workouts[0]?.id}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id="workout-picker">
          <SelectValue placeholder="Select a workout" />
        </SelectTrigger>
        <SelectContent>
          {workouts.map((workout) => (
            <SelectItem key={workout.id} value={workout.id}>
              {workout.title || `Workout ${workout.id.slice(0, 8)}`}
              {workout.created_at && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({formatTimestamp(workout.created_at)})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Default: Most recent workout. You can also paste a workout link/ID.
      </p>
    </div>
  );
}
