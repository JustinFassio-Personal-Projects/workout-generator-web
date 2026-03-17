"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Pause,
  Play,
  Maximize2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  ScrollText,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import useSound from "use-sound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  SectionTimerConfig,
  ExerciseTimerConfig,
  TimerMode,
} from "@/types/ai-exercise-editor";

type TimerPhase = "setup" | "active" | "rest" | "cooldown" | "complete";

interface CompactSectionTimerProps {
  config: SectionTimerConfig;
  safetyMode?: boolean;
  onOpenFullScreen: () => void;
  onSectionComplete?: () => void;
  shouldStart?: boolean;
  onStartComplete?: () => void;
  onTimerStateChange?: (isRunning: boolean) => void;
  shouldPause?: boolean;
  onPauseComplete?: () => void;
  autoScrollEnabled?: boolean;
  onAutoScrollChange?: (enabled: boolean) => void;
  onCurrentExerciseChange?: (exerciseIndex: number) => void;
  onStop?: () => void;
  onModeChange?: (mode: TimerMode) => void;
  // Lateral navigation (for active exercise view)
  onPreviousExercise?: () => void;
  onNextExercise?: () => void;
  isFirstExercise?: boolean;
  isLastExercise?: boolean;
  exercisePosition?: number; // 1-based
  totalExercises?: number;
  // Completion callbacks
  onSetComplete?: (
    sectionIdx: number,
    exerciseIdx: number,
    setIdx: number,
    completed: boolean
  ) => void;
  onExerciseComplete?: (
    sectionIdx: number,
    exerciseIdx: number,
    completed: boolean
  ) => void;
  sectionIndex?: number; // Section index in workout for completion callbacks
  // Function to check if a set is completed (for round detection)
  isSetCompleted?: (
    sectionIdx: number,
    exerciseIdx: number,
    setIdx: number
  ) => boolean;
  // Round cooldown callback - called when round cooldown starts/ends or timer state changes
  onRoundCooldownChange?: (
    isActive: boolean,
    roundInfo?: {
      currentRound: number;
      totalRounds: number;
      completedRounds: number[];
      nextRoundExercises: ExerciseTimerConfig[];
      timeRemaining?: number;
      isPaused?: boolean;
    }
  ) => void;
  // Round info callback - called when current round changes
  onRoundInfoChange?: (
    roundInfo: {
      currentRound: number;
      totalRounds: number;
    } | null
  ) => void;
  // Phase change callback - called when timer phase changes
  onPhaseChange?: (phase: TimerPhase) => void;
  // Section cooldown callback - called when section cooldown starts/ends (for final section cooldowns, not round cooldowns)
  onSectionCooldownChange?: (
    isActive: boolean,
    cooldownInfo?: {
      timeRemaining: number;
      isPaused: boolean;
    }
  ) => void;
  // Layout variant
  variant?: "inline" | "fixed"; // fixed = sticky footer
  className?: string;
}

/**
 * Compact section timer that displays below the exercise scroll bar.
 * Shows timer information with controls and an "Open Timer" button to switch to full-screen view.
 */
