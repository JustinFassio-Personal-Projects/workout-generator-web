/**
 * Tutorial Lab page: exercise selector (approved only), load config from DB or defaults, render TutorialTemplate + optional ConfigBuilder.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Video, Settings2, Volume2 } from 'lucide-react';
import { getGeneratedExercises, updateGeneratedExercise } from '@/lib/supabase/client/generated-exercises';
import type { GeneratedExercise } from '@/types/generated-exercise';
import { getConfigForExercise } from '../configs/defaultConfigs';
import type { ExerciseConfig } from '../types/tutorial';
import TutorialTemplate from './TutorialTemplate';
import ConfigBuilder from './ConfigBuilder';

export default function TutorialLabView() {
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<GeneratedExercise | null>(null);
  const [config, setConfig] = useState<ExerciseConfig | null>(null);
  const [showDebugAngles, setShowDebugAngles] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showConfigBuilder, setShowConfigBuilder] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [generatingTutorial, setGeneratingTutorial] = useState(false);

  useEffect(() => {
    if (selectedExercise == null) {
      setConfig(null);
      return;
    }
    setConfig(
      selectedExercise.tutorialConfig ??
        getConfigForExercise(selectedExercise.slug) ??
        null
    );
  }, [selectedExercise]);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGeneratedExercises('approved');
      setExercises(data);
      if (data.length > 0) {
        setSelectedExercise((prev) => prev && data.some((e) => e.id === prev.id) ? prev : data[0]);
      } else {
        setSelectedExercise(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const dropdownOptions = exercises.map((e) => ({ value: e.id, label: e.exerciseName }));

  if (loading && exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-white/80">
        <Loader2 className="h-8 w-8 animate-spin text-[#ffbf00]" />
        <p>Loading exercises...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Video className="h-7 w-7 text-[#ffbf00]" />
          Tutorial Lab
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
          <button
            type="button"
            onClick={() => fetchExercises()}
            className="ml-3 text-sm underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-white/80">
          <span className="text-sm font-medium">Exercise</span>
          <select
            value={selectedExercise?.id ?? ''}
            onChange={(e) => {
              const ex = exercises.find((x) => x.id === e.target.value) ?? null;
              setSelectedExercise(ex);
            }}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-[#ffbf00]/50 focus:outline-none focus:ring-2 focus:ring-[#ffbf00]/20"
          >
            {dropdownOptions.length === 0 && (
              <option value="">No approved exercises</option>
            )}
            {dropdownOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-white/80">
          <input
            type="checkbox"
            checked={showDebugAngles}
            onChange={(e) => setShowDebugAngles(e.target.checked)}
            className="rounded border-white/20 bg-black/20 text-[#ffbf00] focus:ring-[#ffbf00]/50"
          />
          <span className="text-sm">Show angle debug</span>
        </label>
        <label className="flex items-center gap-2 text-white/80">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
            className="rounded border-white/20 bg-black/20 text-[#ffbf00] focus:ring-[#ffbf00]/50"
          />
          <Volume2 className="h-4 w-4 text-white/60" aria-hidden />
          <span className="text-sm">Voice cues</span>
        </label>
        {config != null && (
          <button
            type="button"
            onClick={() => setShowConfigBuilder((b) => !b)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            <Settings2 className="h-4 w-4" />
            {showConfigBuilder ? 'Hide' : 'Edit'} config
          </button>
        )}
      </div>

      {exercises.length === 0 && !loading ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <p>No approved exercises yet. Approve exercises in the Exercises section to use them here.</p>
        </div>
      ) : !selectedExercise ? (
        null
      ) : !config ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <p>
            No tutorial configured for <strong>{selectedExercise.exerciseName}</strong> yet. Create one from scratch or generate from exercise data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const seed: ExerciseConfig = {
                  id: selectedExercise.slug,
                  name: selectedExercise.exerciseName,
                  description:
                    selectedExercise.userFriendlyInstructions?.slice(0, 200) ||
                    `Tutorial for ${selectedExercise.exerciseName}`,
                  phases: [
                    {
                      id: 'setup',
                      name: 'Setup',
                      instructionText:
                        'Stand in view of the camera with your full body visible.',
                      targetJoints: [],
                      successCriteria: [],
                    },
                  ],
                };
                setConfig(seed);
                setShowConfigBuilder(true);
              }}
              className="rounded-lg border border-[#ffbf00]/50 bg-[#ffbf00]/20 px-4 py-2 text-sm font-medium text-[#ffbf00] hover:bg-[#ffbf00]/30"
            >
              Create tutorial
            </button>
            <button
              type="button"
              disabled={generatingTutorial}
              onClick={async () => {
                setGeneratingTutorial(true);
                setError(null);
                try {
                  const res = await fetch(
                    `/api/admin/exercises/${selectedExercise.id}/generate-tutorial`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ save: false }),
                    }
                  );
                  if (!res.ok) throw new Error('Failed to generate');
                  const data = (await res.json()) as { config: ExerciseConfig };
                  setConfig(data.config);
                  setShowConfigBuilder(true);
                } catch {
                  setError('Failed to generate tutorial from exercise.');
                } finally {
                  setGeneratingTutorial(false);
                }
              }}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/20 disabled:opacity-50"
            >
              {generatingTutorial ? 'Generating…' : 'Generate from exercise'}
            </button>
          </div>
        </div>
      ) : showConfigBuilder ? (
        <ConfigBuilder
          config={config}
          onConfigChange={setConfig}
          onClose={() => setShowConfigBuilder(false)}
          exerciseId={selectedExercise.id}
          onSave={async (nextConfig) => {
            await updateGeneratedExercise(selectedExercise.id, { tutorialConfig: nextConfig });
            setConfig(nextConfig);
            setSelectedExercise((prev) =>
              prev ? { ...prev, tutorialConfig: nextConfig } : null
            );
            setShowConfigBuilder(false);
          }}
        />
      ) : !tutorialActive ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-6">
          <p className="mb-4 text-white/80">
            Ready to run the <strong className="text-white">{config.name}</strong> tutorial.
          </p>
          <button
            type="button"
            onClick={() => setTutorialActive(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#ffbf00]/50 bg-[#ffbf00]/20 px-4 py-2.5 text-sm font-medium text-[#ffbf00] transition-colors hover:bg-[#ffbf00]/30"
          >
            <Video className="h-4 w-4" />
            Start Tutorial
          </button>
        </div>
      ) : (
        <TutorialTemplate
          config={config}
          onExit={() => setTutorialActive(false)}
          showDebugAngles={showDebugAngles}
          biomechanics={selectedExercise?.biomechanics}
          voiceEnabled={voiceEnabled}
          exerciseId={selectedExercise?.id}
        />
      )}
    </div>
  );
}
