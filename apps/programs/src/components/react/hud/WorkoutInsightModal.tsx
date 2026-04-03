/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal for post-workout AI insight: form + result, uses useGenerationState.
 */

import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useGenerationState } from '@workout-generator/content-generation-lab';
import WorkoutInsightForm, { type WorkoutInsightFormData } from './WorkoutInsightForm';
import RecoveryAssessmentDisplay from './RecoveryAssessmentDisplay';
import { saveWorkoutInsight } from '@/lib/supabase/client/workout-insights';

export interface WorkoutInsightSession {
  id: string;
  workoutTitle?: string;
  programTitle?: string;
  durationSeconds?: number;
  exerciseCount?: number;
}

export interface WorkoutInsightModalProps {
  session: WorkoutInsightSession;
  onClose: () => void;
}

const WorkoutInsightModal: React.FC<WorkoutInsightModalProps> = ({ session, onClose }) => {
  const formDataRef = useRef<WorkoutInsightFormData | null>(null);
  const [saving, setSaving] = React.useState(false);

  const genState = useGenerationState<{ insight: string }>({
    apiEndpoint: '/api/workout-insight',
    buildBody: () => {
      const fd = formDataRef.current;
      if (!fd) {
        throw new Error('Form data not set');
      }
      return {
        sessionId: session.id,
        heartRate: fd.heartRate,
        minutesSinceLastSet: fd.minutesSinceLastSet,
        notes: fd.notes,
        workoutTitle: session.workoutTitle,
        programTitle: session.programTitle,
        durationSeconds: session.durationSeconds,
        exerciseCount: session.exerciseCount,
      };
    },
    parseResponse: (d) => {
      const data = d as { insight?: string | null };
      if (!data.insight || typeof data.insight !== 'string' || data.insight.trim() === '') {
        throw new Error('Insight generation failed: missing insight in response');
      }
      return { insight: data.insight };
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFormSubmit = (data: WorkoutInsightFormData) => {
    formDataRef.current = data;
    genState.submit();
  };

  const handleSave = async () => {
    const fd = formDataRef.current;
    const insight = genState.result?.insight;
    if (!fd || !insight) return;
    setSaving(true);
    try {
      await saveWorkoutInsight({
        sessionId: session.id,
        heartRate: fd.heartRate,
        minutesSinceLastSet: fd.minutesSinceLastSet,
        notes: fd.notes,
        insightText: insight,
      });
      onClose();
    } catch (err) {
      console.error('[WorkoutInsightModal] Save failed:', err);
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-bg-dark shadow-2xl"
        role="dialog"
        aria-labelledby="workout-insight-modal-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-bg-dark px-6 py-4">
          <h2
            id="workout-insight-modal-title"
            className="font-heading text-lg font-black uppercase text-white"
          >
            Get AI Insight
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {genState.result ? (
            <>
              <RecoveryAssessmentDisplay
                insight={genState.result.insight}
                onSave={handleSave}
                onClear={genState.clearResult}
                saving={saving}
              />
            </>
          ) : (
            <>
              <WorkoutInsightForm
                sessionId={session.id}
                workoutTitle={session.workoutTitle}
                programTitle={session.programTitle}
                durationSeconds={session.durationSeconds}
                exerciseCount={session.exerciseCount}
                onSubmit={handleFormSubmit}
                loading={genState.loading}
              />
              {genState.error && (
                <p className="mt-3 font-mono text-xs text-red-400" role="alert">
                  {genState.error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default WorkoutInsightModal;
