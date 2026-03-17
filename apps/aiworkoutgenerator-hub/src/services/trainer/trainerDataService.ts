import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { normalizeTrainerData } from "@/lib/trainer-normalize";
import type { Trainer, TrainerId, TrainerSeedData } from "@/types/trainer";
import { TRAINERS } from "@/types/trainer";

const COLLECTION_NAME = "trainers";

/**
 * Service for managing trainer data in Firestore.
 */
export class TrainerDataService {
  /**
   * Get all active trainers, ordered by display order.
   */
  static async getAllTrainers(): Promise<Trainer[]> {
    try {
      const db = getDbInstance();
      const trainersRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(trainersRef);

      if (snapshot.empty) {
        // Return static data as fallback
        return TRAINERS as Trainer[];
      }

      const normalized = snapshot.docs.map((doc) =>
        normalizeTrainerData(doc.data(), doc.id)
      );
      const activeTrainers = normalized.filter((trainer) => trainer.isActive);
      const sorted = [...activeTrainers].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );

      return sorted.length > 0 ? sorted : (TRAINERS as Trainer[]);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      // Return static data as fallback
      return TRAINERS as Trainer[];
    }
  }

  /**
   * Get a single trainer by ID.
   */
  static async getTrainerById(trainerId: TrainerId): Promise<Trainer | null> {
    try {
      const db = getDbInstance();
      const trainerRef = doc(db, COLLECTION_NAME, trainerId);
      const trainerDoc = await getDoc(trainerRef);

      if (trainerDoc.exists()) {
        return normalizeTrainerData(trainerDoc.data(), trainerDoc.id);
      }

      // Fall back to static data
      const staticTrainer = TRAINERS.find((t) => t.id === trainerId);
      return staticTrainer ? (staticTrainer as Trainer) : null;
    } catch (error) {
      console.error("Error fetching trainer:", error);
      // Fall back to static data
      const staticTrainer = TRAINERS.find((t) => t.id === trainerId);
      return staticTrainer ? (staticTrainer as Trainer) : null;
    }
  }

  /**
   * Create or update a trainer document.
   * Used by admin or seeding scripts.
   */
  static async upsertTrainer(trainer: TrainerSeedData): Promise<void> {
    const db = getDbInstance();
    const trainerRef = doc(db, COLLECTION_NAME, trainer.id);

    await setDoc(
      trainerRef,
      {
        ...trainer,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Update trainer stats (workouts generated, avg rating).
   * Only updates fields that are provided (undefined values are ignored).
   */
  static async updateTrainerStats(
    trainerId: TrainerId,
    stats: Partial<Trainer["stats"]>
  ): Promise<void> {
    const db = getDbInstance();
    const trainerRef = doc(db, COLLECTION_NAME, trainerId);

    // Build update object only with defined fields to prevent data loss
    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (stats.workoutsGenerated !== undefined) {
      updateData["stats.workoutsGenerated"] = stats.workoutsGenerated;
    }
    if (stats.avgRating !== undefined) {
      updateData["stats.avgRating"] = stats.avgRating;
    }

    await updateDoc(trainerRef, updateData);
  }

  /**
   * Update trainer image URL after image generation.
   */
  static async updateTrainerImage(
    trainerId: TrainerId,
    imageUrl: string
  ): Promise<void> {
    const db = getDbInstance();
    const trainerRef = doc(db, COLLECTION_NAME, trainerId);

    await updateDoc(trainerRef, {
      imageUrl,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Increment the workouts generated count for a trainer.
   * Called after a workout is successfully generated.
   */
  static async incrementWorkoutCount(trainerId: TrainerId): Promise<void> {
    try {
      const trainer = await TrainerDataService.getTrainerById(trainerId);
      if (trainer) {
        await TrainerDataService.updateTrainerStats(trainerId, {
          workoutsGenerated: (trainer.stats?.workoutsGenerated ?? 0) + 1,
        });
      }
    } catch (error) {
      // Non-critical operation, just log and continue
      console.error("Failed to increment workout count:", error);
    }
  }
}
