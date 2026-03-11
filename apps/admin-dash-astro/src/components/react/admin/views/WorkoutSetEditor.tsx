/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated editor for workout_sets. Uses fetchWorkoutDocument, updateWorkout.
 * Supports view metadata, sessions, Regenerate with AI, Publish/Unpublish.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Upload,
  EyeOff,
  Trash2,
} from 'lucide-react';
import {
  fetchWorkoutDocument,
  updateWorkoutStatus,
  deleteWorkout,
  type WorkoutDocument,
} from '@/lib/supabase/client/workout-persistence';
import {
  fetchFullProgram,
  fetchProgramMetadata,
  updateProgram,
} from '@/lib/supabase/client/program-persistence';
import WorkoutGeneratorModal from '../WorkoutGeneratorModal';
import type { WorkoutSetTemplate, WorkoutConfig } from '@/types/ai-workout';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';
import type { ProgramConfig } from '@/types/ai-program';

function durationWeeksToRequirement(n: number): 6 | 8 | 12 {
  if (n <= 6) return 6;
  if (n <= 8) return 8;
  return 12;
}

const WorkoutSetEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppContext();
  const fromProgram = (location.state as { fromProgram?: { programId: string; weekNumber: number; workoutIndex: number } })?.fromProgram;
  const [doc, setDoc] = useState<WorkoutDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [savingBackToProgram, setSavingBackToProgram] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const d = await fetchWorkoutDocument(id);
        setDoc(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workout');
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleRegenerateClose = () => {
    setShowRegenerateModal(false);
    if (id) {
      fetchWorkoutDocument(id)
        .then(setDoc)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to refresh'));
    }
  };

  const handleRegenerate = () => {
    setShowRegenerateModal(false);
    if (id) {
      fetchWorkoutDocument(id)
        .then(setDoc)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to refresh'));
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      setPublishingId(id);
      setError(null);
      await updateWorkoutStatus(id, 'published');
      const d = await fetchWorkoutDocument(id);
      setDoc(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    try {
      setPublishingId(id);
      setError(null);
      await updateWorkoutStatus(id, 'draft');
      const d = await fetchWorkoutDocument(id);
      setDoc(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish');
    } finally {
      setPublishingId(null);
    }
  };

  const handleSaveBackToProgram = async () => {
    if (!fromProgram || !user?.uid || !doc) return;
    const { programId, weekNumber, workoutIndex } = fromProgram;
    setSavingBackToProgram(true);
    try {
      setError(null);
      const [program, meta] = await Promise.all([
        fetchFullProgram(programId),
        fetchProgramMetadata(programId),
      ]);
      const schedule = [...(program.schedule ?? [])];
      const weekIdx = schedule.findIndex((w) => w.weekNumber === weekNumber);
      if (weekIdx < 0 || !schedule[weekIdx]?.workouts[workoutIndex]) {
        throw new Error(`Program slot not found (week ${weekNumber}, workout ${workoutIndex})`);
      }
      const workoutToSave = doc.workouts[0];
      if (!workoutToSave) {
        throw new Error('Workout set has no sessions to save back');
      }
      const updatedWorkouts = [...schedule[weekIdx].workouts];
      updatedWorkouts[workoutIndex] = workoutToSave;
      schedule[weekIdx] = { ...schedule[weekIdx], workouts: updatedWorkouts };
      const updatedData = { ...program, schedule };
      const programConfig: ProgramConfig = {
        programInfo: { title: meta.title, description: meta.description ?? '' },
        targetAudience: meta.targetAudience ?? {
          ageRange: '26-35',
          sex: 'Male',
          weight: 180,
          experienceLevel: 'intermediate',
        },
        requirements: {
          durationWeeks: durationWeeksToRequirement(meta.durationWeeks ?? 8),
        },
        goals: meta.goals ?? { primary: 'Muscle Gain', secondary: 'Strength' },
      };
      await updateProgram(programId, updatedData, programConfig, user.uid);
      toast.success('Saved back to program. Return to Program Editor to persist.');
      navigate(`/programs/${programId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save back to program');
      toast.error(err instanceof Error ? err.message : 'Failed to save back to program');
    } finally {
      setSavingBackToProgram(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !doc) return;
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      setError(null);
      await deleteWorkout(id);
      navigate('/workouts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (!id) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
        <p>Workout ID is required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-light" />
        <span className="ml-3 text-white/60">Loading workout...</span>
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="space-y-4">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Workout Factory
        </Link>
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  const workoutSet: WorkoutSetTemplate = {
    title: doc.title,
    description: doc.description,
    difficulty: doc.difficulty,
    workouts: doc.workouts,
  };
  const workoutConfig: WorkoutConfig = doc.workoutConfig ?? {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Workout Factory
        </Link>
        <div className="flex items-center gap-2">
          {fromProgram && (
            <button
              onClick={handleSaveBackToProgram}
              disabled={savingBackToProgram}
              className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-2 text-green-300 transition-colors hover:bg-green-500/20 disabled:opacity-50"
              title="Update the program schedule slot and return to Program Editor"
            >
              {savingBackToProgram && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingBackToProgram ? 'Saving...' : 'Save back to program'}
            </button>
          )}
          {doc.status === 'published' ? (
            <button
              onClick={handleUnpublish}
              disabled={publishingId === id}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white transition-colors hover:bg-yellow-500/20 hover:text-yellow-300 disabled:opacity-50"
              title="Unpublish"
            >
              {publishingId === id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              Unpublish
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishingId === id}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white transition-colors hover:bg-green-500/20 hover:text-green-300 disabled:opacity-50"
              title="Publish"
            >
              {publishingId === id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Publish
            </button>
          )}
          <button
            onClick={() => setShowRegenerateModal(true)}
            className="flex items-center gap-2 rounded-lg border border-orange-light/50 bg-orange-light/10 px-4 py-2 font-medium text-orange-light transition-colors hover:bg-orange-light/20"
          >
            <Sparkles className="h-4 w-4" />
            Regenerate with AI
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-300"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">{doc.title}</h1>
          {doc.description && (
            <p className="mt-1 text-white/60">{doc.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                doc.status === 'published'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-yellow-500/20 text-yellow-300'
              }`}
            >
              {doc.status || 'draft'}
            </span>
            <span className="text-sm text-white/50">{doc.difficulty}</span>
            <span className="text-sm text-white/50">
              {doc.workoutCount ?? doc.workouts.length} workout(s)
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {doc.workouts.map((w, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-white/10 bg-black/20 p-4"
            >
              <h3 className="font-medium text-white">{w.title}</h3>
              <p className="mt-1 text-sm text-white/60">{w.description}</p>

              {(w.warmupBlocks ?? []).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-white/80">Warmup</h4>
                  <ul className="mt-1 space-y-1 text-sm text-white/70">
                    {(w.warmupBlocks ?? []).map((item, i) => (
                      <li key={i}>
                        {item.exerciseName}
                        {Array.isArray(item.instructions) && item.instructions.length > 0 && (
                          <span className="text-white/50"> — {item.instructions.join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(w.exerciseBlocks ?? []).length > 0 ? (
                <div className="mt-3">
                  {(w.exerciseBlocks ?? []).map((block, bIdx) => (
                    <div key={bIdx} className={bIdx > 0 ? 'mt-3' : ''}>
                      <h4 className="text-sm font-medium text-white/80">
                        {(block as { name?: string }).name ?? `Block ${bIdx + 1}`}
                      </h4>
                      <ul className="mt-1 space-y-1 text-sm text-white/70">
                        {(block.exercises ?? []).map((ex, i) => (
                          <li key={i}>
                            {ex.exerciseName} —{' '}
                            {ex.workSeconds != null && ex.restSeconds != null && ex.rounds != null
                              ? `${ex.workSeconds}s work / ${ex.restSeconds}s rest × ${ex.rounds} rounds`
                              : `${ex.sets}×${ex.reps}${ex.rpe != null ? ` @ RPE ${ex.rpe}` : ''}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                (w.blocks ?? []).length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-white/80">Main</h4>
                    <ul className="mt-1 space-y-1 text-sm text-white/70">
                      {(w.blocks ?? []).map((ex, i) => {
                        const raw = ex as {
                          exerciseName?: string;
                          sets?: number;
                          reps?: string;
                          workSeconds?: number;
                          restSeconds?: number;
                          rounds?: number;
                        };
                        const timerSchema =
                          raw.workSeconds != null &&
                          raw.restSeconds != null &&
                          raw.rounds != null;
                        return (
                          <li key={i}>
                            {raw.exerciseName} —{' '}
                            {timerSchema
                              ? `${raw.workSeconds}s work / ${raw.restSeconds}s rest × ${raw.rounds} rounds`
                              : `${raw.sets}×${raw.reps}`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )
              )}

              {(w.finisherBlocks ?? []).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-white/80">Finisher</h4>
                  <ul className="mt-1 space-y-1 text-sm text-white/70">
                    {(w.finisherBlocks ?? []).map((item, i) => (
                      <li key={i}>
                        {item.exerciseName}
                        {Array.isArray(item.instructions) && item.instructions.length > 0 && (
                          <span className="text-white/50"> — {item.instructions.join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(w.cooldownBlocks ?? []).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-white/80">Cool down</h4>
                  <ul className="mt-1 space-y-1 text-sm text-white/70">
                    {(w.cooldownBlocks ?? []).map((item, i) => (
                      <li key={i}>
                        {item.exerciseName}
                        {Array.isArray(item.instructions) && item.instructions.length > 0 && (
                          <span className="text-white/50"> — {item.instructions.join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <WorkoutGeneratorModal
        isOpen={showRegenerateModal}
        onClose={handleRegenerateClose}
        onGenerate={handleRegenerate}
        existingWorkout={workoutSet}
        workoutConfig={workoutConfig}
        editingWorkoutId={id}
        editingChainMetadata={doc.chain_metadata ?? undefined}
      />
    </div>
  );
};

export default WorkoutSetEditor;
