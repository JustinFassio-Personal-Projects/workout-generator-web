"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Bookmark,
  Timer,
  Play,
  Pause,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  TrainerWorkout,
  TrainerWorkoutSection,
  TrainerSetDetail,
  FitnessLevel,
} from "@/types/firestore";
import type {
  SectionTimerConfig,
  ExerciseTimerConfig,
  ExerciseAIEditHistory,
  TimerMode,
} from "@/types/ai-exercise-editor";
import { Button } from "@/components/ui/button";
import { SafetyToggle } from "./SafetyToggle";
import { ExerciseCardPlayer } from "./ExerciseCardPlayer";
import { ConflictResolution } from "./ConflictResolution";
import { InjuryVisualizer } from "./InjuryVisualizer";
import { SectionTimerModal } from "./SectionTimerModal";
import { SectionTimer } from "./SectionTimer";
import { CompactSectionTimer } from "./CompactSectionTimer";
import { RoundCooldownDisplay } from "./RoundCooldownDisplay";
import { SectionResults } from "./SectionResults";
import { NextSectionPrompt } from "./NextSectionPrompt";
import { AIExerciseEditor } from "@/components/workout/ai-editor/AIExerciseEditor";
import { ExerciseImageSelectorModal } from "@/components/workout/ExerciseImageSelectorModal";
import { AIExerciseService } from "@/services/ai-exercise-service";
import { toast } from "sonner";
import { devLogError } from "@/lib/devLog";
import { cn } from "@/lib/utils";
import { exerciseHasCompletedSet } from "@/lib/workout/exerciseCompletion";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getIdToken } from "@/lib/auth";

interface WorkoutPlayerProps {
  workout: TrainerWorkout;
}

type ViewMode =
  | "overview"
  | "active"
  | "section-timer"
  | "section-results"
  | "section-complete";
type PhaseType = "warmup" | "main" | "finisher";

/**
 * Main orchestrator component for the workout player experience.
 * Manages phase navigation, exercise selection, Safety Mode, section-based timers, and view transitions.
 */