export function CompactSectionTimer({
  config,
  safetyMode: _safetyMode = false,
  onOpenFullScreen,
  onSectionComplete,
  shouldStart = false,
  onStartComplete,
  onTimerStateChange,
  shouldPause = false,
  onPauseComplete,
  autoScrollEnabled = false,
  onAutoScrollChange,
  onCurrentExerciseChange,
  onStop,
  onModeChange,
  onPreviousExercise,
  onNextExercise,
  isFirstExercise,
  isLastExercise,
  exercisePosition,
  totalExercises: navTotalExercises,
  onSetComplete,
  onExerciseComplete,
  sectionIndex,
  isSetCompleted,
  onRoundCooldownChange,
  onRoundInfoChange,
  onPhaseChange,
  onSectionCooldownChange,
  variant = "inline",
  className = "",
}: CompactSectionTimerProps) {
  const [phase, setPhase] = useState<TimerPhase>("setup");
  const [isPaused, setIsPaused] = useState(true);
  const [mode, setMode] = useState<TimerMode>(
    config.timerMode || "interval-circuit"
  );
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [bilateralSide, setBilateralSide] = useState<1 | 2>(1);
  const [bidirectionalDirection, setBidirectionalDirection] = useState<1 | 2>(
    1
  );
  const [timeRemaining, setTimeRemaining] = useState(config.setupDuration);
  const [restContext, setRestContext] = useState<
    "between-sets" | "between-exercises" | null
  >(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const readySoundPlayedRef = useRef(false);
  const pendingStartSoundRef = useRef(false);
  const prevShouldStartRef = useRef(false);
  const prevShouldPauseRef = useRef(false);
  // Track last completed set/exercise for unmarking on back
  const lastCompletedRef = useRef<{
    exerciseIdx: number;
    setIdx: number;
    wasExerciseComplete: boolean;
  } | null>(null);
  // Track last notified exercise index to prevent duplicate callbacks
  const lastNotifiedExerciseIndexRef = useRef<number | null>(null);

  // Round tracking state for interval-circuit mode
  const totalRounds = useMemo(() => {
    return Math.max(...config.exercises.map((e) => e.sets), 1);
  }, [config.exercises]);
  const [currentRound, setCurrentRound] = useState(1);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);
  const [isRoundCooldown, setIsRoundCooldown] = useState(false);
  // Track skipped sets for round detection (set index -> exercise index -> true if skipped)
  const skippedSetsRef = useRef<Map<number, Set<number>>>(new Map());

  const totalExercises = config.exercises.length;
  const currentExercise: ExerciseTimerConfig | undefined =
    config.exercises[currentExerciseIndex];
  const nextExercise: ExerciseTimerConfig | undefined =
    config.exercises[currentExerciseIndex + 1];

  // Derived mode values
  const isStopwatch = mode === "circuit"; // Count UP vs countdown

  // Handle mode change
  const handleModeChange = useCallback(
    (newMode: TimerMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange]
  );

  // Load volume and mute preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedVolume = window.localStorage.getItem("timer-volume");
      const storedMuted = window.localStorage.getItem("timer-muted");
      if (storedVolume !== null) {
        const parsedVolume = parseFloat(storedVolume);
        if (
          !Number.isNaN(parsedVolume) &&
          parsedVolume >= 0 &&
          parsedVolume <= 1
        ) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setVolume(parsedVolume);
        }
      }
      if (storedMuted !== null) {
        setIsMuted(storedMuted === "true");
      }
    } catch {
      // localStorage might be unavailable (e.g., in private browsing); fall back to defaults
    }
  }, []);

  // Persist volume and mute preferences to localStorage when they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("timer-volume", String(volume));
      window.localStorage.setItem("timer-muted", String(isMuted));
    } catch {
      // Ignore persistence errors (e.g., quota exceeded) to avoid breaking the timer
    }
  }, [volume, isMuted]);

  /**
   * Sound Effects Initialization
   */
  const [playReady, { sound: readySound }] = useSound("/sounds/ready.wav", {
    volume: isMuted ? 0 : volume,
    interrupt: true,
    onloaderror: () => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[CompactSectionTimer] Failed to load ready.wav. Timer will continue without this sound."
        );
      }
    },
  });
  const [playStart, { sound: startSound }] = useSound("/sounds/start.wav", {
    volume: isMuted ? 0 : volume,
    interrupt: true,
    onloaderror: () => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[CompactSectionTimer] Failed to load start.wav. Timer will continue without this sound."
        );
      }
    },
  });
  const [playComplete, { sound: completeSound }] = useSound(
    "/sounds/complete.wav",
    {
      volume: isMuted ? 0 : volume,
      interrupt: true,
      onloaderror: () => {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[CompactSectionTimer] Failed to load complete.wav. Timer will continue without this sound."
          );
        }
      },
    }
  );
  const [playCooldown, { sound: cooldownSound }] = useSound(
    "/sounds/cooldown.ogg",
    {
      volume: isMuted ? 0 : volume,
      interrupt: true,
      onloaderror: () => {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[CompactSectionTimer] Failed to load cooldown.ogg. Timer will continue without this sound."
          );
        }
      },
    }
  );

  // Update volume directly on sound instances for immediate updates
  useEffect(() => {
    if (readySound) {
      readySound.volume(isMuted ? 0 : volume);
    }
    if (startSound) {
      startSound.volume(isMuted ? 0 : volume);
    }
    if (completeSound) {
      completeSound.volume(isMuted ? 0 : volume);
    }
    if (cooldownSound) {
      cooldownSound.volume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted, readySound, startSound, completeSound, cooldownSound]);

  // Vibrate helper
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Go back to previous exercise's active work phase
  const handleBack = useCallback(() => {
    // If we're on the very first exercise and in initial setup, nothing to go back to
    if (currentExerciseIndex === 0 && phase === "setup") {
      return;
    }

    // Unmark completion if we're going back from rest phase
    if (
      phase === "rest" &&
      lastCompletedRef.current &&
      sectionIndex !== undefined
    ) {
      const { exerciseIdx, setIdx, wasExerciseComplete } =
        lastCompletedRef.current;

      // Unmark the set
      if (onSetComplete) {
        onSetComplete(sectionIndex, exerciseIdx, setIdx, false);
      }

      // Unmark exercise if it was marked complete
      if (wasExerciseComplete && onExerciseComplete) {
        onExerciseComplete(sectionIndex, exerciseIdx, false);
      }

      lastCompletedRef.current = null;
    }

    setCurrentExerciseIndex((prevIdx) => {
      const newIdx = Math.max(0, prevIdx - 1);
      const prevExercise = config.exercises[newIdx];

      setCurrentSet(1);
      setBilateralSide(1);
      setBidirectionalDirection(1);
      setPhase("active");
      setRestContext(null);

      if (prevExercise) {
        let duration = prevExercise.workDuration;
        if (prevExercise.isBilateral) {
          duration = Math.floor(prevExercise.workDuration / 2);
        }
        // For bidirectional, duration is full workDuration per direction
        setTimeRemaining(duration);
      }

      return newIdx;
    });
  }, [
    config.exercises,
    currentExerciseIndex,
    phase,
    sectionIndex,
    onSetComplete,
    onExerciseComplete,
  ]);

  // Skip current phase
  const handleSkip = useCallback(() => {
    // If skipping during active phase (before rest), mark current set/exercise as incomplete
    if (phase === "active" && sectionIndex !== undefined) {
      const exerciseIdx =
        config.exercises[currentExerciseIndex]?.exerciseIndex ??
        currentExerciseIndex;
      const setIdx = currentSet - 1; // Convert to 0-based

      // Track that this set was skipped (for round detection)
      if (!skippedSetsRef.current.has(setIdx)) {
        skippedSetsRef.current.set(setIdx, new Set());
      }
      skippedSetsRef.current.get(setIdx)?.add(exerciseIdx);

      // Mark set as incomplete
      if (onSetComplete) {
        onSetComplete(sectionIndex, exerciseIdx, setIdx, false);
      }

      // Mark exercise as incomplete if it was complete
      if (onExerciseComplete) {
        onExerciseComplete(sectionIndex, exerciseIdx, false);
      }

      lastCompletedRef.current = null;
    }

    setTimeRemaining(0);
  }, [
    phase,
    sectionIndex,
    currentExerciseIndex,
    currentSet,
    config.exercises,
    onSetComplete,
    onExerciseComplete,
  ]);

  // Removed handleRestartRound and handleAdvanceRound - unused functions with no UI wiring
  // If these features are needed in the future, they should be wired to UI controls

  // Restart timer from beginning
  const handleRestart = useCallback(() => {
    setPhase("setup");
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setBilateralSide(1);
    setBidirectionalDirection(1);
    setTimeRemaining(config.setupDuration);
    setRestContext(null);
    setIsPaused(true);
    readySoundPlayedRef.current = false;
    pendingStartSoundRef.current = false;
    // Reset round tracking
    setCurrentRound(1);
    setCompletedRounds([]);
    setIsRoundCooldown(false);
    skippedSetsRef.current.clear();
    onRoundCooldownChange?.(false);
    onRoundInfoChange?.(null);
  }, [config.setupDuration, onRoundCooldownChange, onRoundInfoChange]);

  // Stop timer and exit Play Mode
  const handleStop = useCallback(() => {
    // Reset timer state
    setPhase("setup");
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setBilateralSide(1);
    setBidirectionalDirection(1);
    setTimeRemaining(config.setupDuration);
    setRestContext(null);
    setIsPaused(true);
    readySoundPlayedRef.current = false;
    pendingStartSoundRef.current = false;
    // Reset round tracking
    setCurrentRound(1);
    setCompletedRounds([]);
    setIsRoundCooldown(false);
    skippedSetsRef.current.clear();
    onRoundCooldownChange?.(false);
    onRoundInfoChange?.(null);
    // Notify parent to exit Play Mode
    onStop?.();
  }, [config.setupDuration, onStop, onRoundCooldownChange, onRoundInfoChange]);

  // Circuit mode: handle stopping active phase (triggers rest)
  const handleCircuitStop = useCallback(() => {
    if (mode === "circuit" && phase === "active") {
      setRestContext("between-exercises");
      setPhase("rest");
      setTimeRemaining(0); // Reset for rest stopwatch
      playComplete();
      vibrate([100, 50, 100]);
    }
  }, [mode, phase, playComplete, vibrate]);

  // Circuit mode: handle starting from rest (advance to next exercise)
  const handleCircuitStart = useCallback(() => {
    if (mode === "circuit" && phase === "rest") {
      // Move to next exercise
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSet(1);
        setBilateralSide(1);
        setBidirectionalDirection(1);
        setRestContext(null);
        setPhase("active");
        setTimeRemaining(0); // Reset stopwatch for active
        playStart();
        vibrate(100);
      } else {
        // All exercises complete - check if more rounds needed
        // For now, complete the section
        setPhase("complete");
        vibrate([200, 100, 200, 100, 200]);
        onSectionComplete?.();
      }
    }
  }, [
    mode,
    phase,
    currentExerciseIndex,
    totalExercises,
    playStart,
    vibrate,
    onSectionComplete,
  ]);

  // Handle play/pause - with circuit mode support
  const handlePlayPause = useCallback(() => {
    if (mode === "circuit") {
      if (phase === "active" && !isPaused) {
        // In circuit mode active, "pause" triggers rest
        handleCircuitStop();
      } else if (phase === "rest") {
        // In circuit mode rest, "play" advances to next exercise
        handleCircuitStart();
      } else {
        // Normal pause/unpause for setup phase
        setIsPaused(!isPaused);
      }
    } else {
      // Standard interval modes - just toggle pause
      setIsPaused(!isPaused);
    }
  }, [mode, phase, isPaused, handleCircuitStop, handleCircuitStart]);

  // Get phase duration
  const getPhaseDuration = useCallback(() => {
    if (!currentExercise) return 0;

    switch (phase) {
      case "setup":
        return config.setupDuration;
      case "active":
        let duration = currentExercise.workDuration;
        if (currentExercise.isBilateral) {
          duration = Math.floor(currentExercise.workDuration / 2);
        } else if (currentExercise.isBidirectional) {
          duration = currentExercise.workDuration;
        }
        return duration;
      case "rest":
        if (!currentExercise) return 0;
        return currentExercise.restDuration;
      default:
        return 0;
    }
  }, [phase, currentExercise, config]);

  // Calculate phase progress for circle indicator
  const totalPhaseDuration = getPhaseDuration();
  const phaseProgress =
    totalPhaseDuration > 0
      ? ((totalPhaseDuration - timeRemaining) / totalPhaseDuration) * 100
      : 0;
  const circumference = 2 * Math.PI * 90; // radius = 90 (same as SectionTimer)
  const strokeDashoffset =
    circumference - (phaseProgress / 100) * circumference;

  // Check if all exercises have completed/skipped the current set (for round detection)
  const checkRoundComplete = useCallback(
    (setNumber: number, currentExerciseIdx?: number): boolean => {
      if (!isSetCompleted || sectionIndex === undefined) {
        return false;
      }

      // Check if all exercises have either completed or skipped this set
      return config.exercises.every((ex) => {
        const exerciseIdx = ex.exerciseIndex;
        const setIdx = setNumber - 1; // Convert to 0-based

        // If this is the current exercise we just completed, consider it complete
        // (This handles the case where parent state hasn't updated yet)
        const isCurrentExercise =
          currentExerciseIdx !== undefined &&
          exerciseIdx === currentExerciseIdx;

        // Check if completed (or if this is the current exercise we just completed)
        const isCompleted =
          isCurrentExercise ||
          isSetCompleted(sectionIndex, exerciseIdx, setIdx);

        // Check if skipped
        const isSkipped =
          skippedSetsRef.current.get(setIdx)?.has(exerciseIdx) ?? false;

        // Also check if exercise has this set (for unequal sets)
        const hasThisSet = ex.sets >= setNumber;

        // Round is complete for this exercise if: it doesn't have this set, or it's completed/skipped
        return !hasThisSet || isCompleted || isSkipped;
      });
    },
    [isSetCompleted, sectionIndex, config.exercises]
  );

  // Helper function to notify parent of exercise changes
  // Only called when exercise actually changes, not on every render
  const notifyExerciseChange = useCallback(
    (exerciseIndex: number, isRoundTransition: boolean = false) => {
      // Don't notify on round transitions - global position should remain stable
      if (isRoundTransition) {
        return;
      }

      // Only notify if we haven't already notified for this index
      if (lastNotifiedExerciseIndexRef.current !== exerciseIndex) {
        onCurrentExerciseChange?.(exerciseIndex);
        lastNotifiedExerciseIndexRef.current = exerciseIndex;
      }
    },
    [onCurrentExerciseChange]
  );

  // Handle phase transitions
  const advancePhase = useCallback(() => {
    if (!currentExercise) {
      setPhase("complete");
      return;
    }

    switch (phase) {
      case "setup":
        setPhase("active");
        setTimeRemaining(getPhaseDuration());
        vibrate(100);
        // Stop ready sound if still playing
        if (readySound && readySound.playing()) {
          readySound.stop();
        }
        // Try to play start sound immediately, or mark as pending if not ready
        if (startSound) {
          playStart();
          pendingStartSoundRef.current = false;
        } else {
          pendingStartSoundRef.current = true;
        }
        // Notify parent when timer starts (first exercise)
        if (currentExerciseIndex === 0 && currentSet === 1) {
          notifyExerciseChange(0, false);
        }
        break;

      case "active":
        // Check if bilateral and need to switch to other side
        if (currentExercise.isBilateral && bilateralSide === 1) {
          setBilateralSide(2);
          const sideDuration = Math.floor(currentExercise.workDuration / 2);
          setTimeRemaining(sideDuration);
          vibrate([100, 50, 100, 50, 100]);
        } else if (
          currentExercise.isBidirectional &&
          bidirectionalDirection === 1
        ) {
          setBidirectionalDirection(2);
          setTimeRemaining(currentExercise.workDuration);
          vibrate([100, 50, 100, 50, 100]);
        } else {
          // Determine progression based on timer mode
          const isCircuitProgression =
            mode === "circuit" || mode === "interval-circuit";

          if (isCircuitProgression) {
            // Circuit/Interval-Circuit: After 1 set, move to next exercise (or loop back)
            // Mark current set and exercise as complete before checking round completion
            if (onSetComplete && sectionIndex !== undefined) {
              const exerciseIdx =
                config.exercises[currentExerciseIndex]?.exerciseIndex ??
                currentExerciseIndex;
              const setIdx = currentSet - 1; // Convert to 0-based
              onSetComplete(sectionIndex, exerciseIdx, setIdx, true);
              lastCompletedRef.current = {
                exerciseIdx,
                setIdx,
                wasExerciseComplete: true,
              };
            }
            if (onExerciseComplete && sectionIndex !== undefined) {
              const exerciseIdx =
                config.exercises[currentExerciseIndex]?.exerciseIndex ??
                currentExerciseIndex;
              onExerciseComplete(sectionIndex, exerciseIdx, true);
            }

            // Check if round is complete BEFORE deciding what to do next
            // Note: We just marked the current set/exercise as complete above, so we need to
            // account for that when checking round completion. Pass the current exercise index
            // so checkRoundComplete can consider it as complete even if parent state hasn't updated yet
            const maxSets = Math.max(...config.exercises.map((e) => e.sets), 1);

            // Check round completion - pass current exercise index to account for the set we just completed
            const currentExerciseIdx =
              config.exercises[currentExerciseIndex]?.exerciseIndex ??
              currentExerciseIndex;
            const roundComplete = checkRoundComplete(
              currentSet,
              currentExerciseIdx
            );

            // Priority 1: If round is complete and there are more rounds, trigger cooldown
            // This check must happen first, regardless of which exercise we're on
            if (roundComplete && currentSet < maxSets) {
              // Round complete - trigger round cooldown immediately
              setIsRoundCooldown(true);
              setCompletedRounds((prev) => [...prev, currentRound]);
              const nextRound = currentRound + 1;
              setCurrentRound(nextRound);
              // Clear skipped sets for completed round
              skippedSetsRef.current.delete(currentSet - 1);

              // Get exercises for next round (only those with remaining sets)
              const nextRoundExercises = config.exercises.filter(
                (ex) => ex.sets >= currentSet + 1
              );

              // Notify parent of round cooldown with initial timer state
              onRoundCooldownChange?.(true, {
                currentRound: nextRound,
                totalRounds,
                completedRounds: [...completedRounds, currentRound],
                nextRoundExercises,
                timeRemaining: config.cooldownDuration || 60,
                isPaused,
              });

              setPhase("cooldown");
              setTimeRemaining(config.cooldownDuration || 60);
              vibrate([200, 100, 200, 100, 200]);
              playCooldown();
            } else if (currentExerciseIndex < totalExercises - 1) {
              // Priority 2: More exercises in this round - move to next exercise
              // Only proceed if round is NOT complete (otherwise we would have triggered cooldown above)
              // Check if active transition mode (skip rest)
              if (currentExercise.transitionMode === "active") {
                // Active transition - go directly to next exercise
                // NOTE: In circuit/interval-circuit mode, do NOT reset currentSet - all exercises
                // in a round maintain the same set number (e.g., all do set 1 in round 1)
                const nextIdx = currentExerciseIndex + 1;
                const nextEx = config.exercises[nextIdx];
                setCurrentExerciseIndex(nextIdx);
                setBilateralSide(1);
                setBidirectionalDirection(1);
                setRestContext(null);
                setPhase("active");
                let duration = nextEx.workDuration;
                if (nextEx.isBilateral) {
                  duration = Math.floor(nextEx.workDuration / 2);
                } else if (nextEx.isBidirectional) {
                  duration = nextEx.workDuration;
                }
                setTimeRemaining(duration);
                vibrate(100);
                playStart();
                // Notify parent of exercise change
                notifyExerciseChange(nextIdx, false);
              } else {
                // Rest transition - show rest countdown
                setRestContext("between-exercises");
                setPhase("rest");
                setTimeRemaining(currentExercise.restDuration);
                vibrate([100, 50, 100]);
                playComplete();
              }
            } else {
              // Priority 3: Completed last exercise in this round
              // If round is complete, we should have triggered cooldown above
              // If we reach here, round is not complete yet but we need to loop back for more rounds
              if (currentSet < maxSets) {
                // More rounds needed but round not complete yet - continue to rest
                // This is a round transition - don't notify parent (global position stays stable)
                // Check if active transition mode (skip rest)
                if (currentExercise.transitionMode === "active") {
                  // Active transition - go directly to first exercise of next round
                  const firstEx = config.exercises[0];
                  setCurrentExerciseIndex(0);
                  setCurrentSet((prev) => prev + 1);
                  setBilateralSide(1);
                  setBidirectionalDirection(1);
                  setRestContext(null);
                  setPhase("active");
                  let duration = firstEx.workDuration;
                  if (firstEx.isBilateral) {
                    duration = Math.floor(firstEx.workDuration / 2);
                  } else if (firstEx.isBidirectional) {
                    duration = firstEx.workDuration;
                  }
                  setTimeRemaining(duration);
                  vibrate(100);
                  playStart();
                  // NOTE: Intentionally not calling notifyExerciseChange here for round transitions.
                  // The comment on line 771 states "don't notify parent (global position stays stable)"
                  // for round transitions. Additionally, the feature to skip rest between rounds is not
                  // yet implemented. When that feature is added, we may need to reconsider notification
                  // behavior for active round transitions.
                } else {
                  // Rest transition - show rest countdown
                  setCurrentExerciseIndex(0);
                  setCurrentSet((prev) => prev + 1);
                  setBilateralSide(1);
                  setBidirectionalDirection(1);
                  setRestContext("between-exercises");
                  setPhase("rest");
                  setTimeRemaining(currentExercise.restDuration);
                  vibrate([100, 50, 100]);
                  playComplete();
                }
                // Reset notification tracking for new round
                lastNotifiedExerciseIndexRef.current = null;
              } else {
                // All rounds complete - mark final set and exercise
                if (onSetComplete && sectionIndex !== undefined) {
                  const exerciseIdx =
                    config.exercises[currentExerciseIndex]?.exerciseIndex ??
                    currentExerciseIndex;
                  const setIdx = currentSet - 1; // Convert to 0-based
                  onSetComplete(sectionIndex, exerciseIdx, setIdx, true);
                }
                if (onExerciseComplete && sectionIndex !== undefined) {
                  const exerciseIdx =
                    config.exercises[currentExerciseIndex]?.exerciseIndex ??
                    currentExerciseIndex;
                  onExerciseComplete(sectionIndex, exerciseIdx, true);
                }
                // Check if cooldown is configured
                if (config.cooldownDuration && config.cooldownDuration > 0) {
                  setPhase("cooldown");
                  setTimeRemaining(config.cooldownDuration);
                  vibrate([200, 100, 200, 100, 200]);
                  playCooldown();
                } else {
                  // No cooldown - section complete
                  setPhase("complete");
                  vibrate([200, 100, 200, 100, 200]);
                  onSectionComplete?.();
                }
              }
            }
          } else {
            // Interval mode: Complete all sets of current exercise before moving to next
            if (currentSet < currentExercise.sets) {
              // More sets remaining - go to rest between sets
              // Mark current set as complete
              if (onSetComplete && sectionIndex !== undefined) {
                const exerciseIdx =
                  config.exercises[currentExerciseIndex]?.exerciseIndex ??
                  currentExerciseIndex;
                const setIdx = currentSet - 1; // Convert to 0-based
                onSetComplete(sectionIndex, exerciseIdx, setIdx, true);
              }
              const restBetweenSets = currentExercise.restDuration ?? 15;
              setRestContext("between-sets");
              setPhase("rest");
              setTimeRemaining(restBetweenSets);
              vibrate([100, 50, 100]);
              playComplete();
            } else {
              // All sets of this exercise complete
              // Mark final set and exercise as complete
              if (onSetComplete && sectionIndex !== undefined) {
                const exerciseIdx =
                  config.exercises[currentExerciseIndex]?.exerciseIndex ??
                  currentExerciseIndex;
                const setIdx = currentSet - 1; // Convert to 0-based
                onSetComplete(sectionIndex, exerciseIdx, setIdx, true);
                lastCompletedRef.current = {
                  exerciseIdx,
                  setIdx,
                  wasExerciseComplete: true,
                };
              }
              if (onExerciseComplete && sectionIndex !== undefined) {
                const exerciseIdx =
                  config.exercises[currentExerciseIndex]?.exerciseIndex ??
                  currentExerciseIndex;
                onExerciseComplete(sectionIndex, exerciseIdx, true);
              }
              if (currentExerciseIndex < totalExercises - 1) {
                // More exercises - check if active transition mode
                if (currentExercise.transitionMode === "active") {
                  // Active transition - go directly to next exercise
                  // NOTE: In circuit/interval-circuit mode, do NOT reset currentSet - all exercises
                  // in a round maintain the same set number (e.g., all do set 1 in round 1)
                  const nextIdx = currentExerciseIndex + 1;
                  const nextEx = config.exercises[nextIdx];
                  setCurrentExerciseIndex(nextIdx);
                  setBilateralSide(1);
                  setBidirectionalDirection(1);
                  setRestContext(null);
                  setPhase("active");
                  let duration = nextEx.workDuration;
                  if (nextEx.isBilateral) {
                    duration = Math.floor(nextEx.workDuration / 2);
                  } else if (nextEx.isBidirectional) {
                    duration = nextEx.workDuration;
                  }
                  setTimeRemaining(duration);
                  vibrate(100);
                  playStart();
                  // Notify parent of exercise change
                  notifyExerciseChange(nextIdx, false);
                } else {
                  // Rest transition - show rest BEFORE next exercise
                  setRestContext("between-exercises");
                  setPhase("rest");
                  setTimeRemaining(currentExercise.restDuration);
                  vibrate([100, 50, 100]);
                  playComplete();
                }
              } else {
                // All exercises complete - check if cooldown is configured
                if (config.cooldownDuration && config.cooldownDuration > 0) {
                  setPhase("cooldown");
                  setTimeRemaining(config.cooldownDuration);
                  vibrate([200, 100, 200, 100, 200]);
                  playCooldown();
                } else {
                  // No cooldown - section complete
                  setPhase("complete");
                  vibrate([200, 100, 200, 100, 200]);
                  onSectionComplete?.();
                }
              }
            }
          }
        }
        break;

      case "rest":
        // Use restContext to determine next action
        if (restContext === "between-sets") {
          // Rest between sets - start next set of current exercise
          setCurrentSet((prev) => prev + 1);
          setBilateralSide(1);
          setBidirectionalDirection(1);
          setRestContext(null);
          setPhase("active");
          setTimeRemaining(getPhaseDuration());
          vibrate(100);
          playStart();
        } else if (restContext === "between-exercises") {
          // Rest between exercises - move to next exercise's active phase
          // In interval-circuit mode, skip exercises that don't have remaining sets
          if (mode === "interval-circuit") {
            // Find next exercise with remaining sets
            const nextSet = currentSet;
            let nextIdx = currentExerciseIndex + 1;
            while (nextIdx < totalExercises) {
              const nextEx = config.exercises[nextIdx];
              if (nextEx.sets >= nextSet) {
                // Found exercise with remaining sets - move to it
                setCurrentExerciseIndex(nextIdx);
                setCurrentSet(nextSet);
                setBilateralSide(1);
                setBidirectionalDirection(1);
                setRestContext(null);
                setPhase("active");
                let duration = nextEx.workDuration;
                if (nextEx.isBilateral) {
                  duration = Math.floor(nextEx.workDuration / 2);
                } else if (nextEx.isBidirectional) {
                  duration = nextEx.workDuration;
                }
                setTimeRemaining(duration);
                vibrate(100);
                playStart();
                // Notify parent of exercise change (same round, different exercise)
                notifyExerciseChange(nextIdx, false);
                return;
              }
              nextIdx++;
            }
            // No more exercises with remaining sets in current round
            // Round completion should have been checked before entering rest phase
            // If we get here, it means we're looping back to start of next round
            // This should not happen if round detection is working correctly
          } else {
            // Non-interval-circuit mode - normal progression
            if (currentExerciseIndex < totalExercises - 1) {
              const nextIdx = currentExerciseIndex + 1;
              const nextEx = config.exercises[nextIdx];
              setCurrentExerciseIndex(nextIdx);
              setCurrentSet(1);
              setBilateralSide(1);
              setBidirectionalDirection(1);
              setRestContext(null);
              setPhase("active");
              // Calculate duration for next exercise
              let duration = nextEx.workDuration;
              if (nextEx.isBilateral) {
                duration = Math.floor(nextEx.workDuration / 2);
              } else if (nextEx.isBidirectional) {
                duration = nextEx.workDuration;
              }
              setTimeRemaining(duration);
              vibrate(100);
              playStart();
              // Notify parent of exercise change
              notifyExerciseChange(nextIdx, false);
            }
          }
        }
        break;

      case "cooldown":
        // Cooldown complete
        if (isRoundCooldown) {
          // Round cooldown complete - notify parent first
          onRoundCooldownChange?.(false);

          // Round cooldown complete - start next round
          setIsRoundCooldown(false);

          // Find first exercise with remaining sets for next round
          const nextSet = currentSet + 1;
          const firstExerciseWithSets = config.exercises.findIndex(
            (ex) => ex.sets >= nextSet
          );

          if (firstExerciseWithSets >= 0) {
            setCurrentExerciseIndex(firstExerciseWithSets);
            setCurrentSet(nextSet);
            setBilateralSide(1);
            setBidirectionalDirection(1);
            setRestContext(null);
            setPhase("active");
            // Get first exercise for next round
            const firstExercise = config.exercises[firstExerciseWithSets];
            if (firstExercise) {
              let duration = firstExercise.workDuration;
              if (firstExercise.isBilateral) {
                duration = Math.floor(firstExercise.workDuration / 2);
              }
              setTimeRemaining(duration);
            }
            vibrate(100);
            playStart();
            // Notify parent of new round start - reset exercise position to first exercise of new round
            notifyExerciseChange(firstExerciseWithSets, false);
          } else {
            // No more exercises with remaining sets - section complete
            setPhase("complete");
            vibrate([200, 100, 200, 100, 200]);
            onSectionComplete?.();
          }
        } else {
          // Final cooldown complete - section is done
          setPhase("complete");
          vibrate([200, 100, 200, 100, 200]);
          onSectionComplete?.();
        }
        break;

      default:
        break;
    }
  }, [
    mode,
    phase,
    currentExercise,
    currentSet,
    bilateralSide,
    bidirectionalDirection,
    currentExerciseIndex,
    totalExercises,
    config,
    getPhaseDuration,
    vibrate,
    onSectionComplete,
    restContext,
    playStart,
    playComplete,
    playCooldown,
    readySound,
    startSound,
    onSetComplete,
    onExerciseComplete,
    sectionIndex,
    isRoundCooldown,
    checkRoundComplete,
    currentRound,
    totalRounds,
    isPaused, // Required: used in onRoundCooldownChange callback at line 766
    onRoundCooldownChange,
    completedRounds,
    notifyExerciseChange,
  ]);

  // Update time remaining when exercise changes
  useEffect(() => {
    if (phase === "active" && currentExercise) {
      let duration = currentExercise.workDuration;
      if (currentExercise.isBilateral) {
        duration = Math.floor(currentExercise.workDuration / 2);
      } else if (currentExercise.isBidirectional) {
        duration = currentExercise.workDuration;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeRemaining(duration);
    }
  }, [currentExerciseIndex, phase, currentExercise]);

  // Handle shouldStart prop to start the timer
  useEffect(() => {
    if (shouldStart && !prevShouldStartRef.current && isPaused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPaused(false);
      prevShouldStartRef.current = true;
      onStartComplete?.();
    } else if (!shouldStart) {
      prevShouldStartRef.current = false;
    }
  }, [shouldStart, isPaused, onStartComplete]);

  // Handle shouldPause prop to pause the timer
  useEffect(() => {
    if (shouldPause && !prevShouldPauseRef.current && !isPaused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPaused(true);
      prevShouldPauseRef.current = true;
      onPauseComplete?.();
    } else if (!shouldPause) {
      prevShouldPauseRef.current = false;
    }
  }, [shouldPause, isPaused, onPauseComplete]);

  // Reset sound played flags when entering setup phase
  useEffect(() => {
    if (phase === "setup") {
      readySoundPlayedRef.current = false;
      pendingStartSoundRef.current = false;
    }
  }, [phase]);

  // Play pending start sound when startSound becomes available (for Set 1 of 1)
  useEffect(() => {
    if (
      pendingStartSoundRef.current &&
      startSound &&
      phase === "active" &&
      currentSet === 1 &&
      currentExerciseIndex === 0
    ) {
      playStart();
      pendingStartSoundRef.current = false;
    }
  }, [startSound, phase, currentSet, currentExerciseIndex, playStart]);

  // Notify parent when timer state changes
  // Only report false on complete - pause maintains Play Mode
  useEffect(() => {
    if (phase === "complete") {
      onTimerStateChange?.(false);
    } else if (!isPaused) {
      onTimerStateChange?.(true);
    }
    // Don't call with false on pause - let Play Mode persist
  }, [isPaused, phase, onTimerStateChange]);

  // Sync round cooldown timer state with parent
  // Notify on cooldown start, pause state changes, AND every second for timeRemaining updates
  const prevRoundCooldownStateRef = useRef<{
    isActive: boolean;
    isPaused: boolean;
    lastSyncedTime: number | null;
  } | null>(null);

  useEffect(() => {
    if (isRoundCooldown && phase === "cooldown" && onRoundCooldownChange) {
      const prevState = prevRoundCooldownStateRef.current;

      // Check if state changed (cooldown started or pause toggled)
      const stateChanged =
        !prevState ||
        prevState.isActive !== true ||
        prevState.isPaused !== isPaused;

      // Check if timeRemaining changed (for countdown display sync)
      const timeChanged = prevState?.lastSyncedTime !== timeRemaining;

      // Sync if state changed OR time changed (throttled to whole seconds)
      if (stateChanged || timeChanged) {
        prevRoundCooldownStateRef.current = {
          isActive: true,
          isPaused,
          lastSyncedTime: timeRemaining,
        };
        // Notify parent of timer state changes during round cooldown
        onRoundCooldownChange(true, {
          currentRound,
          totalRounds,
          completedRounds,
          nextRoundExercises: config.exercises.filter(
            (ex) => ex.sets >= currentSet + 1
          ),
          timeRemaining,
          isPaused,
        });
      }
    } else if (!isRoundCooldown || phase !== "cooldown") {
      // Reset tracking when cooldown ends
      prevRoundCooldownStateRef.current = null;
    }
  }, [
    isRoundCooldown,
    phase,
    isPaused,
    timeRemaining, // Now included to sync countdown display
    currentRound,
    totalRounds,
    completedRounds,
    currentSet,
    config.exercises,
    onRoundCooldownChange,
  ]);

  // Sync section cooldown timer state with parent (for final section cooldowns, not round cooldowns)
  useEffect(() => {
    if (phase === "cooldown" && !isRoundCooldown && onSectionCooldownChange) {
      // Notify parent of timer state changes during section cooldown
      onSectionCooldownChange(true, {
        timeRemaining,
        isPaused,
      });
    } else if (phase !== "cooldown" && onSectionCooldownChange) {
      // Notify parent when cooldown ends
      onSectionCooldownChange(false);
    }
  }, [
    phase,
    isRoundCooldown,
    timeRemaining,
    isPaused,
    onSectionCooldownChange,
  ]);

  // Timer countdown (or count UP for stopwatch/circuit mode)
  useEffect(() => {
    if (isPaused || phase === "complete") return;

    // In stopwatch mode (circuit), count UP during active phase
    // Rest is manual - user controls when to proceed
    if (isStopwatch && phase === "active") {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }

    // In stopwatch mode with manual rest, don't auto-advance from rest
    if (isStopwatch && phase === "rest") {
      // Just count up the rest time for tracking
      const interval = setInterval(() => {
        setTimeRemaining((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }

    // Standard countdown mode (interval or interval-circuit)
    if (timeRemaining <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      advancePhase();
      return;
    }

    // Play ready sound when 3 seconds remain on setup timer (max 3s duration, so it finishes before start.wav)
    if (
      phase === "setup" &&
      timeRemaining === 3 &&
      !readySoundPlayedRef.current
    ) {
      playReady();
      readySoundPlayedRef.current = true;
    }

    // Warning vibration
    if (timeRemaining === 3 && phase === "active") {
      vibrate(50);
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [
    timeRemaining,
    isPaused,
    phase,
    advancePhase,
    vibrate,
    config.setupDuration,
    playReady,
    isStopwatch,
  ]);

  // Calculate overall progress
  const calculateProgress = useCallback(() => {
    const intervals: Array<{ duration: number }> = [];

    config.exercises.forEach((exercise) => {
      // Add setup duration only for first exercise
      if (intervals.length === 0) {
        intervals.push({ duration: config.setupDuration });
      }

      // Add work intervals for each set
      for (let set = 1; set <= exercise.sets; set++) {
        const workDuration = exercise.workDuration;
        if (exercise.isBilateral) {
          intervals.push({ duration: Math.floor(workDuration / 2) });
          intervals.push({ duration: Math.floor(workDuration / 2) });
        } else if (exercise.isBidirectional) {
          intervals.push({ duration: workDuration });
          intervals.push({ duration: workDuration });
        } else {
          intervals.push({ duration: workDuration });
        }

        // Add rest between sets (except after last set)
        if (set < exercise.sets) {
          const restBetweenSets = exercise.restDuration ?? 15;
          intervals.push({ duration: restBetweenSets });
        }
      }

      // Add rest between exercises (except after last exercise)
      if (exercise !== config.exercises[config.exercises.length - 1]) {
        intervals.push({ duration: exercise.restDuration });
      }
    });

    // Add cooldown if configured
    if (config.cooldownDuration && config.cooldownDuration > 0) {
      intervals.push({ duration: config.cooldownDuration });
    }

    const totalDuration = intervals.reduce((sum, i) => sum + i.duration, 0);

    // Calculate elapsed time
    let elapsed = 0;

    // Count completed exercises
    for (let i = 0; i < currentExerciseIndex; i++) {
      const exercise = config.exercises[i];
      // Setup only for first exercise
      if (i === 0) {
        elapsed += config.setupDuration;
      }

      for (let set = 1; set <= exercise.sets; set++) {
        const workDuration = exercise.workDuration;
        if (exercise.isBilateral) {
          elapsed += Math.floor(workDuration / 2);
          elapsed += Math.floor(workDuration / 2);
        } else if (exercise.isBidirectional) {
          elapsed += workDuration;
          elapsed += workDuration;
        } else {
          elapsed += workDuration;
        }

        if (set < exercise.sets) {
          const restBetweenSets = exercise.restDuration ?? 15;
          elapsed += restBetweenSets;
        }
      }

      if (i < config.exercises.length - 1) {
        elapsed += exercise.restDuration;
      }
    }

    // Add current exercise progress
    if (currentExercise) {
      // Setup only for first exercise
      if (currentExerciseIndex === 0) {
        if (phase === "setup") {
          elapsed += config.setupDuration - timeRemaining;
        } else {
          elapsed += config.setupDuration; // Setup completed
        }
      }

      if (phase === "active") {
        for (let set = 1; set < currentSet; set++) {
          const workDuration = currentExercise.workDuration;
          if (currentExercise.isBilateral) {
            elapsed += Math.floor(workDuration / 2);
            elapsed += Math.floor(workDuration / 2);
          } else if (currentExercise.isBidirectional) {
            elapsed += workDuration;
            elapsed += workDuration;
          } else {
            elapsed += workDuration;
          }
          if (set < currentExercise.sets) {
            const restBetweenSets = currentExercise.restDuration ?? 15;
            elapsed += restBetweenSets;
          }
        }
        // Add current set progress
        if (currentExercise.isBilateral) {
          const sideDuration = Math.floor(currentExercise.workDuration / 2);
          if (bilateralSide === 1) {
            // On first side
            elapsed += sideDuration - timeRemaining;
          } else {
            // On second side - first side is complete
            elapsed += sideDuration; // First side completed
            elapsed += sideDuration - timeRemaining; // Current side progress
          }
        } else if (currentExercise.isBidirectional) {
          const directionDuration = currentExercise.workDuration;
          if (bidirectionalDirection === 1) {
            // On first direction
            elapsed += directionDuration - timeRemaining;
          } else {
            // On second direction - first direction is complete
            elapsed += directionDuration; // First direction completed
            elapsed += directionDuration - timeRemaining; // Current direction progress
          }
        } else {
          elapsed += currentExercise.workDuration - timeRemaining;
        }
      } else if (phase === "rest") {
        // Setup already added above if this is the first exercise
        for (let set = 1; set <= currentSet; set++) {
          const workDuration = currentExercise.workDuration;
          if (currentExercise.isBilateral) {
            elapsed += Math.floor(workDuration / 2);
            elapsed += Math.floor(workDuration / 2);
          } else if (currentExercise.isBidirectional) {
            elapsed += workDuration;
            elapsed += workDuration;
          } else {
            elapsed += workDuration;
          }
          if (set < currentExercise.sets) {
            const restBetweenSets = currentExercise.restDuration ?? 15;
            elapsed += restBetweenSets;
          }
        }
        const restDuration =
          restContext === "between-sets"
            ? (currentExercise.restDuration ?? 15)
            : currentExercise.restDuration;
        elapsed += restDuration - timeRemaining;
      } else if (phase === "cooldown") {
        // All exercises done, just cooldown remaining
        elapsed = totalDuration - timeRemaining;
      }
    }

    return totalDuration > 0
      ? Math.min(100, (elapsed / totalDuration) * 100)
      : 0;
  }, [
    config,
    currentExerciseIndex,
    currentExercise,
    currentSet,
    phase,
    timeRemaining,
    restContext,
    bilateralSide,
    bidirectionalDirection,
  ]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get phase label
  const getPhaseLabel = () => {
    switch (phase) {
      case "setup":
        return "Setup";
      case "active":
        return "Work";
      case "rest":
        return "Rest";
      case "cooldown":
        return "Cooldown";
      case "complete":
        return "Complete";
      default:
        return "";
    }
  };

  // Get phase badge variant
  const getPhaseBadgeVariant = () => {
    switch (phase) {
      case "setup":
        return "secondary";
      case "active":
        return "default";
      case "rest":
        return "outline";
      case "cooldown":
        return "secondary";
      case "complete":
        return "default";
      default:
        return "secondary";
    }
  };

  const progress = calculateProgress();

  // Preview logic based on mode
  // - Interval: same exercise if more sets, otherwise next exercise
  // - Circuit/Interval+Circuit: ALWAYS next exercise
  // Uses exercisePosition prop to determine next exercise for display (source of truth)
  const getExercisePreview = () => {
    if (mode === "interval") {
      // In interval mode, show next set of same exercise, or next exercise if last set
      if (currentSet < (currentExercise?.sets || 1)) {
        return currentExercise?.exerciseName || "Starting...";
      }
      // Calculate next exercise based on exercisePosition prop
      if (
        typeof exercisePosition === "number" &&
        typeof navTotalExercises === "number"
      ) {
        const nextPos = exercisePosition + 1;
        if (nextPos <= navTotalExercises) {
          const nextEx = config.exercises[nextPos - 1]; // Convert 1-based to 0-based index
          return nextEx
            ? `Next: ${nextEx.exerciseName}`
            : currentExercise?.exerciseName || "Complete";
        }
        return currentExercise?.exerciseName || "Complete";
      }
      // Fallback to nextExercise derived from currentExerciseIndex
      return nextExercise
        ? `Next: ${nextExercise.exerciseName}`
        : currentExercise?.exerciseName || "Complete";
    }
    // Circuit or interval-circuit: always preview next exercise based on exercisePosition
    if (
      typeof exercisePosition === "number" &&
      typeof navTotalExercises === "number"
    ) {
      const nextPos = exercisePosition + 1;
      if (nextPos <= navTotalExercises) {
        const nextEx = config.exercises[nextPos - 1]; // Convert 1-based to 0-based index
        return nextEx
          ? `Next: ${nextEx.exerciseName}`
          : currentExercise?.exerciseName || "Complete";
      }
      // At the end, show current exercise or "Complete"
      return currentExercise?.exerciseName || "Complete";
    }
    // Fallback to nextExercise derived from currentExerciseIndex
    return nextExercise
      ? `Next: ${nextExercise.exerciseName}`
      : currentExercise?.exerciseName || "Complete";
  };

  // Position display based on mode
  // - Interval: "Set X of Y" (sets within current exercise)
  // - Circuit/Interval+Circuit: "X of Y" (exercise position in circuit)
  // Uses exercisePosition prop (from WorkoutPlayer) as the source of truth for display
  const getPositionDisplay = () => {
    if (mode === "interval") {
      return currentExercise
        ? `Set ${currentSet} of ${currentExercise.sets}`
        : "";
    }
    // Circuit modes: show exercise position using prop (source of truth)
    if (
      typeof exercisePosition === "number" &&
      typeof navTotalExercises === "number"
    ) {
      return `${exercisePosition} of ${navTotalExercises}`;
    }
    // Fallback to internal state if prop not available (shouldn't happen in normal flow)
    return `${currentExerciseIndex + 1} of ${totalExercises}`;
  };

  const exercisePreview = getExercisePreview();
  const positionDisplay = getPositionDisplay();

  const canGoBack = !(currentExerciseIndex === 0 && phase === "setup");

  // Notify parent when round info changes
  useEffect(() => {
    if (onRoundInfoChange) {
      // Only notify in interval-circuit mode
      if (mode === "interval-circuit") {
        onRoundInfoChange({
          currentRound,
          totalRounds,
        });
      } else {
        onRoundInfoChange(null);
      }
    }
  }, [currentRound, totalRounds, mode, onRoundInfoChange]);

  // Initialize round info when timer starts (phase changes from setup to active)
  useEffect(() => {
    if (
      phase === "active" &&
      mode === "interval-circuit" &&
      onRoundInfoChange
    ) {
      onRoundInfoChange({
        currentRound,
        totalRounds,
      });
    }
  }, [phase, mode, currentRound, totalRounds, onRoundInfoChange]);

  // Notify parent when phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // Don't render UI when complete - but hooks must still run above
  if (phase === "complete") {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "p-4 border-t border-border bg-card",
          variant === "fixed" &&
            "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm",
          className
        )}
      >
        {/* Row 1: Timer Info and Main Controls */}
        <div className="flex flex-wrap flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-3 relative">
          {/* Left: Timer Info */}
          <div className="w-full sm:w-auto sm:flex-1 min-w-0 order-1 sm:order-none">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={getPhaseBadgeVariant()}
                      className="text-xs cursor-help"
                    >
                      {getPhaseLabel()}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Current timer phase</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenFullScreen}
                      className="h-8 px-2"
                      aria-label="Open full-screen timer view"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Open full-screen timer view</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={autoScrollEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => onAutoScrollChange?.(!autoScrollEnabled)}
                      className="h-8 px-2"
                      aria-label={
                        autoScrollEnabled
                          ? "Disable auto-scroll"
                          : "Enable auto-scroll"
                      }
                    >
                      <ScrollText className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Auto-scroll to current exercise</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-semibold truncate cursor-help">
                    {exercisePreview}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Next exercise in queue</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground cursor-help">
                    • {positionDisplay}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Your position in the circuit</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Center: Circular Progress Indicator (absolutely centered) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 mx-auto sm:mx-0 mb-2 sm:mb-0 cursor-help order-2 sm:order-none flex flex-col items-center">
                <div className="relative w-16 h-16">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 200 200"
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-muted"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className={cn(
                        "transition-all duration-1000 ease-linear",
                        phase === "rest"
                          ? "text-muted-foreground"
                          : timeRemaining <= 5 && phase === "active"
                            ? "text-destructive"
                            : "text-primary"
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        timeRemaining <= 5 &&
                          phase === "active" &&
                          "text-destructive animate-pulse"
                      )}
                    >
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>
                {/* Interval Type Label */}
                {phase !== "cooldown" && (
                  <span className="text-xs font-medium text-muted-foreground mt-1">
                    {phase === "setup"
                      ? "Setup"
                      : phase === "active"
                        ? "Active"
                        : phase === "rest"
                          ? "Rest"
                          : ""}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Time remaining in current interval</p>
            </TooltipContent>
          </Tooltip>

          {/* Right: Timer Controls (centered) */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 justify-center order-3 sm:order-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestart}
                  className="h-8 px-3"
                  aria-label="Restart timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Restart timer from beginning</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={!canGoBack}
                  className="h-8 px-3"
                  aria-label="Back to previous exercise"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Go to previous exercise</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  className="h-8 w-8 p-0"
                  aria-label={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>
                  {isPaused
                    ? "Resume timer"
                    : "Pause timer (stays in Play Mode)"}
                </p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStop}
                  className="h-8 w-8 p-0"
                  aria-label="Stop timer"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Stop timer and exit Play Mode</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 px-3"
                  aria-label="Skip"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Skip to next interval</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Row 2: Progress Bar and Volume Controls */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-1 cursor-help">
                <Progress value={progress} className="h-2" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Overall section progress</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2 min-w-[140px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                  className="h-8 w-8 p-0"
                  aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isMuted ? "Unmute sound effects" : "Mute sound effects"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Slider
                    value={[volume * 100]}
                    onValueChange={(value) => setVolume(value[0] / 100)}
                    min={0}
                    max={100}
                    step={1}
                    disabled={isMuted}
                    className="cursor-pointer"
                    aria-label="Volume control"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Adjust sound volume</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Row 3: Timer Mode Selection */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground mr-2">Mode:</span>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === "interval" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange("interval")}
                  className="h-7 px-2 text-xs"
                >
                  Interval
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>
                  Complete all sets of each exercise before moving to the next
                </p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === "circuit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange("circuit")}
                  className="h-7 px-2 text-xs"
                >
                  Circuit
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>
                  Stopwatch mode - you control when to move to next exercise
                </p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === "interval-circuit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange("interval-circuit")}
                  className="h-7 px-2 text-xs"
                >
                  Both
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>
                  Timed intervals with circuit progression (1 set each, then
                  repeat)
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Row 4: Exercise Navigation (only when navigation props provided) */}
        {onPreviousExercise && onNextExercise && (
          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPreviousExercise}
                  disabled={isFirstExercise}
                  className="h-8 w-8 p-0"
                  aria-label="Previous exercise"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Go to previous exercise</p>
              </TooltipContent>
            </Tooltip>
            {/* Show Round Counter in interval-circuit mode, otherwise show exercise counter */}
            {mode === "interval-circuit" && currentRound > 0 ? (
              <span className="text-sm font-medium min-w-[100px] text-center text-yellow-400">
                Round {currentRound} of {totalRounds}
              </span>
            ) : (
              <span className="text-sm font-medium min-w-[60px] text-center">
                {typeof exercisePosition === "number" &&
                typeof navTotalExercises === "number"
                  ? `${exercisePosition} of ${navTotalExercises}`
                  : "—"}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNextExercise}
                  disabled={isLastExercise}
                  className="h-8 w-8 p-0"
                  aria-label="Next exercise"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Go to next exercise</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
