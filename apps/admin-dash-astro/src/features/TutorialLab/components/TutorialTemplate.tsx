/**
 * Generic tutorial engine: dynamic phase progression, webcam, pose detection, criteria evaluation.
 * No squat-specific enum; driven entirely by config.phases.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import ReactMarkdown from 'react-markdown';
import { Loader2, LogOut, User, RotateCw } from 'lucide-react';
import type { ExerciseConfig } from '../types/tutorial';
import type { ParsedBiomechanicsContext } from '@/lib/gemini-server';
import { createPoseLandmarker, detectLandmarks, type LandmarkPoint } from '../utils/poseLandmarker';
import {
  evaluateCriteria,
  canEvaluateCriteria,
  angleAtJoint,
  getAnglesForCriteria,
  formatCriterionTarget,
} from '../utils/angleCalculations';
import { LANDMARK_INDEX_TO_LABEL } from '../utils/constants';
import { useVoiceCues } from '../utils/useVoiceCues';
import { getWrongPoseCue, truncateForTTS } from '../utils/voiceCuePhrases';
import InstructionModal from './InstructionModal';
import JointOverlay, { type FeedbackState } from './JointOverlay';

const CRITERIA_HOLD_MS = 800;
const DETECTION_INTERVAL_MS = 100;

export interface TutorialTemplateProps {
  config: ExerciseConfig;
  onExit: () => void;
  /** When true, show current angles next to video (admin debug) */
  showDebugAngles?: boolean;
  /** Biomechanics for voice cues and performance guide */
  biomechanics?: ParsedBiomechanicsContext | null;
  /** When true, speak voice cues via TTS */
  voiceEnabled?: boolean;
  /** Exercise ID for fetching performance summary (optional) */
  exerciseId?: string;
}

