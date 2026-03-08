/**
 * Admin UI to view/edit phases and success criteria (debug/tweak).
 * Optional Save persists to DB when exerciseId + onSave are provided.
 */

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type {
  ExerciseConfig,
  ExercisePhase,
  SuccessCriterion,
  CameraOrientation,
} from '../types/tutorial';

export interface ConfigBuilderProps {
  config: ExerciseConfig;
  onConfigChange: (config: ExerciseConfig) => void;
  onClose: () => void;
  /** When set, show Save button that calls onSave(config). */
  exerciseId?: string | null;
  onSave?: (config: ExerciseConfig) => Promise<void>;
}

export default function ConfigBuilder({
  config,
  onConfigChange,
  onClose,
  exerciseId,
  onSave,
}: ConfigBuilderProps) {
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [jsonText, setJsonText] = useState(JSON.stringify(config, null, 2));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setJsonText(JSON.stringify(config, null, 2));
  }, [config]);

  const phase = config.phases[selectedPhaseIndex];

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as ExerciseConfig;
      if (parsed.phases && Array.isArray(parsed.phases)) {
        onConfigChange(parsed);
      }
    } catch {
      // Invalid JSON; leave as is
    }
  };

  const updatePhase = (updater: (p: ExercisePhase) => ExercisePhase) => {
    const next = config.phases.map((p, i) =>
      i === selectedPhaseIndex ? updater(p) : p
    );
    onConfigChange({ ...config, phases: next });
  };

  const addCriterion = () => {
    updatePhase((p) => ({
      ...p,
      successCriteria: [
        ...p.successCriteria,
        {
          jointA: 23,
          jointB: 25,
          jointC: 27,
          targetAngle: 90,
          operator: '<' as const,
        },
      ],
    }));
  };

  const removeCriterion = (index: number) => {
    updatePhase((p) => ({
      ...p,
      successCriteria: p.successCriteria.filter((_, i) => i !== index),
    }));
  };

  const updateCriterion = (index: number, field: keyof SuccessCriterion, value: number | string) => {
    updatePhase((p) => {
      const next = p.successCriteria.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      );
      return { ...p, successCriteria: next };
    });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(config);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <h2 className="text-lg font-semibold text-white">Config: {config.name}</h2>
        <div className="flex items-center gap-2">
          {exerciseId != null && onSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-[#ffbf00]/50 bg-[#ffbf00]/20 px-3 py-1.5 text-sm font-medium text-[#ffbf00] hover:bg-[#ffbf00]/30 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-white/80">Phases</p>
          <ul className="space-y-1">
            {config.phases.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPhaseIndex(i)}
                  className={`w-full rounded px-3 py-2 text-left text-sm ${
                    selectedPhaseIndex === i
                      ? 'bg-[#ffbf00]/20 text-[#ffbf00]'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  {i + 1}. {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {phase && (
          <div>
            <p className="mb-2 text-sm font-medium text-white/80">
              Phase: {phase.name}
            </p>
            <p className="mb-2 text-xs text-white/60">{phase.instructionText}</p>
            <p className="mb-1 text-xs text-white/60">
              Target joints: {phase.targetJoints.join(', ')}
            </p>
            <div className="mb-2">
              <label className="mr-2 text-xs text-white/60">Camera orientation:</label>
              <select
                value={phase.cameraOrientation ?? 'front'}
                onChange={(e) =>
                  updatePhase((p) => ({
                    ...p,
                    cameraOrientation: e.target.value as CameraOrientation,
                  }))
                }
                className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-white"
              >
                <option value="front">Front (face camera)</option>
                <option value="side">Side (profile view)</option>
              </select>
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-white/70">
                Success criteria ({phase.successCriteria.length})
              </p>
              {phase.successCriteria.map((c, i) => (
                <div
                  key={i}
                  className="mt-1 flex flex-wrap items-center gap-2 rounded bg-white/5 p-2 text-xs"
                >
                  <span className="text-white/60">
                    {c.jointA}–{c.jointB}–{c.jointC}: angle
                  </span>
                  <select
                    value={c.operator}
                    onChange={(e) =>
                      updateCriterion(
                        i,
                        'operator',
                        e.target.value as SuccessCriterion['operator']
                      )
                    }
                    className="rounded border border-white/10 bg-black/20 px-1 text-white"
                  >
                    <option value="<">&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="==">==</option>
                  </select>
                  <input
                    type="number"
                    value={c.targetAngle}
                    onChange={(e) =>
                      updateCriterion(i, 'targetAngle', Number(e.target.value))
                    }
                    className="w-14 rounded border border-white/10 bg-black/20 px-1 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeCriterion(i)}
                    className="text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCriterion}
                className="mt-2 text-xs text-[#ffbf00] hover:underline"
              >
                + Add criterion
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-white/80">JSON editor</p>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={8}
          className="w-full rounded border border-white/10 bg-black/20 p-2 font-mono text-xs text-white/80"
        />
        <button
          type="button"
          onClick={handleApplyJson}
          className="mt-2 rounded bg-[#ffbf00]/20 px-3 py-1 text-sm text-[#ffbf00] hover:bg-[#ffbf00]/30"
        >
          Apply JSON
        </button>
      </div>
    </div>
  );
}
