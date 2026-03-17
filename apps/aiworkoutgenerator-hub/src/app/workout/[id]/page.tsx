"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { Home, AlertCircle } from "lucide-react";

import { getDbInstance } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicWorkoutDisplay } from "@/components/workout/PublicWorkoutDisplay";
import type { TrainerWorkout } from "@/types/firestore";

export default function PublicWorkoutPage() {
  const params = useParams();
  const workoutId = params.id as string;

  const [workout, setWorkout] = useState<TrainerWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkout() {
      if (!workoutId) {
        setError("Workout not found");
        setLoading(false);
        return;
      }

      try {
        const db = getDbInstance();
        const workoutRef = doc(db, "trainer_workouts", workoutId);
        const workoutSnap = await getDoc(workoutRef);

        if (!workoutSnap.exists()) {
          setError("Workout not found");
          setLoading(false);
          return;
        }

        const data = workoutSnap.data();

        // Check if the workout is public
        if (data.visibility !== "public") {
          setError("This workout is private");
          setLoading(false);
          return;
        }

        setWorkout({ ...data, id: workoutSnap.id } as TrainerWorkout);
      } catch (err) {
        console.error("Failed to fetch workout:", err);
        setError("Failed to load workout");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkout();
  }, [workoutId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading workout...</div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border-slate-700">
          <CardContent className="pt-8 pb-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Not Found</h1>
            <p className="text-slate-400 mb-6">
              This workout doesn&apos;t exist or has been removed.
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

  return <PublicWorkoutDisplay workout={workout} />;
}
