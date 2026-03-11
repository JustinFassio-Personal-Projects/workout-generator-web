/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkoutSetTemplate, WorkoutConfig, WorkoutChainMetadata } from '@/types/ai-workout';
import WorkoutLibraryTable from '../WorkoutLibraryTable';
import WorkoutGeneratorModal from '../WorkoutGeneratorModal';
import { fetchWorkoutDocument } from '@/lib/supabase/client/workout-persistence';

const ManageWorkouts: React.FC = () => {
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutSetTemplate | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingWorkoutConfig, setEditingWorkoutConfig] = useState<WorkoutConfig | null>(null);
  const [editingChainMetadata, setEditingChainMetadata] = useState<WorkoutChainMetadata | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewWorkout = () => {
    setEditingWorkout(null);
    setEditingWorkoutId(null);
    setEditingWorkoutConfig(null);
    setEditingChainMetadata(null);
    setShowGeneratorModal(true);
  };

  const handleCloseModal = () => {
    setShowGeneratorModal(false);
    setEditingWorkout(null);
    setEditingWorkoutId(null);
    setEditingWorkoutConfig(null);
    setEditingChainMetadata(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleGenerate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleRegenerate = useCallback(async (workoutId: string) => {
    try {
      const doc = await fetchWorkoutDocument(workoutId);
      const workoutSet: WorkoutSetTemplate = {
        title: doc.title,
        description: doc.description,
        difficulty: doc.difficulty,
        workouts: doc.workouts ?? [],
      };
      const workoutConfig: WorkoutConfig =
        doc.workoutConfig ??
        ({
          workoutInfo: { title: doc.title, description: doc.description },
          targetAudience: doc.targetAudience ?? {
            ageRange: '26-35',
            sex: 'Male',
            weight: 180,
            experienceLevel: 'intermediate',
          },
          requirements: {
            sessionsPerWeek: 3,
            sessionDurationMinutes: 45,
            splitType: 'upper_lower',
            lifestyle: 'active',
            twoADay: false,
            weeklyTimeMinutes: 180,
          },
          goals: doc.goals ?? { primary: 'Muscle Gain', secondary: 'Strength' },
        } as WorkoutConfig);
      setEditingWorkout(workoutSet);
      setEditingWorkoutId(workoutId);
      setEditingWorkoutConfig(workoutConfig);
      setEditingChainMetadata(doc.chain_metadata ?? null);
      setShowGeneratorModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load workout');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Workout Factory</h1>
          <p className="mt-2 text-white/60">Create and manage workout sets (splits, two-a-days)</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-medium text-white transition-colors hover:bg-white/10"
            title="Refresh list"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleNewWorkout}
            className="hover:bg-orange-light/90 flex items-center gap-2 rounded-lg bg-orange-light px-4 py-2 font-medium text-black transition-colors"
          >
            <Sparkles className="h-5 w-5" />
            <span>Generate Workout</span>
          </button>
        </div>
      </div>

      <WorkoutLibraryTable key={refreshKey} onRegenerate={handleRegenerate} />

      <WorkoutGeneratorModal
        isOpen={showGeneratorModal}
        onClose={handleCloseModal}
        onGenerate={handleGenerate}
        existingWorkout={editingWorkout ?? undefined}
        workoutConfig={editingWorkoutConfig ?? undefined}
        editingWorkoutId={editingWorkoutId ?? undefined}
        editingChainMetadata={editingChainMetadata ?? undefined}
      />
    </div>
  );
};

export default ManageWorkouts;