export function WorkoutPlayer({ workout }: WorkoutPlayerProps) {
  const router = useRouter();
  const { profile } = useUserProfile();
  const [workoutState, setWorkoutState] = useState<TrainerWorkout>(workout);
  const [safetyMode, setSafetyMode] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<PhaseType>("warmup");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [activeExercise, setActiveExercise] = useState<{
    sectionIdx: number;
    exerciseIdx: number;
  } | null>(null);
  const [aiEditorState, setAIEditorState] = useState<{
    open: boolean;
    sectionIdx: number | null;
    exerciseIdx: number | null;
    initialAction?: string;
  }>({ open: false, sectionIdx: null, exerciseIdx: null });
  const [imageSelectorState, setImageSelectorState] = useState<{
    open: boolean;
    sectionIdx: number | null;
    exerciseIdx: number | null;
  }>({
    open: false,
    sectionIdx: null,
    exerciseIdx: null,
  });

  // Section Timer State
  const [sectionTimerModalOpen, setSectionTimerModalOpen] = useState(false);
  const [activeSectionTimerConfig, setActiveSectionTimerConfig] =
    useState<SectionTimerConfig | null>(null);
  const [completedSectionIndex, setCompletedSectionIndex] = useState<
    number | null
  >(null);
  const [shouldStartCompactTimer, setShouldStartCompactTimer] = useState(false);
  const [isCompactTimerRunning, setIsCompactTimerRunning] = useState(false);
  const [shouldPauseCompactTimer, setShouldPauseCompactTimer] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [currentTimerExerciseIndex, setCurrentTimerExerciseIndex] = useState(0);
  const exerciseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  // Track last synced exercise index to prevent unnecessary updates
  const lastSyncedExerciseIndexRef = useRef<number | null>(null);
  // Track previous round to detect round changes
  const prevRoundRef = useRef<number | null>(null);
  // Round cooldown state
  const [roundCooldownInfo, setRoundCooldownInfo] = useState<{
    isActive: boolean;
    currentRound: number;
    totalRounds: number;
    completedRounds: number[];
    nextRoundExercises: ExerciseTimerConfig[];
    timeRemaining?: number;
    isPaused?: boolean;
  } | null>(null);
  // Current round info for header display
  const [currentRoundInfo, setCurrentRoundInfo] = useState<{
    currentRound: number;
    totalRounds: number;
  } | null>(null);
  // Timer phase tracking
  const [timerPhase, setTimerPhase] = useState<
    "setup" | "active" | "rest" | "cooldown" | "complete" | null
  >(null);
  // Section cooldown state (for final section cooldowns, not round cooldowns)
  const [sectionCooldownInfo, setSectionCooldownInfo] = useState<{
    timeRemaining: number;
    isPaused: boolean;
  } | null>(null);

  // Prevent window/body scrolling in Active Mode to enable container-level scrolling for sticky header
  useEffect(() => {
    if (viewMode === "active") {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, [viewMode]);

  // Enable auto-scroll when entering Active Mode
  useEffect(() => {
    if (viewMode === "active") {
      setAutoScrollEnabled(true);
    }
  }, [viewMode]);

  // Keep local workout state in sync with prop changes
  useEffect(() => {
    setWorkoutState(workout);
  }, [workout]);

  // Auto-scroll to current exercise when timer exercise changes
  useEffect(() => {
    if (autoScrollEnabled && viewMode === "overview" && isCompactTimerRunning) {
      const element = exerciseRefs.current.get(currentTimerExerciseIndex);
      if (element) {
        // Get the sticky header height dynamically
        const headerHeight = stickyHeaderRef.current?.offsetHeight || 0;
        // Calculate the element's position relative to the document
        const elementTop = element.getBoundingClientRect().top + window.scrollY;
        // Scroll to position the element just below the sticky header
        window.scrollTo({
          top: elementTop - headerHeight - 16, // 16px extra padding
          behavior: "smooth",
        });
      }
    }
  }, [
    currentTimerExerciseIndex,
    autoScrollEnabled,
    viewMode,
    isCompactTimerRunning,
  ]);

  // Auto-scroll lateral navigation for active (full-screen) view
  // IMPORTANT: Update when timer progresses forward through exercises OR when a new round starts
  // When a new round starts, reset exercise position to first exercise of new round
  useEffect(() => {
    // Detect round changes - use currentRound from currentRoundInfo, default to null if not available
    const currentRound = currentRoundInfo?.currentRound ?? null;
    const roundChanged =
      currentRound !== null &&
      prevRoundRef.current !== null &&
      currentRound !== prevRoundRef.current;

    if (roundChanged) {
      // New round started - reset sync ref to allow position update
      lastSyncedExerciseIndexRef.current = null;
      prevRoundRef.current = currentRound;
    } else if (currentRound !== null) {
      prevRoundRef.current = currentRound;
    }

    if (
      autoScrollEnabled &&
      viewMode === "active" &&
      isCompactTimerRunning &&
      activeExercise
    ) {
      // Guard: Only update if the timer index has actually changed and differs from active exercise
      // Use ref to track last synced index to prevent unnecessary updates
      // Allow update if: moving forward, staying same, OR round changed (new round = reset to first exercise)
      const isMovingForward =
        lastSyncedExerciseIndexRef.current === null ||
        currentTimerExerciseIndex >= lastSyncedExerciseIndexRef.current ||
        roundChanged;

      if (
        currentTimerExerciseIndex !== lastSyncedExerciseIndexRef.current &&
        activeExercise.exerciseIdx !== currentTimerExerciseIndex &&
        isMovingForward
      ) {
        setActiveExercise({
          sectionIdx: activeExercise.sectionIdx,
          exerciseIdx: currentTimerExerciseIndex,
        });
        lastSyncedExerciseIndexRef.current = currentTimerExerciseIndex;
      } else if (!isMovingForward && !roundChanged) {
        // Timer index went backwards (round loop-back without new round) - don't update global position
        // Keep the current activeExercise.exerciseIdx unchanged
      }
    } else {
      // Reset ref when conditions are not met
      lastSyncedExerciseIndexRef.current = null;
      if (
        !autoScrollEnabled ||
        viewMode !== "active" ||
        !isCompactTimerRunning
      ) {
        prevRoundRef.current = null;
      }
    }
  }, [
    currentTimerExerciseIndex,
    autoScrollEnabled,
    viewMode,
    isCompactTimerRunning,
    currentRoundInfo?.currentRound ?? null, // Use specific property with fallback to ensure stable array size
    // Only depend on the specific properties we use, not the whole object
    activeExercise?.sectionIdx,
    activeExercise?.exerciseIdx,
  ]);

  // Map workout sections to phases
  const phaseMap = useMemo(() => {
    const map: Record<
      PhaseType,
      { section: TrainerWorkoutSection; index: number } | null
    > = {
      warmup: null,
      main: null,
      finisher: null,
    };

    // Filter to only valid sections (must have exercises array)
    const validSections = (workoutState.sections || []).filter(
      (section) =>
        section &&
        Array.isArray(section.exercises) &&
        section.exercises.length > 0
    );

    validSections.forEach((section, originalIndex) => {
      // Find the original index in the sections array
      const index = workoutState.sections?.indexOf(section) ?? originalIndex;

      // Use type if available, otherwise assign based on position
      const type = (section.type || "").toLowerCase();

      if (type.includes("warmup") || type.includes("warm")) {
        map.warmup = { section, index };
      } else if (type.includes("main") || type.includes("workout")) {
        map.main = { section, index };
      } else if (type.includes("finish") || type.includes("cool")) {
        map.finisher = { section, index };
      } else {
        // No recognized type - assign to first empty slot
        if (!map.warmup && validSections.indexOf(section) === 0) {
          map.warmup = { section: { ...section, type: "Warmup" }, index };
        } else if (!map.main) {
          map.main = { section: { ...section, type: "Main Workout" }, index };
        } else if (!map.finisher) {
          map.finisher = { section: { ...section, type: "Finisher" }, index };
        }
      }
    });

    // Default to first valid section if phase not found
    if (!map.warmup && !map.main && !map.finisher && validSections[0]) {
      map.main = {
        section: { ...validSections[0], type: "Main Workout" },
        index: 0,
      };
    }

    return map;
  }, [workoutState.sections]);

  // Get current section based on phase
  const currentSectionData = phaseMap[currentPhase];
  const currentSection = currentSectionData?.section;
  const currentSectionIndex = currentSectionData?.index ?? 0;

  // If no section found for current phase, try to find any available section
  const availableSection = currentSection || workoutState.sections?.[0];

  // Get next section after current one
  const getNextSectionData = useCallback(
    (afterIndex: number) => {
      // First try phase-based lookup
      const phases: PhaseType[] = ["warmup", "main", "finisher"];
      for (const phase of phases) {
        const data = phaseMap[phase];
        if (data && data.index > afterIndex) {
          return data;
        }
      }

      // Fallback: check all sections directly (in case phase mapping missed something)
      const allSections = workoutState.sections || [];
      for (let i = afterIndex + 1; i < allSections.length; i++) {
        const section = allSections[i];
        if (
          section &&
          Array.isArray(section.exercises) &&
          section.exercises.length > 0
        ) {
          return {
            section,
            index: i,
          };
        }
      }

      return null;
    },
    [phaseMap, workoutState.sections]
  );

  // Get reasoning for exercise from personalization
  const getExerciseReasoning = (
    sectionIdx: number,
    exerciseIdx: number
  ): string | undefined => {
    const exercise =
      workoutState.sections?.[sectionIdx]?.exercises[exerciseIdx];
    if (!exercise) return undefined;

    const personalization = workoutState.personalization || [];
    const relevantItem = personalization.find((item) =>
      item.adjustment.toLowerCase().includes(exercise.name.toLowerCase())
    );

    return relevantItem?.adjustment;
  };

  // Get trust badges for exercise
  const getExerciseTrustBadges = (sectionIdx: number, exerciseIdx: number) => {
    const exercise =
      workoutState.sections?.[sectionIdx]?.exercises[exerciseIdx];
    if (!exercise) return [];

    const badges = [];

    const personalization = workoutState.personalization || [];
    const hasInjuryModification = personalization.some(
      (item) =>
        item.attribute.toLowerCase().includes("injury") &&
        item.adjustment.toLowerCase().includes(exercise.name.toLowerCase())
    );

    if (hasInjuryModification) {
      badges.push({
        type: "safety-modified" as const,
        explanation: "Modified for your injury profile.",
      });
    }

    return badges;
  };

  // Check if a section has a saved timer config
  const getSectionTimerConfig = useCallback(
    (sectionIndex: number): SectionTimerConfig | undefined => {
      const section = workoutState.sections?.[sectionIndex];
      if (!section?.timer_config || !section?.exercises) return undefined;

      // Convert persisted config to runtime config
      const config: SectionTimerConfig = {
        sectionIndex,
        sectionType: section.type || "Workout",
        exercises: section.timer_config.exercises.map((e) => ({
          ...e,
          exerciseName:
            section.exercises?.[e.exerciseIndex]?.name ||
            `Exercise ${e.exerciseIndex + 1}`,
        })),
        setupDuration: section.timer_config.setupDuration,
        cooldownDuration: section.timer_config.cooldownDuration ?? 60,
        timerMode: section.timer_config.timerMode || "interval-circuit", // Include timerMode from persisted config
        completed: section.timer_config.completed,
      };

      // Include transitionDuration for backward compatibility with existing saved configs
      // This field is deprecated and no longer used between exercises, but we preserve it
      // when loading old configs to avoid data loss during migration
      if (
        section.timer_config.transitionDuration !== undefined &&
        section.timer_config.transitionDuration > 0
      ) {
        config.transitionDuration = section.timer_config.transitionDuration;
      }

      return config;
    },
    [workoutState.sections]
  );

  // Create a default timer config when none exists
  const getDefaultSectionTimerConfig = useCallback(
    (sectionIndex: number): SectionTimerConfig | undefined => {
      const section = workoutState.sections?.[sectionIndex];
      if (!section?.exercises) return undefined;

      // Create default config with 30s work / 15s rest per exercise
      const exercises: ExerciseTimerConfig[] = section.exercises.map(
        (ex, idx) => ({
          exerciseIndex: idx,
          exerciseName: ex.name,
          workDuration: 30,
          restDuration: 15,
          sets: ex.sets || 1,
          isBilateral: false,
        })
      );

      return {
        sectionIndex,
        sectionType: section.type || "Workout",
        exercises,
        setupDuration: 5,
        cooldownDuration: 60,
        timerMode: "interval-circuit",
      };
    },
    [workoutState.sections]
  );

  const handlePhaseChange = (phase: PhaseType) => {
    setCurrentPhase(phase);
    setViewMode("overview");
    setActiveExercise(null);
    setActiveSectionTimerConfig(null);
    setCompletedSectionIndex(null);
  };

  const handleExerciseSelect = (sectionIdx: number, exerciseIdx: number) => {
    setActiveExercise({ sectionIdx, exerciseIdx });
    setViewMode("active");
  };

  const handleBackFromActive = () => {
    setViewMode("overview");
    setActiveExercise(null);
  };

  const handlePreviousExercise = () => {
    if (!activeExercise) return;
    const { sectionIdx, exerciseIdx } = activeExercise;

    if (exerciseIdx > 0) {
      // Move to previous exercise in same section
      setActiveExercise({ sectionIdx, exerciseIdx: exerciseIdx - 1 });
    }
    // Stay on first exercise if already at beginning (no cross-section navigation)
  };

  const handleNextExercise = () => {
    if (!activeExercise || !availableSection) return;

    const { sectionIdx, exerciseIdx } = activeExercise;
    const section = workoutState.sections?.[sectionIdx];
    if (!section?.exercises) return;
    const nextExerciseIdx = exerciseIdx + 1;

    if (nextExerciseIdx < section.exercises.length) {
      setActiveExercise({ sectionIdx, exerciseIdx: nextExerciseIdx });
    } else {
      const nextSectionIdx = sectionIdx + 1;
      if (nextSectionIdx < (workoutState.sections?.length || 0)) {
        setActiveExercise({ sectionIdx: nextSectionIdx, exerciseIdx: 0 });
      } else {
        setViewMode("overview");
        setActiveExercise(null);
      }
    }
  };

  const handleBack = () => {
    if (viewMode === "section-timer" || viewMode === "section-complete") {
      setViewMode("overview");
      setActiveSectionTimerConfig(null);
      setCompletedSectionIndex(null);
    } else if (viewMode === "active") {
      setViewMode("overview");
      setActiveExercise(null);
    } else {
      router.back();
    }
  };

  const handleUpdateSet = useCallback(
    (
      sectionIdx: number,
      exerciseIdx: number,
      setIdx: number,
      field: string,
      value: string
    ) => {
      setWorkoutState((prev) => {
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections
        );
        const exercise = newSections[sectionIdx]?.exercises?.[exerciseIdx];
        const setRow = exercise?.setDetails?.[setIdx];
        if (!exercise?.setDetails || !setRow) return prev;
        const key = field as keyof TrainerSetDetail;
        if (
          key === "reps" ||
          key === "weight" ||
          key === "actualWeight" ||
          key === "rest" ||
          key === "notes"
        ) {
          setRow[key] = value;
        }
        return { ...prev, sections: newSections };
      });
    },
    []
  );

  // Handle set completion from timer or set-details UI
  const handleToggleSetComplete = useCallback(
    (
      sectionIdx: number,
      exerciseIdx: number,
      setIdx: number,
      completed: boolean
    ) => {
      setWorkoutState((prev) => {
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections
        );
        const exercise = newSections[sectionIdx]?.exercises[exerciseIdx];
        const setDetails = exercise?.setDetails;
        if (setDetails && setDetails[setIdx]) {
          setDetails[setIdx].completed = completed;
        }
        if (exercise?.setDetails?.length) {
          const allDone = exercise.setDetails.every(
            (s) => s.completed === true
          );
          exercise.completed = allDone;
        }
        return { ...prev, sections: newSections };
      });
    },
    []
  );

  // Handle exercise completion from timer or set-details UI (with validation)
  const handleExerciseComplete = useCallback(
    (sectionIdx: number, exerciseIdx: number, completed: boolean) => {
      setWorkoutState((prev) => {
        if (completed === true) {
          const ex = prev.sections?.[sectionIdx]?.exercises?.[exerciseIdx];
          if (!exerciseHasCompletedSet(ex)) {
            queueMicrotask(() =>
              toast.error(
                "Please complete at least one set before completing the exercise"
              )
            );
            return prev;
          }
        }
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections
        );
        const exercise = newSections[sectionIdx]?.exercises[exerciseIdx];
        if (exercise) {
          exercise.completed = completed;
        }
        return { ...prev, sections: newSections };
      });
    },
    []
  );

  // Check if a set is completed (for round detection in timer)
  const checkSetCompleted = useCallback(
    (sectionIdx: number, exerciseIdx: number, setIdx: number): boolean => {
      const exercise =
        workoutState.sections?.[sectionIdx]?.exercises?.[exerciseIdx];
      const setDetail = exercise?.setDetails?.[setIdx];
      return setDetail?.completed === true;
    },
    [workoutState]
  );

  // Handle round cooldown change
  const handleRoundCooldownChange = useCallback(
    (
      isActive: boolean,
      roundInfo?: {
        currentRound: number;
        totalRounds: number;
        completedRounds: number[];
        nextRoundExercises: ExerciseTimerConfig[];
      }
    ) => {
      if (isActive && roundInfo) {
        setRoundCooldownInfo({
          isActive: true,
          ...roundInfo,
        });
      } else {
        setRoundCooldownInfo(null);
      }
    },
    []
  );

  // Handle round info change (for header display)
  const handleRoundInfoChange = useCallback(
    (roundInfo: { currentRound: number; totalRounds: number } | null) => {
      setCurrentRoundInfo(roundInfo);
    },
    []
  );

  // Handle timer phase changes
  const handleTimerPhaseChange = useCallback(
    (phase: "setup" | "active" | "rest" | "cooldown" | "complete") => {
      setTimerPhase(phase);
      // Clear section cooldown info when phase changes away from cooldown
      if (phase !== "cooldown") {
        setSectionCooldownInfo(null);
      }
    },
    []
  );

  // Handle section cooldown change (for final section cooldowns, not round cooldowns)
  const handleSectionCooldownChange = useCallback(
    (
      isActive: boolean,
      cooldownInfo?: {
        timeRemaining: number;
        isPaused: boolean;
      }
    ) => {
      if (isActive && cooldownInfo) {
        setSectionCooldownInfo({
          timeRemaining: cooldownInfo.timeRemaining,
          isPaused: cooldownInfo.isPaused,
        });
      } else {
        setSectionCooldownInfo(null);
      }
    },
    []
  );

  const handleOpenCoachExplain = useCallback(
    (sectionIdx: number, exerciseIdx: number) => {
      setAIEditorState({
        open: true,
        sectionIdx,
        exerciseIdx,
        initialAction: "coach_explain",
      });
    },
    []
  );

  const handleChooseImage = useCallback(
    (sectionIdx: number, exerciseIdx: number) => {
      setImageSelectorState({
        open: true,
        sectionIdx,
        exerciseIdx,
      });
    },
    []
  );

  const handleOpenAIEditor = useCallback(
    (sectionIdx: number, exerciseIdx: number) => {
      setAIEditorState({
        open: true,
        sectionIdx,
        exerciseIdx,
      });
    },
    []
  );

  const handleApplyAIEdit = useCallback(
    async (
      modifiedExercise: TrainerWorkoutSection["exercises"][number],
      editHistory: ExerciseAIEditHistory
    ) => {
      if (
        aiEditorState.sectionIdx === null ||
        aiEditorState.exerciseIdx === null
      ) {
        return;
      }

      const sIdx = aiEditorState.sectionIdx;
      const eIdx = aiEditorState.exerciseIdx;

      const originalSections: TrainerWorkoutSection[] = structuredClone(
        workoutState.sections
      );

      try {
        setWorkoutState((prev) => {
          const newSections: TrainerWorkoutSection[] = structuredClone(
            prev.sections
          );
          if (newSections[sIdx]?.exercises[eIdx]) {
            newSections[sIdx].exercises[eIdx] = modifiedExercise;
          }
          return { ...prev, sections: newSections };
        });

        await AIExerciseService.applyExerciseEdit(
          workoutState.id,
          sIdx,
          eIdx,
          modifiedExercise,
          editHistory
        );

        toast.success("Exercise updated with AI!");
        setAIEditorState({ open: false, sectionIdx: null, exerciseIdx: null });
      } catch (error) {
        devLogError("WorkoutPlayer.applyAIEdit", error);
        toast.error("Failed to apply edit. Please try again.");

        setWorkoutState((prev) => ({
          ...prev,
          sections: structuredClone(originalSections),
        }));
      }
    },
    [aiEditorState, workoutState.id, workoutState.sections]
  );

  const handleUpdateImageUrl = useCallback(async (imageUrl: string) => {
    // Intentionally left as a no-op for now. This handler will update the exercise
    // image URL once image editing support is implemented in the workout player.
    // The imageUrl parameter is required to match the onUpdateImageUrl prop signature.
  }, []);

  // Get active exercise data
  const activeExerciseData = activeExercise
    ? workoutState.sections?.[activeExercise.sectionIdx]?.exercises[
        activeExercise.exerciseIdx
      ]
    : null;

  // Section Timer Handlers
  const handleOpenSectionTimer = useCallback(() => {
    setSectionTimerModalOpen(true);
  }, []);

  const handleSaveSectionTimerConfig = useCallback(
    async (config: SectionTimerConfig) => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Authentication required");

        const response = await fetch("/api/workouts/save-section-timer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workoutId: workoutState.id,
            sectionIndex: config.sectionIndex,
            timerConfig: config,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error || "Failed to save timer configuration";
          const errorDetails = errorData.details
            ? ` Details: ${JSON.stringify(errorData.details)}`
            : "";
          throw new Error(`${errorMessage}${errorDetails}`);
        }

        // Update local state with the saved config
        setWorkoutState((prev) => {
          const newSections = structuredClone(prev.sections);
          if (newSections[config.sectionIndex]) {
            newSections[config.sectionIndex].timer_config = {
              exercises: config.exercises.map((e) => ({
                exerciseIndex: e.exerciseIndex,
                workDuration: e.workDuration,
                restDuration: e.restDuration,
                sets: e.sets,
                isBilateral: e.isBilateral,
                isBidirectional: e.isBidirectional || false,
                switchIndicator: e.switchIndicator,
                directionIndicator: e.directionIndicator,
              })),
              setupDuration: config.setupDuration,
              cooldownDuration: config.cooldownDuration || 0,
              // Preserve deprecated transitionDuration for backward compatibility
              ...(config.transitionDuration !== undefined && {
                transitionDuration: config.transitionDuration,
              }),
              ...(config.timerMode !== undefined && {
                timerMode: config.timerMode,
              }),
            };
          }
          return { ...prev, sections: newSections };
        });
      } catch (error) {
        devLogError("WorkoutPlayer.saveSectionTimerConfig", error);
        throw error;
      }
    },
    [workoutState.id]
  );

  const handleStartSectionTimer = useCallback((config: SectionTimerConfig) => {
    setActiveSectionTimerConfig(config);
    setSectionTimerModalOpen(false);
    setViewMode("section-timer");
  }, []);

  const handleStartCompactTimer = useCallback(() => {
    if (isCompactTimerRunning) {
      // Timer is running, pause it
      setShouldPauseCompactTimer(true);
    } else {
      // Timer is not running, start it
      setShouldStartCompactTimer(true);
    }
  }, [isCompactTimerRunning]);

  const handleStartCompactTimerComplete = useCallback(() => {
    setShouldStartCompactTimer(false);
  }, []);

  const handlePauseCompactTimerComplete = useCallback(() => {
    setShouldPauseCompactTimer(false);
  }, []);

  const handleStopCompactTimer = useCallback(() => {
    setIsCompactTimerRunning(false);
    setShouldStartCompactTimer(false);
    setShouldPauseCompactTimer(false);
  }, []);

  const handleOpenFullScreenTimer = useCallback(() => {
    const config = getSectionTimerConfig(currentSectionIndex);
    if (config) {
      setActiveSectionTimerConfig(config);
      setViewMode("section-timer");
    }
  }, [currentSectionIndex, getSectionTimerConfig]);

  // Handle timer mode change from compact timer
  const handleTimerModeChange = useCallback(
    async (newMode: TimerMode) => {
      const currentConfig = getSectionTimerConfig(currentSectionIndex);
      if (!currentConfig) return;

      // Update config with new mode
      const updatedConfig: SectionTimerConfig = {
        ...currentConfig,
        timerMode: newMode,
      };

      // Save the updated config
      try {
        await handleSaveSectionTimerConfig(updatedConfig);
      } catch (error) {
        devLogError("WorkoutPlayer.timerModeChange", error);
        // Mode change is still applied locally even if save fails
      }
    },
    [currentSectionIndex, getSectionTimerConfig, handleSaveSectionTimerConfig]
  );

  const handleSectionComplete = useCallback(() => {
    if (!activeSectionTimerConfig) {
      return;
    }

    const completedIdx = activeSectionTimerConfig.sectionIndex;
    setCompletedSectionIndex(completedIdx);

    // Show results page first
    setViewMode("section-results");

    // Mark section as completed in the config
    handleSaveSectionTimerConfig({
      ...activeSectionTimerConfig,
      completed: true,
    }).catch(() => {
      // Silent catch - config save is non-blocking
    });
  }, [activeSectionTimerConfig, handleSaveSectionTimerConfig]);

  const handleConfigureNextSection = useCallback(() => {
    if (completedSectionIndex === null) return;

    const nextData = getNextSectionData(completedSectionIndex);
    if (nextData) {
      // Update phase to match the next section
      const phases: PhaseType[] = ["warmup", "main", "finisher"];
      for (const phase of phases) {
        if (phaseMap[phase]?.index === nextData.index) {
          setCurrentPhase(phase);
          break;
        }
      }

      setCompletedSectionIndex(null);
      setActiveSectionTimerConfig(null);
      setViewMode("overview");

      // Open the timer modal for the next section after a brief delay
      setTimeout(() => {
        setSectionTimerModalOpen(true);
      }, 100);
    }
  }, [completedSectionIndex, getNextSectionData, phaseMap]);

  const handleSkipToOverview = useCallback(() => {
    setViewMode("overview");
    setActiveSectionTimerConfig(null);
    setCompletedSectionIndex(null);
  }, []);

  const handleFinishWorkout = useCallback(() => {
    toast.success("Workout complete! Great job!");
    router.push("/workouts");
  }, [router]);

  // Calculate total duration and calories
  const totalDuration = workoutState.duration_minutes || 0;
  const totalCalories =
    workoutState.sections?.reduce((acc, section) => {
      // Safeguard: handle sections with missing exercises array
      return acc + (section?.exercises?.length || 0) * 50;
    }, 0) || 0;

  // Check if current section has saved timer config
  const currentSectionHasTimer =
    currentSectionIndex !== undefined &&
    !!workoutState.sections?.[currentSectionIndex]?.timer_config;

  // Navigation state for active view
  const currentSectionExercises = activeExercise
    ? workoutState.sections?.[activeExercise.sectionIdx]?.exercises || []
    : [];
  const isFirstExercise = activeExercise?.exerciseIdx === 0;
  const isLastExercise = activeExercise
    ? activeExercise.exerciseIdx >= currentSectionExercises.length - 1
    : true;

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-background",
        viewMode === "active"
          ? "w-full"
          : "max-w-4xl mx-auto border-x border-border"
      )}
    >
      {/* Header - Hidden when Play Mode (timer running) is active OR active exercise view */}
      {!isCompactTimerRunning && viewMode !== "active" && (
        <header className="p-5 bg-card border-b border-border sticky top-0 z-50">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <span className="text-xs font-bold text-primary tracking-widest uppercase">
                  AI Generated Plan
                </span>
              </div>
              <h1 className="text-3xl leading-none font-bold mt-1">
                {workoutState.title || "Workout"}
              </h1>
            </div>
            <Button variant="ghost" size="sm">
              <Bookmark className="w-4 h-4" />
            </Button>
          </div>

          {workoutState.description && (
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {workoutState.description}
            </p>
          )}

          <div className="flex gap-4 text-sm font-semibold">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              {totalDuration} min
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Flame className="w-4 h-4 text-destructive" />~{totalCalories}{" "}
              kcal
            </div>
          </div>
        </header>
      )}

      {/* Safety Toggle - Hidden when Play Mode (timer running) is active OR active exercise view */}
      {!isCompactTimerRunning && viewMode !== "active" && (
        <div className="p-4 border-b border-border">
          <SafetyToggle onToggle={setSafetyMode} />
        </div>
      )}

      {/* Conflict Resolution - Hidden in active view */}
      {viewMode !== "active" &&
        workoutState.personalization &&
        workoutState.personalization.length > 0 && (
          <div className="p-4 border-b border-border">
            <ConflictResolution
              personalization={workoutState.personalization}
            />
          </div>
        )}

      {/* Play Mode Container - sticky when timer is running, normal flow otherwise */}
      {viewMode === "overview" && (
        <div
          ref={stickyHeaderRef}
          className={cn(
            isCompactTimerRunning && "sticky top-0 z-50 bg-background shadow-sm"
          )}
        >
          {/* Phase Navigation */}
          <nav className="flex justify-around border-b border-border bg-card text-lg font-bold tracking-wide">
            {(["warmup", "main", "finisher"] as PhaseType[]).map((phase) => {
              const data = phaseMap[phase];
              if (!data) return null;

              const hasTimer = !!data.section.timer_config;

              return (
                <button
                  key={phase}
                  onClick={() => handlePhaseChange(phase)}
                  className={cn(
                    "py-3 px-4 w-full text-center transition-colors duration-150 capitalize relative",
                    currentPhase === phase
                      ? "border-b-2 border-primary text-primary"
                      : "border-b-2 border-transparent text-muted-foreground hover:text-primary"
                  )}
                >
                  {data.section.type}
                  {hasTimer && (
                    <Timer className="w-3 h-3 absolute top-2 right-2 text-primary" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Section Timer Button */}
          {currentSection && (
            <div className="p-4 border-b border-border">
              {currentSectionHasTimer ? (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={handleStartCompactTimer}
                    className="flex-1 h-12"
                  >
                    {isCompactTimerRunning ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Timer
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Timer
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleOpenSectionTimer}
                    className="flex-1 h-12 border-primary/50 hover:border-primary"
                  >
                    <Timer className="w-4 h-4 mr-2 text-primary" />
                    Edit {currentSection.type} Timer
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleOpenSectionTimer}
                  className="w-full h-12 border-primary/50 hover:border-primary"
                >
                  <Timer className="w-4 h-4 mr-2 text-primary" />
                  Set Up {currentSection.type} Timer
                </Button>
              )}
            </div>
          )}

          {/* Exercise Tabs (Horizontal Scroll) */}
          {availableSection?.exercises && (
            <div className="bg-card pt-2 pb-2 pl-4 border-b border-border">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pr-4">
                {availableSection.exercises.map((exercise, idx) => {
                  const sectionIdx =
                    workoutState.sections?.findIndex(
                      (s) => s === availableSection
                    ) || 0;
                  const isActive =
                    activeExercise?.sectionIdx === sectionIdx &&
                    activeExercise?.exerciseIdx === idx;

                  return (
                    <button
                      key={`${exercise.name}-${idx}`}
                      onClick={() => handleExerciseSelect(sectionIdx, idx)}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors duration-150",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:text-primary hover:border-primary/60"
                      )}
                    >
                      {exercise.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact Section Timer - SINGLE INSTANCE */}
          {/* Footer timer stays visible during cooldown - it manages the countdown state */}
          {currentSectionHasTimer &&
            currentSection &&
            (() => {
              const sectionTimerConfig =
                getSectionTimerConfig(currentSectionIndex);
              if (!sectionTimerConfig) {
                return null;
              }
              return (
                <CompactSectionTimer
                  config={sectionTimerConfig}
                  safetyMode={safetyMode}
                  onOpenFullScreen={handleOpenFullScreenTimer}
                  onSectionComplete={handleSectionComplete}
                  shouldStart={shouldStartCompactTimer}
                  onStartComplete={handleStartCompactTimerComplete}
                  onTimerStateChange={setIsCompactTimerRunning}
                  shouldPause={shouldPauseCompactTimer}
                  onPauseComplete={handlePauseCompactTimerComplete}
                  autoScrollEnabled={autoScrollEnabled}
                  onAutoScrollChange={setAutoScrollEnabled}
                  onCurrentExerciseChange={setCurrentTimerExerciseIndex}
                  onStop={handleStopCompactTimer}
                  onModeChange={handleTimerModeChange}
                  onSetComplete={handleToggleSetComplete}
                  onExerciseComplete={handleExerciseComplete}
                  sectionIndex={currentSectionIndex}
                  isSetCompleted={checkSetCompleted}
                  onRoundCooldownChange={handleRoundCooldownChange}
                  onRoundInfoChange={handleRoundInfoChange}
                  onPhaseChange={handleTimerPhaseChange}
                  onSectionCooldownChange={handleSectionCooldownChange}
                />
              );
            })()}
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 relative pb-24",
          viewMode === "active"
            ? "h-screen flex flex-col overflow-hidden"
            : "overflow-hidden p-4",
          timerPhase === "cooldown" && "flex items-center justify-center"
        )}
      >
        {/* Section Timer Running */}
        {viewMode === "section-timer" && activeSectionTimerConfig && (
          <SectionTimer
            config={activeSectionTimerConfig}
            safetyMode={safetyMode}
            onSectionComplete={handleSectionComplete}
          />
        )}

        {/* Cooldown Display - Show when timer phase is cooldown */}
        {/* This is a presentational component - the footer timer manages the countdown state */}
        {timerPhase === "cooldown" && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-4">
            {roundCooldownInfo?.isActive ? (
              // Round cooldown (interval-circuit mode)
              <RoundCooldownDisplay
                currentRound={roundCooldownInfo.currentRound}
                totalRounds={roundCooldownInfo.totalRounds}
                completedRounds={roundCooldownInfo.completedRounds}
                nextRoundExercises={roundCooldownInfo.nextRoundExercises}
                timeRemaining={roundCooldownInfo.timeRemaining ?? 60}
                isPaused={roundCooldownInfo.isPaused ?? false}
                safetyMode={safetyMode}
              />
            ) : (
              // Final section cooldown (after all exercises complete)
              <RoundCooldownDisplay
                timeRemaining={sectionCooldownInfo?.timeRemaining ?? 60}
                isPaused={sectionCooldownInfo?.isPaused ?? false}
                safetyMode={safetyMode}
                completedSection={workoutState.sections?.[currentSectionIndex]}
                showSummary={true}
                onFinishWorkout={handleFinishWorkout}
                onReturnToOverview={handleSkipToOverview}
              />
            )}
          </div>
        )}

        {/* Section Results Page */}
        {viewMode === "section-results" &&
          completedSectionIndex !== null &&
          workoutState.sections?.[completedSectionIndex] &&
          (() => {
            const nextSectionData = getNextSectionData(completedSectionIndex);
            return (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-4">
                <SectionResults
                  completedSection={
                    workoutState.sections[completedSectionIndex]
                  }
                  nextSection={nextSectionData?.section}
                  nextSectionIndex={nextSectionData?.index}
                  onContinue={
                    nextSectionData
                      ? handleConfigureNextSection
                      : handleSkipToOverview
                  }
                  onFinishWorkout={handleFinishWorkout}
                />
              </div>
            );
          })()}

        {/* Section Complete - Next Section Prompt */}
        {viewMode === "section-complete" &&
          completedSectionIndex !== null &&
          workoutState.sections?.[completedSectionIndex] && (
            <NextSectionPrompt
              completedSection={workoutState.sections[completedSectionIndex]}
              nextSection={getNextSectionData(completedSectionIndex)?.section}
              nextSectionIndex={
                getNextSectionData(completedSectionIndex)?.index
              }
              onConfigureNext={handleConfigureNextSection}
              onSkipToOverview={handleSkipToOverview}
              onFinishWorkout={handleFinishWorkout}
            />
          )}

        {/* Active Exercise View - Full Screen */}
        {viewMode === "active" &&
          activeExercise &&
          activeExerciseData &&
          timerPhase !== "cooldown" && (
            <div className="flex-1 flex flex-col min-h-0 max-h-full w-full overflow-y-auto overflow-x-hidden pb-48 md:pb-0">
              {/* Navigation Header - Fixed at top */}
              <div className="sticky top-0 shrink-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="p-4 flex items-center justify-between gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackFromActive}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  {/* Phase/Section Title - Centered */}
                  {currentSectionData && (
                    <h2 className="text-lg font-bold text-center flex-1 truncate animate-breathe-gold-text-border">
                      {currentSectionData.section.type}
                    </h2>
                  )}

                  {/* Exercise Navigation */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-muted-foreground mr-2">
                      Exercise Count
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviousExercise}
                      disabled={isFirstExercise}
                      className="h-8 w-8 p-0"
                      aria-label="Previous exercise"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="text-sm font-medium min-w-[60px] text-center">
                      {(activeExercise?.exerciseIdx ?? 0) + 1} of{" "}
                      {currentSectionExercises.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextExercise}
                      disabled={isLastExercise}
                      className="h-8 w-8 p-0"
                      aria-label="Next exercise"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
              {/* Exercise Content - Scrollable on mobile and tablet+ when content expands */}
              <div className="flex-1 min-h-0 md:overflow-y-auto md:overflow-x-hidden">
                <div className="md:h-full md:flex md:flex-col md:min-h-0 md:justify-between">
                  <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:overflow-x-hidden">
                    <ExerciseCardPlayer
                      exercise={activeExerciseData}
                      exerciseId={`${activeExercise.sectionIdx}-${activeExercise.exerciseIdx}`}
                      safetyMode={safetyMode}
                      isActive={true}
                      sectionIdx={activeExercise.sectionIdx}
                      exerciseIdx={activeExercise.exerciseIdx}
                      onUpdateSet={handleUpdateSet}
                      onToggleSetComplete={handleToggleSetComplete}
                      onExerciseComplete={handleExerciseComplete}
                      reasoning={getExerciseReasoning(
                        activeExercise.sectionIdx,
                        activeExercise.exerciseIdx
                      )}
                      trustBadges={getExerciseTrustBadges(
                        activeExercise.sectionIdx,
                        activeExercise.exerciseIdx
                      )}
                      onOpenAIEditor={() =>
                        handleOpenAIEditor(
                          activeExercise.sectionIdx,
                          activeExercise.exerciseIdx
                        )
                      }
                      onOpenCoachExplain={() =>
                        handleOpenCoachExplain(
                          activeExercise.sectionIdx,
                          activeExercise.exerciseIdx
                        )
                      }
                    />
                  </div>
                  {/* Injury Visualizer */}
                  {profile?.injuries && profile.injuries.length > 0 && (
                    <div className="mt-6 md:mt-4 md:shrink-0">
                      <InjuryVisualizer
                        injuries={profile.injuries}
                        activeMuscles={activeExerciseData.muscle_groups || []}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Overview - Exercise List */}
        {viewMode === "overview" && !currentSection?.exercises && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              This workout appears to have corrupted data.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        )}

        {/* Hide exercise list when in cooldown phase (cooldown display is shown instead) */}
        {viewMode === "overview" &&
          timerPhase !== "cooldown" &&
          currentSection?.exercises && (
            <div className="space-y-4">
              {currentSection.exercises.map((exercise, idx) => {
                const sectionIdx =
                  workoutState.sections?.findIndex(
                    (s) => s === currentSection
                  ) || 0;

                return (
                  <div
                    key={`${exercise.name}-${idx}`}
                    ref={(el) => {
                      if (el) exerciseRefs.current.set(idx, el);
                      else exerciseRefs.current.delete(idx);
                    }}
                  >
                    <ExerciseCardPlayer
                      exercise={exercise}
                      exerciseId={`${sectionIdx}-${idx}`}
                      safetyMode={safetyMode}
                      isActive={false}
                      reasoning={getExerciseReasoning(sectionIdx, idx)}
                      trustBadges={getExerciseTrustBadges(sectionIdx, idx)}
                      onSelect={() => handleExerciseSelect(sectionIdx, idx)}
                      onOpenAIEditor={() => handleOpenAIEditor(sectionIdx, idx)}
                      onOpenCoachExplain={() =>
                        handleOpenCoachExplain(sectionIdx, idx)
                      }
                      onChooseImage={() => handleChooseImage(sectionIdx, idx)}
                    />
                  </div>
                );
              })}
            </div>
          )}
      </main>

      {/* Compact Timer Footer - Only in active exercise view */}
      {viewMode === "active" &&
        activeExercise &&
        (() => {
          const sectionTimerConfig =
            getSectionTimerConfig(activeExercise.sectionIdx) ||
            getDefaultSectionTimerConfig(activeExercise.sectionIdx);
          if (!sectionTimerConfig) {
            return null;
          }
          return (
            <CompactSectionTimer
              config={sectionTimerConfig}
              safetyMode={safetyMode}
              onOpenFullScreen={handleOpenFullScreenTimer}
              onSectionComplete={handleSectionComplete}
              shouldStart={shouldStartCompactTimer}
              onStartComplete={handleStartCompactTimerComplete}
              onTimerStateChange={setIsCompactTimerRunning}
              shouldPause={shouldPauseCompactTimer}
              onPauseComplete={handlePauseCompactTimerComplete}
              autoScrollEnabled={autoScrollEnabled}
              onAutoScrollChange={setAutoScrollEnabled}
              onCurrentExerciseChange={setCurrentTimerExerciseIndex}
              onStop={handleStopCompactTimer}
              onModeChange={handleTimerModeChange}
              onPreviousExercise={handlePreviousExercise}
              onNextExercise={handleNextExercise}
              isFirstExercise={isFirstExercise}
              isLastExercise={isLastExercise}
              exercisePosition={(activeExercise?.exerciseIdx ?? 0) + 1}
              totalExercises={currentSectionExercises.length}
              onSetComplete={handleToggleSetComplete}
              onExerciseComplete={handleExerciseComplete}
              sectionIndex={activeExercise.sectionIdx}
              isSetCompleted={checkSetCompleted}
              onRoundCooldownChange={handleRoundCooldownChange}
              onRoundInfoChange={handleRoundInfoChange}
              onPhaseChange={handleTimerPhaseChange}
              onSectionCooldownChange={handleSectionCooldownChange}
              variant="fixed"
            />
          );
        })()}

      {/* Section Timer Modal */}
      {currentSection && (
        <SectionTimerModal
          section={currentSection}
          sectionIndex={currentSectionIndex}
          workoutId={workoutState.id}
          userLevel={
            (workoutState.generation_context?.profile_snapshot
              ?.fitness_level as FitnessLevel) || "intermediate"
          }
          existingConfig={getSectionTimerConfig(currentSectionIndex)}
          open={sectionTimerModalOpen}
          onOpenChange={setSectionTimerModalOpen}
          onStartTimer={handleStartSectionTimer}
          onSaveConfig={handleSaveSectionTimerConfig}
        />
      )}

      {/* AI Exercise Editor Modal */}
      {aiEditorState.open &&
        aiEditorState.sectionIdx !== null &&
        aiEditorState.exerciseIdx !== null && (
          <AIExerciseEditor
            exercise={
              workoutState.sections?.[aiEditorState.sectionIdx]?.exercises[
                aiEditorState.exerciseIdx
              ] || workoutState.sections?.[0]?.exercises[0]
            }
            sectionType={
              workoutState.sections?.[aiEditorState.sectionIdx]?.type ||
              "Main Workout"
            }
            sectionIndex={aiEditorState.sectionIdx}
            exerciseIndex={aiEditorState.exerciseIdx}
            workoutId={workoutState.id}
            workout={{
              focus: workoutState.focus,
              difficulty: workoutState.difficulty,
              generation_context: workoutState.generation_context,
              sections: workoutState.sections || [],
            }}
            open={aiEditorState.open}
            onOpenChange={(open) =>
              setAIEditorState({
                open,
                sectionIdx: open ? aiEditorState.sectionIdx : null,
                exerciseIdx: open ? aiEditorState.exerciseIdx : null,
                initialAction: open ? aiEditorState.initialAction : undefined,
              })
            }
            onApplyEdit={handleApplyAIEdit}
            onUpdateImageUrl={handleUpdateImageUrl}
            initialAction={aiEditorState.initialAction}
          />
        )}

      {/* Exercise Image Selector Modal */}
      {imageSelectorState.open &&
        imageSelectorState.sectionIdx !== null &&
        imageSelectorState.exerciseIdx !== null &&
        workoutState.sections?.[imageSelectorState.sectionIdx]?.exercises?.[
          imageSelectorState.exerciseIdx
        ] && (
          <ExerciseImageSelectorModal
            open={imageSelectorState.open}
            onOpenChange={(open) =>
              setImageSelectorState((prev) => ({
                ...prev,
                open,
                ...(open === false
                  ? {
                      sectionIdx: null,
                      exerciseIdx: null,
                    }
                  : {}),
              }))
            }
            exerciseName={
              workoutState.sections[imageSelectorState.sectionIdx].exercises[
                imageSelectorState.exerciseIdx
              ].name
            }
            currentImageUrl={
              workoutState.sections[imageSelectorState.sectionIdx].exercises[
                imageSelectorState.exerciseIdx
              ].image_url
            }
            onImageSelected={() => {
              // Image preference is saved by the modal (which shows its own success toast).
              // The preference will be picked up automatically via useExerciseImage hook.
              // No need for duplicate toast - modal already provides user feedback.
            }}
          />
        )}
    </div>
  );
}
