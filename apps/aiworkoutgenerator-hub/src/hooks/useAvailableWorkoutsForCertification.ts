"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { getDbInstance } from "@/lib/firestore";
import { useUser } from "@/lib/auth";
import type { TrainerWorkout } from "@/types/firestore";

interface AvailableWorkout {
  id: string;
  title: string;
}

interface UseAvailableWorkoutsForCertificationReturn {
  workouts: AvailableWorkout[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch user's workouts that are available for certification submission.
 * Returns workouts where certification_status is "none" or null.
 */
export function useAvailableWorkoutsForCertification(): UseAvailableWorkoutsForCertificationReturn {
  const { user, loading: authLoading } = useUser();
  const [workouts, setWorkouts] = useState<AvailableWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      // Clear state when user is not available
      // This is a valid pattern: updating state in response to dependency changes
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkouts([]);

      setLoading(false);
      return;
    }

    const db = getDbInstance();
    const workoutsRef = collection(db, "trainer_workouts");

    // Query for workouts that are NOT in certification process
    // certification_status should be "none" or null/undefined
    const q = query(
      workoutsRef,
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc"),
      limit(50) // Reasonable limit for dropdown
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const availableWorkouts: AvailableWorkout[] = [];

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as TrainerWorkout;
            const certStatus = data.certification_status;

            // Only include workouts that are not in certification process
            // "none" or null/undefined means available for certification
            if (!certStatus || certStatus === "none") {
              availableWorkouts.push({
                id: docSnap.id,
                title: data.title || "Untitled Workout",
              });
            }
          });

          setWorkouts(availableWorkouts);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error("Error processing available workouts:", err);
          setError("Failed to load workouts");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching available workouts:", err);
        setError(err.message || "Failed to load workouts");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  return { workouts, loading, error };
}