export default function TutorialTemplate({
  config,
  onExit,
  showDebugAngles = false,
  biomechanics,
  voiceEnabled = false,
  exerciseId,
}: TutorialTemplateProps) {
  const { speakPhaseCue, speakWrongCue, speakCorrectCue } = useVoiceCues(voiceEnabled);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [landmarker, setLandmarker] = useState<Awaited<ReturnType<typeof createPoseLandmarker>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const criteriaMetAtRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [criteriaMetForDisplay, setCriteriaMetForDisplay] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [performanceSummary, setPerformanceSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const phases = config.phases;
  const currentPhase = phases[phaseIndex];
  const isLastPhase = phaseIndex >= phases.length - 1;

  // Load PoseLandmarker once
  useEffect(() => {
    let cancelled = false;
    createPoseLandmarker()
      .then((lm) => {
        if (!cancelled) setLandmarker(() => lm);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load pose model');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runDetection = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!landmarker || !video) return;

    const ts = performance.now();
    const result = detectLandmarks(landmarker, video, ts);
    setLandmarks(result);
  }, [landmarker]);

  // Detection loop
  useEffect(() => {
    if (!landmarker || showIntro) return;

    let lastRun = 0;
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - lastRun < DETECTION_INTERVAL_MS) return;
      lastRun = now;
      runDetection();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [landmarker, showIntro, runDetection]);

  // Evaluate criteria and advance phase when held
  useEffect(() => {
    if (!currentPhase?.successCriteria?.length) return;

    const met = evaluateCriteria(landmarks, currentPhase.successCriteria);
    if (met) {
      const now = Date.now();
      if (criteriaMetAtRef.current == null) criteriaMetAtRef.current = now;
      setCriteriaMetForDisplay(true);
      if (now - criteriaMetAtRef.current >= CRITERIA_HOLD_MS) {
        criteriaMetAtRef.current = null;
        if (phaseIndex >= phases.length - 1) {
          setShowSummary(true);
        } else {
          setPhaseIndex((i) => i + 1);
        }
      }
    } else {
      criteriaMetAtRef.current = null;
      setCriteriaMetForDisplay(false);
    }
  }, [landmarks, currentPhase?.successCriteria, phaseIndex, phases.length]);

  // Reset hold progress and criteria met when phase changes
  useEffect(() => {
    setHoldProgress(0);
    setCriteriaMetForDisplay(false);
  }, [phaseIndex]);

  // Update hold progress for UI when phase has criteria (read from ref on interval)
  useEffect(() => {
    if (!currentPhase?.successCriteria?.length) return;
    const interval = setInterval(() => {
      const started = criteriaMetAtRef.current;
      if (started == null) {
        setHoldProgress(0);
        return;
      }
      const elapsed = Date.now() - started;
      const progress = Math.min(1, elapsed / CRITERIA_HOLD_MS);
      setHoldProgress(progress);
    }, 100);
    return () => clearInterval(interval);
  }, [currentPhase?.successCriteria?.length, phaseIndex]);

  // Voice: phase enter (only when in tutorial, not intro)
  useEffect(() => {
    if (showIntro || !currentPhase?.instructionText) return;
    speakPhaseCue(truncateForTTS(currentPhase.instructionText));
  }, [showIntro, phaseIndex, currentPhase?.instructionText, speakPhaseCue]);

  // Voice: wrong pose (angle-based or performance cue)
  useEffect(() => {
    if (showIntro || !voiceEnabled || !currentPhase?.successCriteria?.length || !landmarks) return;
    const criteria = currentPhase.successCriteria;
    const canEval = canEvaluateCriteria(landmarks, criteria);
    const met = evaluateCriteria(landmarks, criteria);
    if (!canEval || met) return;
    const angles = getAnglesForCriteria(landmarks, criteria);
    const performanceCues = biomechanics?.performanceCues ?? [];
    const cue = getWrongPoseCue(angles, criteria) ?? performanceCues[0];
    if (cue) speakWrongCue(typeof cue === 'string' ? cue : String(cue));
  }, [showIntro, voiceEnabled, landmarks, currentPhase?.successCriteria, speakWrongCue, biomechanics?.performanceCues]);

  // Voice: correct pose (once when first met)
  const spokeCorrectRef = useRef(false);
  useEffect(() => {
    if (showIntro || !voiceEnabled) return;
    if (criteriaMetForDisplay && (currentPhase?.successCriteria?.length ?? 0) > 0) {
      if (!spokeCorrectRef.current) {
        spokeCorrectRef.current = true;
        speakCorrectCue();
      }
    } else {
      spokeCorrectRef.current = false;
    }
  }, [showIntro, voiceEnabled, criteriaMetForDisplay, currentPhase?.successCriteria?.length, speakCorrectCue]);

  // Fetch performance summary when tutorial completes
  useEffect(() => {
    if (!showSummary) return;
    const fallback = (): void => {
      const cues = biomechanics?.performanceCues ?? [];
      const mistakes = biomechanics?.commonMistakes ?? [];
      const parts: string[] = [];
      if (cues.length > 0) {
        parts.push('## Tips\n\n' + cues.map((c) => `- ${c}`).join('\n'));
      }
      if (mistakes.length > 0) {
        parts.push('\n## Avoid\n\n' + mistakes.map((m) => `- ${m}`).join('\n'));
      }
      setPerformanceSummary(parts.length > 0 ? parts.join('\n') : `## ${config.name}\n\nPractice regularly and focus on form.`);
      setLoadingSummary(false);
    };
    if (!exerciseId) {
      fallback();
      return;
    }
    setLoadingSummary(true);
    fetch(`/api/admin/exercises/${exerciseId}/performance-summary`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch'))))
      .then((data: { summary?: string }) => {
        setPerformanceSummary(data.summary ?? '');
        setLoadingSummary(false);
      })
      .catch(() => {
        fallback();
      });
  }, [showSummary, exerciseId, config.name, biomechanics?.performanceCues, biomechanics?.commonMistakes]);

  const handleIntroStart = () => {
    setShowIntro(false);
  };

  const handleExit = () => {
    setShowIntro(true);
    setShowSummary(false);
    setPerformanceSummary(null);
    setPhaseIndex(0);
    onExit();
  };

  const handlePhaseNext = () => {
    if (isLastPhase) {
      setShowSummary(true);
      return;
    }
    setPhaseIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/10 bg-black/20 p-8 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#ffbf00]" />
        <p>Loading pose model...</p>
      </div>
    );
  }

  if (error) {
    return (
      <InstructionModal
        title="Camera access required"
        primaryLabel="Exit"
        onPrimary={onExit}
        showClose={true}
        onClose={onExit}
      >
        <p className="text-white/90">{error}</p>
        <p className="mt-2 text-sm text-white/60">
          Please allow camera access in your browser when prompted, then try again. If you blocked access, use your browser settings to allow it for this site.
        </p>
      </InstructionModal>
    );
  }

  if (showIntro) {
    return (
      <InstructionModal
        title={config.name}
        primaryLabel="Start"
        onPrimary={handleIntroStart}
        secondaryLabel="Exit Tutorial"
        onSecondary={handleExit}
        showClose={true}
        onClose={handleExit}
      >
        <p>{config.description}</p>
        <p className="mt-2 text-sm text-white/60">
          You will need to allow camera access. Make sure your full body is visible for the best results.
        </p>
      </InstructionModal>
    );
  }

  if (showSummary) {
    return (
      <InstructionModal
        title={`${config.name} – Complete`}
        primaryLabel="Done"
        onPrimary={handleExit}
        showClose={true}
        onClose={handleExit}
      >
        <p className="mb-4">You completed the {config.name} tutorial.</p>
        <h3 className="mb-2 text-sm font-semibold text-white/90">How to improve</h3>
        {loadingSummary ? (
          <div className="flex items-center gap-2 text-white/80">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Loading performance guide…</span>
          </div>
        ) : performanceSummary ? (
          <div className="prose prose-invert prose-sm max-w-none text-left text-white/80 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-0.5">
            <ReactMarkdown>{performanceSummary}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-white/60">Practice regularly and focus on form.</p>
        )}
      </InstructionModal>
    );
  }

  const phaseHasCriteria = (currentPhase?.successCriteria?.length ?? 0) > 0;
  const successCriteria = currentPhase?.successCriteria ?? [];
  const canEvaluate = canEvaluateCriteria(landmarks, successCriteria);
  const met = evaluateCriteria(landmarks, successCriteria);
  const feedbackState: FeedbackState =
    phaseHasCriteria && (criteriaMetForDisplay || holdProgress > 0)
      ? 'correct'
      : phaseHasCriteria && canEvaluate && !met
        ? 'wrong'
        : 'default';

  const orientation = currentPhase?.cameraOrientation ?? 'front';

  return (
    <div className="flex flex-col gap-4">
      <div className="relative inline-block overflow-hidden rounded-lg border border-white/10 bg-black/20">
        <Webcam
          ref={webcamRef}
          audio={false}
          width={640}
          height={480}
          videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
          onUserMediaError={(err) =>
            setError(typeof err === 'string' ? err : err?.message ?? 'Camera access failed')
          }
          className="block w-full"
        />
        <JointOverlay
          landmarks={landmarks}
          targetJointIndices={currentPhase?.targetJoints ?? []}
          width={640}
          height={480}
          feedbackState={feedbackState}
        />
      </div>

      {/* Orientation hint: front or side */}
      <div className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
        {orientation === 'side' ? (
          <>
            <RotateCw className="h-4 w-4 shrink-0 text-[#ffbf00]" aria-hidden />
            <span>Stand sideways (profile view) for this step</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4 shrink-0 text-[#ffbf00]" aria-hidden />
            <span>Face the camera</span>
          </>
        )}
      </div>

      {/* User-facing angle feedback when phase has pose checks */}
      {phaseHasCriteria &&
        landmarks &&
        currentPhase?.successCriteria &&
        currentPhase.successCriteria.length > 0 && (
          <div className="rounded border border-white/10 bg-white/5 p-3 text-sm text-white/80">
            <p className="mb-1.5 font-medium text-white/90">Current angles</p>
            <ul className="space-y-1">
              {getAnglesForCriteria(
                landmarks,
                currentPhase.successCriteria
              ).map((item, i) => {
                const c = currentPhase!.successCriteria![i];
                const label =
                  LANDMARK_INDEX_TO_LABEL[c.jointB] ?? `Joint ${c.jointB}`;
                const targetText = formatCriterionTarget(
                  item.operator,
                  item.targetAngle
                );
                return (
                  <li key={i}>
                    {label}: {Number.isNaN(item.angle) ? '—' : `${item.angle.toFixed(0)}°`} (need {targetText})
                  </li>
                );
              })}
            </ul>
          </div>
        )}

      {showDebugAngles && landmarks && currentPhase?.successCriteria?.length > 0 && (
        <div className="rounded border border-white/10 bg-black/20 p-2 font-mono text-xs text-white/80">
          {currentPhase.successCriteria.map((c, i) => {
            const a = landmarks[c.jointA];
            const b = landmarks[c.jointB];
            const cPoint = landmarks[c.jointC];
            const angle =
              a && b && cPoint ? angleAtJoint(a, b, cPoint) : NaN;
            return (
              <div key={i}>
                Angle @ {c.jointB}: {Number.isNaN(angle) ? '—' : angle.toFixed(1)}° (target: {c.operator} {c.targetAngle}°)
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/80">
          Phase {phaseIndex + 1} of {phases.length}: {currentPhase?.name}
        </p>
        <div className="flex gap-2">
          {!phaseHasCriteria && (
            <button
              type="button"
              onClick={handlePhaseNext}
              className="rounded-lg border border-[#ffbf00]/50 bg-[#ffbf00]/20 px-4 py-2 text-sm font-medium text-[#ffbf00] transition-colors hover:bg-[#ffbf00]/30"
            >
              {isLastPhase ? 'Complete & Exit' : 'Next'}
            </button>
          )}
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Exit Tutorial
          </button>
        </div>
      </div>

      {phaseHasCriteria && (
        <div className="rounded border border-[#ffbf00]/20 bg-[#ffbf00]/5 p-3 text-sm text-white/90">
          <p>
            Hold the pose to continue. You&apos;ll advance after holding for
            about 1 second.
          </p>
          {holdProgress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#ffbf00] transition-all duration-100"
                  style={{ width: `${holdProgress * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-white/60">
                Hold… {(holdProgress * (CRITERIA_HOLD_MS / 1000)).toFixed(1)}s
              </p>
            </div>
          )}
          {holdProgress === 0 && (
            <p className="mt-1 text-xs text-white/60">
              Get into the pose shown above.
            </p>
          )}
        </div>
      )}

      {currentPhase?.instructionText && (
        <p className="rounded border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          {currentPhase.instructionText}
        </p>
      )}
    </div>
  );
}
