/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Form for post-workout insight: heart rate, minutes since last set, notes.
 */

import React, { useState } from 'react';

export interface WorkoutInsightFormData {
  heartRate: number;
  minutesSinceLastSet?: number;
  notes?: string;
}

export interface WorkoutInsightFormProps {
  sessionId: string;
  workoutTitle?: string;
  programTitle?: string;
  durationSeconds?: number;
  exerciseCount?: number;
  onSubmit: (data: WorkoutInsightFormData) => void;
  loading: boolean;
}

const HEART_RATE_MIN = 40;
const HEART_RATE_MAX = 220;
const MINUTES_MIN = 0;
const MINUTES_MAX = 60;

const WorkoutInsightForm: React.FC<WorkoutInsightFormProps> = ({ onSubmit, loading }) => {
  const [heartRate, setHeartRate] = useState<string>('');
  const [minutesSinceLastSet, setMinutesSinceLastSet] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const hr = parseInt(heartRate, 10);
    if (!Number.isFinite(hr) || hr < HEART_RATE_MIN || hr > HEART_RATE_MAX) {
      setError(`Heart rate must be ${HEART_RATE_MIN}–${HEART_RATE_MAX}`);
      return;
    }
    let mins: number | undefined;
    if (minutesSinceLastSet.trim()) {
      mins = parseInt(minutesSinceLastSet, 10);
      if (!Number.isFinite(mins) || mins < MINUTES_MIN || mins > MINUTES_MAX) {
        setError(`Minutes since last set must be ${MINUTES_MIN}–${MINUTES_MAX}`);
        return;
      }
    }
    onSubmit({
      heartRate: hr,
      minutesSinceLastSet: mins,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="workout-insight-heart-rate"
          className="mb-1.5 block font-mono text-[10px] font-medium uppercase text-white/70"
        >
          Post-workout heart rate (bpm) *
        </label>
        <input
          id="workout-insight-heart-rate"
          type="number"
          min={HEART_RATE_MIN}
          max={HEART_RATE_MAX}
          value={heartRate}
          onChange={(e) => setHeartRate(e.target.value)}
          placeholder="e.g. 120"
          required
          disabled={loading}
          className="focus:border-orange-light/50 focus:ring-orange-light/50 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 disabled:opacity-50"
        />
      </div>
      <div>
        <label
          htmlFor="workout-insight-minutes"
          className="mb-1.5 block font-mono text-[10px] font-medium uppercase text-white/70"
        >
          Minutes since last set (optional)
        </label>
        <input
          id="workout-insight-minutes"
          type="number"
          min={MINUTES_MIN}
          max={MINUTES_MAX}
          value={minutesSinceLastSet}
          onChange={(e) => setMinutesSinceLastSet(e.target.value)}
          placeholder="e.g. 2"
          disabled={loading}
          className="focus:border-orange-light/50 focus:ring-orange-light/50 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 disabled:opacity-50"
        />
      </div>
      <div>
        <label
          htmlFor="workout-insight-notes"
          className="mb-1.5 block font-mono text-[10px] font-medium uppercase text-white/70"
        >
          Notes (optional)
        </label>
        <textarea
          id="workout-insight-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How you felt, intensity, etc."
          disabled={loading}
          className="focus:border-orange-light/50 focus:ring-orange-light/50 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 disabled:opacity-50"
        />
      </div>
      {error && (
        <p className="font-mono text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-light py-3 font-heading text-sm font-black uppercase text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Get AI Insight'}
      </button>
    </form>
  );
};

export default WorkoutInsightForm;
