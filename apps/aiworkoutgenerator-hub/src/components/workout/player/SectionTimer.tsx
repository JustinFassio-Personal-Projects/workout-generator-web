"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Pause,
  Play,
  SkipForward,
  RefreshCw,
  CheckCircle2,
  SkipBack,
  Volume2,
  VolumeX,
} from "lucide-react";
import useSound from "use-sound";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type {
  SectionTimerConfig,
  ExerciseTimerConfig,
} from "@/types/ai-exercise-editor";

type TimerPhase = "setup" | "active" | "rest" | "cooldown" | "complete";

interface SectionTimerProps {
  config: SectionTimerConfig;
  safetyMode?: boolean;
  onSectionComplete: () => void;
  onExerciseComplete?: (exerciseIndex: number) => void;
  className?: string;
}

/**
 * Runs through all exercises in a section sequentially.
 * Handles setup, work, bilateral switching, and rest between sets.
 * Exercises flow directly from one to the next without transition delays.
 */
export function SectionTimer({
  config,
  safetyMode = false,
  onSectionComplete,
  onExerciseComplete,
  className = "",
}: SectionTimerProps) {
  const [phase, setPhase] = useState<TimerPhase>("setup");
  const [isPaused, setIsPaused] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [bilateralSide, setBilateralSide] = useState<1 | 2>(1);
  const [bidirectionalDirection, setBidirectionalDirection] = useState<1 | 2>(
    1
  );
  const [timeRemaining, setTimeRemaining] = useState(config.setupDuration);
  const [showSwitchOverlay, setShowSwitchOverlay] = useState(false);
  const [restContext, setRestContext] = useState<
    "between-sets" | "between-exercises" | null
  >(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const readySoundPlayedRef = useRef(false);
  const pendingStartSoundRef = useRef(false);
  const readySoundInstanceRef = useRef<
    ReturnType<typeof useSound>[1]["sound"] | null
  >(null);

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
          // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time initialization from localStorage on mount
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

  const totalExercises = config.exercises.length;
  const currentExercise: ExerciseTimerConfig | undefined =
    config.exercises[currentExerciseIndex];
  const nextExercise: ExerciseTimerConfig | undefined =
    currentExerciseIndex < totalExercises - 1
      ? config.exercises[currentExerciseIndex + 1]
      : undefined;

  // Vibrate helper
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  /**
   * Sound Effects Initialization
   *
   * Required sound files (must exist in /public/sounds/):
   * - ready.wav: Setup countdown sound (max 3 seconds)
   * - start.wav: Active interval start sound
   * - complete.wav: Active interval end sound
   * - cooldown.ogg: Cooldown interval sound
   *
   * If any sound file is missing, the timer will continue to function
   * but without audio feedback. Errors are logged to console in development.
   *
   * @see /public/sounds/README.md for more details
   */
  const [playReady, { sound: readySound }] = useSound("/sounds/ready.wav", {
    volume: isMuted ? 0 : volume,
    interrupt: true,
    onloaderror: () => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[SectionTimer] Failed to load ready.wav. Timer will continue without this sound."
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
          "[SectionTimer] Failed to load start.wav. Timer will continue without this sound."
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
            "[SectionTimer] Failed to load complete.wav. Timer will continue without this sound."
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
            "[SectionTimer] Failed to load cooldown.ogg. Timer will continue without this sound."
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

  // Verify sound files loaded successfully (check after a delay to allow loading)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const checkSounds = setTimeout(() => {
        const sounds = [
          { name: "ready.wav", instance: readySound },
          { name: "start.wav", instance: startSound },
          { name: "complete.wav", instance: completeSound },
          { name: "cooldown.ogg", instance: cooldownSound },
        ];

        sounds.forEach(({ name, instance }) => {
          if (!instance) {
            console.warn(
              `[SectionTimer] Sound file "${name}" failed to load. ` +
                "Please ensure the file exists in /public/sounds/. " +
                "Timer will continue without this sound."
            );
          } else {
            // Check if sound has a valid duration (indicates successful load)
            try {
              const duration = instance.duration();
              if (!duration || duration <= 0 || isNaN(duration)) {
                console.warn(
                  `[SectionTimer] Sound file "${name}" loaded but has invalid duration. ` +
                    "The file may be corrupted or in an unsupported format."
                );
              }
            } catch (error) {
              console.warn(
                `[SectionTimer] Error checking duration for "${name}":`,
                error
              );
            }
          }
        });
      }, 2000); // Check after 2 seconds to allow sounds to load

      return () => clearTimeout(checkSounds);
    }
  }, [readySound, startSound, completeSound, cooldownSound]);

  // Track ready sound instance to ensure we only get duration once per instance
  // Note: readySoundDuration is not currently used in the logic, but this pattern
  // ensures we only query the duration when the sound instance changes
  useEffect(() => {
    if (readySound && readySoundInstanceRef.current !== readySound) {
      // Sound instance changed - verify duration is <= 3 seconds as expected
      // This is a one-time check per sound instance, not a cascading state update
      readySoundInstanceRef.current = readySound;
      const duration = readySound.duration();
      if (duration && duration > 0 && !isNaN(duration) && duration > 3) {
        console.warn(
          `[SectionTimer] ready.wav duration (${duration}s) exceeds expected 3 seconds. ` +
            "This may cause timing issues with start.wav playback."
        );
      }
    }
  }, [readySound]);

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

  // Get duration for current phase
  const getPhaseDuration = useCallback((): number => {
    switch (phase) {
      case "setup":
        return config.setupDuration;
      case "cooldown":
        return config.cooldownDuration || 0;
      case "active":
        if (!currentExercise) return 0;
        // For bilateral exercises, split work time per side
        if (currentExercise.isBilateral) {
          return Math.floor(currentExercise.workDuration / 2);
        }
        // For bidirectional exercises, full duration per direction
        if (currentExercise.isBidirectional) {
          return currentExercise.workDuration;
        }
        // Regular exercise
        return currentExercise.workDuration;
      case "rest":
        if (!currentExercise) return 0;
        return currentExercise.restDuration;
      default:
        return 0;
    }
  }, [phase, currentExercise, config]);

  // Handle phase transitions
  const advancePhase = useCallback(() => {
    if (!currentExercise) {
      setPhase("complete");
      return;
    }

    switch (phase) {
      case "setup":
        // Start first exercise
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
          // Switch to second direction for bidirectional exercise
          setBidirectionalDirection(2);
          setTimeRemaining(currentExercise.workDuration);
          vibrate([100, 50, 100, 50, 100]);
        } else if (currentSet < currentExercise.sets) {
          // More sets remaining - go to rest between sets
          // Use the configured restDuration or default to 15s
          const restBetweenSets = currentExercise.restDuration ?? 15;
          setRestContext("between-sets");
          setPhase("rest");
          setTimeRemaining(restBetweenSets);
          vibrate([100, 50, 100]);
          playComplete();
        } else {
          // All sets of this exercise complete
          onExerciseComplete?.(currentExerciseIndex);

          if (currentExerciseIndex < totalExercises - 1) {
            // More exercises - show rest BEFORE next exercise
            setRestContext("between-exercises");
            setPhase("rest");
            setTimeRemaining(currentExercise.restDuration);
            vibrate([100, 50, 100]);
            playComplete();
          } else {
            // All exercises complete - check if cooldown is configured
            if (config.cooldownDuration && config.cooldownDuration > 0) {
              // Transition to cooldown phase
              setPhase("cooldown");
              setTimeRemaining(config.cooldownDuration);
              vibrate([200, 100, 200, 100, 200]);
              playCooldown();
            } else {
              // No cooldown - section complete
              setPhase("complete");
              vibrate([200, 100, 200, 100, 200]);
              onSectionComplete();
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
          }
        }
        break;

      case "cooldown":
        // Cooldown complete - section is done
        setPhase("complete");
        vibrate([200, 100, 200, 100, 200]);
        onSectionComplete();
        break;

      default:
        break;
    }
  }, [
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
    onExerciseComplete,
    onSectionComplete,
    playStart,
    playComplete,
    playCooldown,
    readySound,
    startSound,
    restContext,
  ]);

  // Update time remaining when exercise changes
  useEffect(() => {
    if (phase === "active" && currentExercise) {
      let duration = currentExercise.workDuration;
      if (currentExercise.isBilateral) {
        duration = Math.floor(currentExercise.workDuration / 2);
      } else if (currentExercise.isBidirectional) {
        duration = currentExercise.workDuration; // Full duration per direction
      }
      // Intentionally sync timer state when the active exercise changes.
      // This is a local state derivation (no external side effects), so we
      // disable the lint rule to keep the logic explicit here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeRemaining(duration);
    }
  }, [currentExerciseIndex, phase, currentExercise]);

  // Timer countdown
  useEffect(() => {
    if (isPaused || phase === "complete") return;

    if (timeRemaining <= 0) {
      // When the countdown hits zero, we advance the internal section timer
      // state machine here. This is a contained state transition with no
      // external side effects, so we intentionally suppress the lint rule.
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
  ]);

  // Show/hide "Switch direction" overlay around bilateral/bidirectional changes
  useEffect(() => {
    if (!currentExercise || phase !== "active") return;

    // Handle bilateral exercises
    if (currentExercise.isBilateral) {
      const sideWorkDuration = Math.floor(currentExercise.workDuration / 2);

      // Last ~2.5 seconds of side 1
      if (
        bilateralSide === 1 &&
        timeRemaining <= 2.5 &&
        timeRemaining > 0 &&
        !showSwitchOverlay
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowSwitchOverlay(true);
        return;
      }

      // First ~2.5 seconds of side 2, then hide
      if (bilateralSide === 2 && showSwitchOverlay) {
        const elapsedOnSide2 = sideWorkDuration - timeRemaining;
        if (elapsedOnSide2 >= 2.5) {
          setShowSwitchOverlay(false);
        }
      }
      return;
    }

    // Handle bidirectional exercises
    if (currentExercise.isBidirectional) {
      const directionWorkDuration = currentExercise.workDuration;

      // Last ~2.5 seconds of direction 1
      if (
        bidirectionalDirection === 1 &&
        timeRemaining <= 2.5 &&
        timeRemaining > 0 &&
        !showSwitchOverlay
      ) {
        setShowSwitchOverlay(true);
        return;
      }

      // First ~2.5 seconds of direction 2, then hide
      if (bidirectionalDirection === 2 && showSwitchOverlay) {
        const elapsedOnDirection2 = directionWorkDuration - timeRemaining;
        if (elapsedOnDirection2 >= 2.5) {
          setShowSwitchOverlay(false);
        }
      }
    }
  }, [
    currentExercise,
    bilateralSide,
    bidirectionalDirection,
    timeRemaining,
    phase,
    showSwitchOverlay,
  ]);

  // Go back to previous exercise's active work phase
  const handleBack = useCallback(() => {
    // If we're on the very first exercise and in initial setup, nothing to go back to
    if (currentExerciseIndex === 0 && phase === "setup") {
      return;
    }

    setCurrentExerciseIndex((prevIdx) => {
      const newIdx = Math.max(0, prevIdx - 1);
      const prevExercise = config.exercises[newIdx];

      setCurrentSet(1);
      setBilateralSide(1);
      setBidirectionalDirection(1);
      setPhase("active");

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
  }, [config.exercises, currentExerciseIndex, phase]);

  // Skip current phase
  const handleSkip = useCallback(() => {
    setTimeRemaining(0);
  }, []);

  // Calculate all intervals for proportional progress bars
  const calculateIntervals = useCallback(() => {
    const intervals: Array<{
      type: "work" | "rest";
      duration: number;
      exerciseIndex: number;
    }> = [];

    config.exercises.forEach((exercise, idx) => {
      // Add work interval(s) for each set
      for (let set = 1; set <= exercise.sets; set++) {
        const workDuration = exercise.workDuration;
        if (exercise.isBilateral) {
          // Bilateral: two work periods (one per side)
          intervals.push({
            type: "work",
            duration: Math.floor(workDuration / 2),
            exerciseIndex: idx,
          });
          intervals.push({
            type: "work",
            duration: Math.floor(workDuration / 2),
            exerciseIndex: idx,
          });
        } else if (exercise.isBidirectional) {
          // Bidirectional: two work periods (one per direction)
          intervals.push({
            type: "work",
            duration: workDuration,
            exerciseIndex: idx,
          });
          intervals.push({
            type: "work",
            duration: workDuration,
            exerciseIndex: idx,
          });
        } else {
          // Regular: one work period per set
          intervals.push({
            type: "work",
            duration: workDuration,
            exerciseIndex: idx,
          });
        }

        // Add rest between sets (except after last set)
        if (set < exercise.sets) {
          const restBetweenSets = exercise.restDuration ?? 15;
          intervals.push({
            type: "rest",
            duration: restBetweenSets,
            exerciseIndex: idx,
          });
        }
      }

      // Add rest between exercises (except after last exercise)
      if (idx < config.exercises.length - 1) {
        intervals.push({
          type: "rest",
          duration: exercise.restDuration,
          exerciseIndex: idx,
        });
      }
    });

    return intervals;
  }, [config.exercises]);

  // Get current interval index based on phase and progress
  const getCurrentIntervalIndex = useCallback(() => {
    let intervalIndex = 0;

    // Count all completed exercises
    for (let i = 0; i < currentExerciseIndex; i++) {
      const exercise = config.exercises[i];
      for (let set = 1; set <= exercise.sets; set++) {
        // Add work interval(s) for this set
        if (exercise.isBilateral || exercise.isBidirectional) {
          intervalIndex += 2; // Two work periods
        } else {
          intervalIndex += 1; // One work period
        }
        // Add rest between sets (except after last set)
        if (set < exercise.sets) {
          intervalIndex += 1;
        }
      }
      // Add rest between exercises (except after last exercise)
      if (i < config.exercises.length - 1) {
        intervalIndex += 1;
      }
    }

    // Count completed sets of current exercise
    if (currentExercise) {
      for (let set = 1; set < currentSet; set++) {
        // Add work interval(s) for this completed set
        if (currentExercise.isBilateral || currentExercise.isBidirectional) {
          intervalIndex += 2; // Two work periods
        } else {
          intervalIndex += 1; // One work period
        }
        // Add rest between sets
        intervalIndex += 1;
      }

      // Handle current set based on phase
      if (phase === "active") {
        // We're in a work interval - count completed work periods
        if (currentExercise.isBilateral && bilateralSide === 2) {
          intervalIndex += 1; // Completed first side
        } else if (
          currentExercise.isBidirectional &&
          bidirectionalDirection === 2
        ) {
          intervalIndex += 1; // Completed first direction
        }
        // Otherwise, we're still in the first work period (not counted yet)
      } else if (phase === "rest") {
        // Current set's work is complete - count all work periods
        if (currentExercise.isBilateral || currentExercise.isBidirectional) {
          intervalIndex += 2; // Both work periods complete
        } else {
          intervalIndex += 1; // Work complete
        }
        // We're now in a rest interval (counted when we check if it's active)
      }
    }

    return intervalIndex;
  }, [
    currentExerciseIndex,
    currentSet,
    currentExercise,
    phase,
    bilateralSide,
    bidirectionalDirection,
    config.exercises,
  ]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : secs.toString();
  };

  // Calculate progress
  const totalPhaseDuration = getPhaseDuration();
  const progress =
    totalPhaseDuration > 0
      ? ((totalPhaseDuration - timeRemaining) / totalPhaseDuration) * 100
      : 0;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Phase labels
  const getPhaseLabel = () => {
    switch (phase) {
      case "setup":
        return "GET READY";
      case "active":
        return "WORK";
      case "rest":
        return "REST";
      case "cooldown":
        return "COOLDOWN";
      case "complete":
        return "COMPLETE";
      default:
        return "";
    }
  };

  // Section complete state (only show if no cooldown or cooldown already finished)
  if (phase === "complete") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 rounded-xl border-2",
          "bg-primary/10 border-primary",
          className
        )}
      >
        <CheckCircle2 className="w-20 h-20 text-primary mb-4" />
        <h2 className="text-3xl font-bold text-primary mb-2">
          {config.sectionType} Complete!
        </h2>
        <p className="text-muted-foreground text-center">
          All {totalExercises} exercises finished
        </p>
      </div>
    );
  }

  // Cooldown phase doesn't need currentExercise, but other phases do
  if (phase !== "cooldown" && !currentExercise) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-xl border-2",
        safetyMode
          ? "bg-muted border-primary animate-breathe"
          : "bg-card border-border",
        className
      )}
    >
      {/* Section Progress */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {config.sectionType}
        </span>
        {phase === "cooldown" ? (
          <span className="text-xs text-muted-foreground">Cooldown</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </span>
        )}
      </div>

      {/* Exercise Name */}
      {phase === "cooldown" ? (
        <h2 className="text-xl font-bold text-center mb-1">Section Complete</h2>
      ) : (
        <h2 className="text-xl font-bold text-center mb-1">
          {phase === "rest" &&
          restContext === "between-exercises" &&
          nextExercise
            ? `Next Exercise: ${nextExercise.exerciseName}`
            : currentExercise?.exerciseName}
        </h2>
      )}

      {/* Switch direction overlay for bilateral/bidirectional exercises */}
      {phase !== "cooldown" &&
        showSwitchOverlay &&
        (currentExercise?.isBilateral || currentExercise?.isBidirectional) && (
          <div className="flex flex-col items-center justify-center w-full mb-4 rounded-lg border border-primary/60 bg-primary/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-primary animate-spin-slow" />
              <span className="text-sm font-semibold text-primary">
                {currentExercise.isBilateral
                  ? currentExercise.switchIndicator || "Switch sides"
                  : currentExercise.directionIndicator || "Change direction"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentExercise.isBilateral
                ? "Get ready for the other side – timer keeps running"
                : "Get ready to change direction – timer keeps running"}
            </p>
          </div>
        )}

      {/* Set & Side/Direction Info */}
      {phase !== "cooldown" && currentExercise && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">
            Set {currentSet} of {currentExercise.sets}
          </span>
          {currentExercise.isBilateral && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              Side {bilateralSide}/2
            </span>
          )}
          {currentExercise.isBidirectional && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              Direction {bidirectionalDirection}/2
            </span>
          )}
        </div>
      )}

      {/* Progress Ring */}
      <div className="relative w-48 h-48 mb-4">
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
                : timeRemaining <= 5
                  ? "text-destructive"
                  : "text-primary"
            )}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-5xl font-bold tabular-nums",
              timeRemaining <= 5 &&
                phase === "active" &&
                "text-destructive animate-pulse"
            )}
          >
            {formatTime(timeRemaining)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground mt-1">
            {getPhaseLabel()}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="lg"
          onClick={handleBack}
          className="h-14 px-6 rounded-full"
          aria-label="Back to previous exercise"
        >
          <SkipBack className="w-5 h-5 mr-2" />
          Back
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsPaused(!isPaused)}
          className="h-14 w-14 rounded-full p-0"
          aria-label={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? (
            <Play className="w-6 h-6" />
          ) : (
            <Pause className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={handleSkip}
          className="h-14 px-6 rounded-full"
          aria-label="Skip"
        >
          <SkipForward className="w-5 h-5 mr-2" />
          Skip
        </Button>
      </div>

      {/* Volume and Mute Controls */}
      <div className="flex items-center gap-3 mt-4 w-full max-w-xs mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMuted(!isMuted)}
          className="h-10 w-10 rounded-full p-0"
          aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Slider
            value={[volume * 100]}
            onValueChange={(value) => setVolume(value[0] / 100)}
            min={0}
            max={100}
            step={1}
            disabled={isMuted}
            className="flex-1"
            aria-label="Volume control"
          />
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Exercise Progress Bar - Proportional to Duration */}
      <div className="w-full mt-6">
        <div className="flex gap-0.5">
          {(() => {
            const intervals = calculateIntervals();
            const totalDuration = intervals.reduce(
              (sum, interval) => sum + interval.duration,
              0
            );
            const currentIntervalIdx = getCurrentIntervalIndex();

            return intervals.map((interval, idx) => {
              const widthPercent =
                totalDuration > 0
                  ? (interval.duration / totalDuration) * 100
                  : 0;
              const isCompleted = idx < currentIntervalIdx;
              const isActive = idx === currentIntervalIdx && phase !== "setup";

              return (
                <div
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    phase === "cooldown" || isCompleted
                      ? interval.type === "work"
                        ? "bg-primary"
                        : "bg-primary/60"
                      : isActive
                        ? interval.type === "work"
                          ? "bg-primary/70"
                          : "bg-primary/40"
                        : interval.type === "work"
                          ? "bg-muted"
                          : "bg-muted/60"
                  )}
                  style={{ width: `${widthPercent}%` }}
                />
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
