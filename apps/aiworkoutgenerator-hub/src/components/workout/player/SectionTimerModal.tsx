"use client";

import { useState, useCallback, useEffect } from "react";
import { Timer, Sparkles, Play, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { getIdToken } from "@/lib/auth";
import type { TrainerWorkoutSection, FitnessLevel } from "@/types/firestore";
import type {
  IntervalIntensityLevel,
  ExerciseTimerConfig,
  SectionTimerConfig,
  TimerMode,
} from "@/types/ai-exercise-editor";

interface SectionTimerModalProps {
  section: TrainerWorkoutSection;
  sectionIndex: number;
  workoutId: string;
  userLevel: FitnessLevel;
  existingConfig?: SectionTimerConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTimer: (config: SectionTimerConfig) => void;
  onSaveConfig: (config: SectionTimerConfig) => Promise<void>;
}

// Interval protocol presets
interface IntervalPreset {
  id: string;
  name: string;
  work: number;
  rest: number;
  trainingStyle: string;
  difficulty: string;
}

const INTERVAL_PRESETS: IntervalPreset[] = [
  {
    id: "tabata",
    name: "Tabata",
    work: 20,
    rest: 10,
    trainingStyle: "HIIT",
    difficulty: "High",
  },
  {
    id: "golden-ratio",
    name: "Golden Ratio",
    work: 30,
    rest: 30,
    trainingStyle: "Hybrid",
    difficulty: "Medium",
  },
  {
    id: "norwegian",
    name: "Norwegian",
    work: 240,
    rest: 180,
    trainingStyle: "Endurance HIIT",
    difficulty: "High (Sustained)",
  },
  {
    id: "bootcamp",
    name: "Bootcamp",
    work: 40,
    rest: 20,
    trainingStyle: "MIIT / Strength",
    difficulty: "Medium",
  },
  {
    id: "power-sprint",
    name: "Power Sprint",
    work: 10,
    rest: 50,
    trainingStyle: "Power HIIT",
    difficulty: "High (Peak Output)",
  },
  {
    id: "10-20-30",
    name: "10-20-30",
    work: 30,
    rest: 20,
    trainingStyle: "Runner's HIIT",
    difficulty: "Medium",
  },
  {
    id: "little-method",
    name: "Little Method",
    work: 60,
    rest: 75,
    trainingStyle: "Intermediate HIIT",
    difficulty: "Medium-High",
  },
  {
    id: "emom",
    name: "EMOM",
    work: 60,
    rest: 0,
    trainingStyle: "Task-based",
    difficulty: "Hybrid",
  },
  {
    id: "rev-tabata",
    name: "Rev. Tabata",
    work: 10,
    rest: 20,
    trainingStyle: "MIIT / Beginner",
    difficulty: "Low-Medium",
  },
  {
    id: "pyramid",
    name: "Pyramid",
    work: 45,
    rest: 15,
    trainingStyle: "Hybrid",
    difficulty: "Variable",
  },
];

// Map preset IDs to intensity levels for API compatibility
function mapPresetToIntensity(presetId: string): IntervalIntensityLevel {
  const mapping: Record<string, IntervalIntensityLevel> = {
    tabata: "intense",
    "power-sprint": "intense",
    "rev-tabata": "easy",
    "little-method": "easy",
    "golden-ratio": "moderate",
    bootcamp: "moderate",
    "10-20-30": "moderate",
    norwegian: "intense",
    emom: "moderate",
    pyramid: "moderate",
  };
  return mapping[presetId] || "moderate";
}

// Legacy intensity presets for fallback compatibility
const INTENSITY_PRESETS: Record<
  IntervalIntensityLevel,
  { work: number; rest: number; label: string }
> = {
  easy: { work: 30, rest: 60, label: "Easy (30s/60s)" },
  moderate: { work: 45, rest: 45, label: "Moderate (45s/45s)" },
  intense: { work: 60, rest: 30, label: "Intense (60s/30s)" },
};

// Bilateral exercise patterns
const BILATERAL_PATTERNS = [
  "single leg",
  "single arm",
  "single-leg",
  "single-arm",
  "one leg",
  "one arm",
  "lunge",
  "split squat",
  "bulgarian",
  "step up",
  "step-up",
  "pistol",
  "unilateral",
];

function detectBilateral(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase();
  return BILATERAL_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Modal for configuring interval timer for an entire workout section.
 * Allows per-exercise timing configuration with presets and AI recommendations.
 */
export function SectionTimerModal({
  section,
  sectionIndex,
  workoutId,
  userLevel,
  existingConfig,
  open,
  onOpenChange,
  onStartTimer,
  onSaveConfig,
}: SectionTimerModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [globalIntensity, setGlobalIntensity] =
    useState<IntervalIntensityLevel | null>(null);
  const [setupDuration, setSetupDuration] = useState(5);
  const [cooldownDuration, setCooldownDuration] = useState(60);
  const [timerMode, setTimerMode] = useState<TimerMode>("interval-circuit");
  const [exerciseConfigs, setExerciseConfigs] = useState<ExerciseTimerConfig[]>(
    []
  );
  const [isConfigured, setIsConfigured] = useState(false);

  // Initialize exercise configs from section or existing config
  useEffect(() => {
    if (existingConfig) {
      setExerciseConfigs(existingConfig.exercises);
      setSetupDuration(existingConfig.setupDuration);
      setCooldownDuration(existingConfig.cooldownDuration ?? 60);
      setTimerMode(existingConfig.timerMode || "interval-circuit");
      setIsConfigured(true); // Existing config means already configured
    } else {
      // Initialize with unconfigured state (0s/0s)
      const configs: ExerciseTimerConfig[] = (section.exercises || []).map(
        (exercise, idx) => ({
          exerciseIndex: idx,
          exerciseName: exercise.name,
          workDuration: 0, // Start unconfigured
          restDuration: 0, // Start unconfigured
          sets: exercise.sets,
          isBilateral: detectBilateral(exercise.name),
          isBidirectional: false,
          switchIndicator: detectBilateral(exercise.name)
            ? "Switch sides"
            : undefined,
        })
      );
      setExerciseConfigs(configs);
      setIsConfigured(false);
      setGlobalIntensity(null);
      setSelectedPresetId(null);
    }
  }, [section, existingConfig]);

  // Apply global preset to all exercises
  const applyGlobalPreset = useCallback((presetId: string) => {
    const preset = INTERVAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    // Map preset to intensity for fallback compatibility
    const intensity = mapPresetToIntensity(presetId);
    setGlobalIntensity(intensity);

    setExerciseConfigs((prev) =>
      prev.map((config) => ({
        ...config,
        workDuration: preset.work,
        restDuration: preset.rest,
      }))
    );
    setIsConfigured(true); // User applied a preset
  }, []);

  // Reset all timings to unconfigured state
  const handleResetTimings = useCallback(() => {
    setExerciseConfigs((prev) =>
      prev.map((config) => ({
        ...config,
        workDuration: 0,
        restDuration: 0,
      }))
    );
    setGlobalIntensity(null);
    setSelectedPresetId(null);
    setIsConfigured(false);
    toast.info("Timer reset to default");
  }, []);

  // Update single exercise config
  const updateExerciseConfig = useCallback(
    (exerciseIndex: number, updates: Partial<ExerciseTimerConfig>) => {
      setExerciseConfigs((prev) =>
        prev.map((config) =>
          config.exerciseIndex === exerciseIndex
            ? { ...config, ...updates }
            : config
        )
      );
      // If user is setting work/rest durations, mark as configured
      if (
        updates.workDuration !== undefined ||
        updates.restDuration !== undefined
      ) {
        setIsConfigured(true);
      }
    },
    []
  );

  // Get AI recommendations for all exercises (with fallback to presets)
  const handleAIRecommend = useCallback(async () => {
    setLoading(true);
    let aiSuccessCount = 0;
    let presetFallbackCount = 0;

    // Use moderate as default fallback intensity if none selected
    const fallbackIntensity: IntervalIntensityLevel =
      globalIntensity || "moderate";

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Authentication required");

      // Fetch AI recommendations for each exercise
      const updatedConfigs = await Promise.all(
        exerciseConfigs.map(async (config) => {
          const exercise = section.exercises?.[config.exerciseIndex];
          if (!exercise) return config;

          try {
            // Request actual AI analysis (not preset)
            const response = await fetch("/api/workouts/ai-interval-timer", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                exerciseName: exercise.name,
                exerciseData: {
                  sets: exercise.sets,
                  tempo: exercise.tempo,
                  muscleTarget: exercise.muscleTarget,
                  notes: exercise.setDetails?.[0]?.notes,
                },
                userLevel,
                workoutId,
                // Don't use preset - request actual AI analysis
                usePreset: false,
                intensityPreference: "custom",
              }),
            });

            if (response.ok) {
              const data = await response.json();
              aiSuccessCount++;
              console.log(
                `[AI Timer] AI recommendation for ${exercise.name}:`,
                {
                  work: data.workDuration,
                  rest: data.restDuration,
                  bilateral: data.isBilateral,
                  explanation: data.explanation,
                }
              );
              return {
                ...config,
                workDuration: data.workDuration,
                restDuration: data.restDuration,
                isBilateral: data.isBilateral,
                switchIndicator: data.switchIndicator,
              };
            } else {
              // API failed (rate limit, auth, etc.) - use preset fallback
              const errorData = await response.json().catch(() => ({}));
              console.warn(
                `[AI Timer] API failed for ${exercise.name}:`,
                errorData
              );
              presetFallbackCount++;
              const preset = INTENSITY_PRESETS[fallbackIntensity];
              return {
                ...config,
                workDuration: preset.work,
                restDuration: preset.rest,
                isBilateral: detectBilateral(exercise.name),
                switchIndicator: detectBilateral(exercise.name)
                  ? "Switch sides"
                  : undefined,
              };
            }
          } catch (err) {
            // Network error - use preset fallback
            console.error(
              `[AI Timer] Network error for ${exercise.name}:`,
              err
            );
            presetFallbackCount++;
            const preset = INTENSITY_PRESETS[fallbackIntensity];
            return {
              ...config,
              workDuration: preset.work,
              restDuration: preset.rest,
              isBilateral: detectBilateral(exercise.name),
              switchIndicator: detectBilateral(exercise.name)
                ? "Switch sides"
                : undefined,
            };
          }
        })
      );

      setExerciseConfigs(updatedConfigs);
      setIsConfigured(true);

      // Show appropriate feedback based on results
      if (aiSuccessCount > 0 && presetFallbackCount === 0) {
        toast.success(
          `AI analyzed ${aiSuccessCount} exercises with personalized timings!`
        );
      } else if (aiSuccessCount > 0) {
        toast.success(
          `AI analyzed ${aiSuccessCount} exercises, used presets for ${presetFallbackCount}`
        );
      } else {
        // All used presets (likely rate limited)
        toast.info(
          `Applied ${fallbackIntensity} preset to all exercises (AI limit reached)`
        );
      }
    } catch (err) {
      console.error("[AI Timer] Error getting recommendations:", err);
      // Fall back to applying preset globally
      applyGlobalPreset(fallbackIntensity);
      toast.info(`Applied ${fallbackIntensity} preset (AI unavailable)`);
    } finally {
      setLoading(false);
    }
  }, [
    exerciseConfigs,
    section,
    userLevel,
    workoutId,
    globalIntensity,
    applyGlobalPreset,
  ]);

  // Build section config
  const buildSectionConfig = useCallback((): SectionTimerConfig => {
    return {
      sectionIndex,
      sectionType: section.type,
      exercises: exerciseConfigs,
      setupDuration,
      cooldownDuration,
      timerMode,
    };
  }, [
    sectionIndex,
    section.type,
    exerciseConfigs,
    setupDuration,
    cooldownDuration,
    timerMode,
  ]);

  // Save config without starting
  const handleSaveConfig = useCallback(async () => {
    setSaving(true);
    try {
      const config = buildSectionConfig();
      await onSaveConfig(config);
      toast.success(`Timer saved for ${section.type}`);
    } catch (err) {
      console.error("Error saving config:", err);
      toast.error("Failed to save timer configuration");
    } finally {
      setSaving(false);
    }
  }, [buildSectionConfig, onSaveConfig, section.type]);

  // Start timer with current config
  const handleStartTimer = useCallback(() => {
    const config = buildSectionConfig();
    onStartTimer(config);
    onOpenChange(false);
  }, [buildSectionConfig, onStartTimer, onOpenChange]);

  // Calculate totals
  const totalExercises = exerciseConfigs.length;
  const totalSets = exerciseConfigs.reduce((sum, c) => sum + c.sets, 0);
  const estimatedDuration =
    exerciseConfigs.reduce((sum, c) => {
      const workTime = c.workDuration * c.sets * (c.isBilateral ? 2 : 1);
      const restTime = c.restDuration * (c.sets - 1);
      return sum + workTime + restTime;
    }, 0) +
    setupDuration +
    cooldownDuration;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            {section.type} Timer
          </DialogTitle>
          <DialogDescription>
            Configure interval timing for {totalExercises} exercises in this
            section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 min-w-0">
          {/* Global Controls */}
          <div className="space-y-4 min-w-0">
            {/* AI Recommend - Primary Action */}
            <Button
              variant="default"
              onClick={handleAIRecommend}
              disabled={loading}
              className="w-full h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing exercises...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Recommend All Timings
                </>
              )}
            </Button>

            {/* Global Interval Protocol Presets */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Or Apply Preset to All
                </Label>
                {isConfigured && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetTimings}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              <div className="w-full min-w-0 overflow-x-auto pb-2 no-scrollbar">
                <div className="flex gap-2 min-w-max">
                  {INTERVAL_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyGlobalPreset(preset.id)}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all min-w-[120px] flex-shrink-0",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="font-semibold text-center">
                          {preset.name}
                        </span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          {preset.work}s /{" "}
                          {preset.rest === 0 ? "0s" : `${preset.rest}s`}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] mt-1 px-1.5 py-0 h-4"
                        >
                          {preset.difficulty}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="setup-duration" className="text-xs">
                  Setup Time (sec)
                </Label>
                <Input
                  id="setup-duration"
                  type="number"
                  min={3}
                  max={30}
                  value={setupDuration}
                  onChange={(e) =>
                    setSetupDuration(parseInt(e.target.value) || 5)
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cooldown-duration" className="text-xs">
                  Cooldown Time (sec)
                </Label>
                <Input
                  id="cooldown-duration"
                  type="number"
                  min={0}
                  max={300}
                  value={cooldownDuration}
                  onChange={(e) =>
                    setCooldownDuration(parseInt(e.target.value) || 60)
                  }
                  className="h-9"
                />
              </div>
            </div>

            {/* Timer Mode Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Timer Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTimerMode("interval")}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 px-2 rounded-lg border-2 text-sm transition-all",
                    timerMode === "interval"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-semibold">Interval</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-1">
                    All sets per exercise
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimerMode("circuit")}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 px-2 rounded-lg border-2 text-sm transition-all",
                    timerMode === "circuit"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-semibold">Circuit</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-1">
                    Stopwatch, manual rest
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimerMode("interval-circuit")}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 px-2 rounded-lg border-2 text-sm transition-all",
                    timerMode === "interval-circuit"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-semibold">Both</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-1">
                    Timed + circuit order
                  </span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {timerMode === "interval" &&
                  "Complete all sets of one exercise before moving to the next. Countdown timer with timed rest."}
                {timerMode === "circuit" &&
                  "One set per exercise per round. Stopwatch (count up) with manual rest—you control the pace."}
                {timerMode === "interval-circuit" &&
                  "Circuit progression with countdown timer and timed rest. Best of both modes."}
              </p>
            </div>
          </div>

          {/* Per-Exercise Configuration */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Exercise Timings</Label>
            <Accordion type="multiple" className="w-full">
              {exerciseConfigs.map((config, idx) => (
                <AccordionItem key={idx} value={`exercise-${idx}`}>
                  <AccordionTrigger className="text-sm py-2">
                    <div className="flex items-center gap-2 flex-1 text-left">
                      <span className="font-medium">{config.exerciseName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {config.sets} sets
                      </Badge>
                      {config.isBilateral && (
                        <Badge
                          variant="outline"
                          className="text-xs text-primary"
                        >
                          Bilateral
                        </Badge>
                      )}
                      {config.isBidirectional && (
                        <Badge
                          variant="outline"
                          className="text-xs text-primary"
                        >
                          Bidirectional
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mr-2">
                      {config.workDuration > 0 ? (
                        <span>
                          {config.isBilateral || config.isBidirectional
                            ? `${config.workDuration}s/${config.workDuration}s`
                            : `${config.workDuration}s`}{" "}
                          work,{" "}
                          {config.transitionMode === "active"
                            ? "active transition"
                            : `${config.restDuration}s rest`}
                        </span>
                      ) : (
                        "Not set"
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Work (sec)</Label>
                        <Input
                          type="number"
                          min={10}
                          max={120}
                          value={config.workDuration}
                          onChange={(e) =>
                            updateExerciseConfig(idx, {
                              workDuration: parseInt(e.target.value) || 30,
                            })
                          }
                          className="h-8"
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Active time
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rest (sec)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={180}
                          value={config.restDuration}
                          onChange={(e) =>
                            updateExerciseConfig(idx, {
                              restDuration: parseInt(e.target.value) || 30,
                            })
                          }
                          className="h-8"
                          disabled={config.transitionMode === "active"}
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Between exercises
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sets</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={config.sets}
                          onChange={(e) =>
                            updateExerciseConfig(idx, {
                              sets: parseInt(e.target.value) || 1,
                            })
                          }
                          className="h-8"
                        />
                      </div>
                      {/* Transition Mode Toggle */}
                      <div className="col-span-3 flex gap-2">
                        <Button
                          variant={
                            config.transitionMode !== "active"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            updateExerciseConfig(idx, {
                              transitionMode: "rest",
                              restDuration:
                                config.restDuration === 0
                                  ? 15
                                  : config.restDuration,
                            })
                          }
                          className="flex-1 h-8"
                        >
                          {config.transitionMode !== "active"
                            ? "Rest Interval ✓"
                            : "Rest Interval"}
                        </Button>
                        <Button
                          variant={
                            config.transitionMode === "active"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            updateExerciseConfig(idx, {
                              transitionMode: "active",
                              restDuration: 0,
                            })
                          }
                          className="flex-1 h-8"
                        >
                          {config.transitionMode === "active"
                            ? "Active Interval ✓"
                            : "Active Interval"}
                        </Button>
                      </div>
                      {/* Bilateral/Bidirectional Toggle */}
                      <div className="col-span-3 flex gap-2">
                        <Button
                          variant={config.isBilateral ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            updateExerciseConfig(idx, {
                              isBilateral: !config.isBilateral,
                              switchIndicator: !config.isBilateral
                                ? "Switch sides"
                                : undefined,
                            })
                          }
                          className="flex-1 h-8"
                        >
                          {config.isBilateral ? "Bilateral ✓" : "Bilateral"}
                        </Button>
                        <Button
                          variant={
                            config.isBidirectional ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            updateExerciseConfig(idx, {
                              isBidirectional: !config.isBidirectional,
                              directionIndicator: !config.isBidirectional
                                ? "Change direction"
                                : undefined,
                            })
                          }
                          className="flex-1 h-8"
                        >
                          {config.isBidirectional
                            ? "Bidirectional ✓"
                            : "Bidirectional"}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Summary */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Section Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{totalExercises}</p>
                <p className="text-xs text-muted-foreground">Exercises</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSets}</p>
                <p className="text-xs text-muted-foreground">Total Sets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {formatDuration(estimatedDuration)}
                </p>
                <p className="text-xs text-muted-foreground">Est. Duration</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveConfig}
              disabled={saving || !isConfigured}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save for Later"}
            </Button>
            <Button
              onClick={handleStartTimer}
              disabled={!isConfigured}
              className="flex-1 h-12 text-lg font-semibold"
              title={
                !isConfigured
                  ? "Use AI Recommend or apply a preset first"
                  : undefined
              }
            >
              <Play className="w-5 h-5 mr-2" />
              Start Timer
            </Button>
          </div>

          {/* Help text when not configured */}
          {!isConfigured && (
            <p className="text-xs text-muted-foreground text-center">
              Click &quot;AI Recommend All Timings&quot; or select a preset to
              configure intervals
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
