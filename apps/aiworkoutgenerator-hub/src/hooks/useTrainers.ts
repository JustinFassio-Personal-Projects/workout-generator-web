"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { normalizeTrainerData } from "@/lib/trainer-normalize";
import type { Trainer, TrainerId } from "@/types/trainer";
import { TRAINERS, getRecommendedTrainer } from "@/types/trainer";

interface UseTrainersResult {
  trainers: Trainer[];
  loading: boolean;
  error: string | null;
}

interface UseTrainerResult {
  trainer: Trainer | null;
  loading: boolean;
  error: string | null;
}

interface UseRecommendedTrainerResult {
  recommendedTrainerId: TrainerId | null;
  recommendedTrainer: Trainer | null;
}

/**
 * Hook to fetch all active trainers from Firestore.
 * Falls back to static data if Firestore fails.
 */
export function useTrainers(): UseTrainersResult {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchTrainers = async () => {
      try {
        const db = getDbInstance();
        const trainersRef = collection(db, "trainers");

        unsubscribe = onSnapshot(
          trainersRef,
          (snapshot) => {
            if (snapshot.empty) {
              // Fall back to static data if Firestore is empty
              console.log("No trainers in Firestore, using static data");
              setTrainers(TRAINERS as Trainer[]);
            } else {
              const normalized = snapshot.docs.map((doc) =>
                normalizeTrainerData(doc.data(), doc.id)
              );
              const activeTrainers = normalized.filter((t) => t.isActive);
              const sorted = [...activeTrainers].sort(
                (a, b) => a.displayOrder - b.displayOrder
              );
              setTrainers(sorted.length > 0 ? sorted : (TRAINERS as Trainer[]));
            }
            setLoading(false);
          },
          (err) => {
            console.error("Error fetching trainers:", err);
            // Fall back to static data on error
            setTrainers(TRAINERS as Trainer[]);
            setError("Failed to load trainers from server, using cached data");
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Error setting up trainers listener:", err);
        // Fall back to static data
        setTrainers(TRAINERS as Trainer[]);
        setError("Failed to connect to server, using cached data");
        setLoading(false);
      }
    };

    fetchTrainers();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { trainers, loading, error };
}

/**
 * Hook to fetch a single trainer by ID.
 * Falls back to static data if Firestore fails.
 */
export function useTrainer(trainerId: TrainerId | null): UseTrainerResult {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(!!trainerId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trainerId) {
      setTrainer(null);
      setLoading(false);
      return;
    }

    const fetchTrainer = async () => {
      setLoading(true);
      try {
        const db = getDbInstance();
        const trainerRef = doc(db, "trainers", trainerId);
        const trainerDoc = await getDoc(trainerRef);

        if (trainerDoc.exists()) {
          setTrainer(normalizeTrainerData(trainerDoc.data(), trainerDoc.id));
        } else {
          // Fall back to static data
          const staticTrainer = TRAINERS.find((t) => t.id === trainerId);
          if (staticTrainer) {
            setTrainer(staticTrainer as Trainer);
          } else {
            setError("Trainer not found");
          }
        }
      } catch (err) {
        console.error("Error fetching trainer:", err);
        // Fall back to static data
        const staticTrainer = TRAINERS.find((t) => t.id === trainerId);
        if (staticTrainer) {
          setTrainer(staticTrainer as Trainer);
        }
        setError("Failed to load trainer from server, using cached data");
      } finally {
        setLoading(false);
      }
    };

    fetchTrainer();
  }, [trainerId]);

  return { trainer, loading, error };
}

/**
 * Hook to get the recommended trainer based on user's fitness goals.
 */
export function useRecommendedTrainer(
  goals: string[],
  trainers: Trainer[]
): UseRecommendedTrainerResult {
  const result = useMemo(() => {
    const recommendedId = getRecommendedTrainer(goals);

    if (!recommendedId) {
      return { recommendedTrainerId: null, recommendedTrainer: null };
    }

    const trainer = trainers.find((t) => t.id === recommendedId) ?? null;

    return {
      recommendedTrainerId: recommendedId,
      recommendedTrainer: trainer,
    };
  }, [goals, trainers]);

  return result;
}
