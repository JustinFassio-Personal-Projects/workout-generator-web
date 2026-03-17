"use client";

import { useState, useCallback } from "react";
import { Timer, Sparkles, Play, Loader2, Info } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getIdToken } from "@/lib/auth";
import type { TrainerWorkoutExercise, FitnessLevel } from "@/types/firestore";
import type {
  IntervalIntensityLevel,
  AIIntervalTimerResponse,
  IntervalTimerConfig,
} from "@/types/ai-exercise-editor";

interface IntervalTimerModalProps {
  exercise: TrainerWorkoutExercise;
  workoutId: string;
  userLevel: FitnessLevel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTimer: (config: IntervalTimerConfig) => void;
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

/**
 * Modal for configuring and starting the interval timer.
 * Offers preset intensities and AI-powered recommendations.
 */
export function IntervalTimerModal({
  exercise,
  workoutId,
  userLevel,
  open,
  onOpenChange,
  onStartTimer,
}: IntervalTimerModalProps) {
  const [selectedPresetId, setSelectedPresetId] =
    useState<string>("golden-ratio");
  const [customWork, setCustomWork] = useState(45);
  const [customRest, setCustomRest] = useState(45);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] =
    useState<AIIntervalTimerResponse | null>(null);

  // Get selected preset
  const selectedPreset =
    INTERVAL_PRESETS.find((p) => p.id === selectedPresetId) ||
    INTERVAL_PRESETS[1]; // Default to golden-ratio

  // Get current values based on mode
  const currentWork = isCustom
    ? customWork
    : (aiRecommendation?.workDuration ?? selectedPreset.work);
  const currentRest = isCustom
    ? customRest
    : (aiRecommendation?.restDuration ?? selectedPreset.rest);
  const isBilateral = aiRecommendation?.isBilateral ?? false;

  // Fetch AI recommendation
  const handleAIRecommend = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Authentication required");
      }

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
            duration: exercise.setDetails?.[0]?.duration,
            notes: exercise.setDetails?.[0]?.notes,
          },
          userLevel,
          workoutId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.error ||
          "Failed to get AI recommendation";
        throw new Error(errorMessage);
      }

      const data: AIIntervalTimerResponse = await response.json();
      setAiRecommendation(data);
      setIsCustom(false);
      toast.success("AI recommendation ready!", {
        description: data.explanation,
      });
    } catch (err) {
      console.error("Error getting AI recommendation:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get recommendation";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [exercise, userLevel, workoutId]);

  // Use preset without AI
  const handleUsePreset = useCallback(
    async (presetId: string) => {
      setSelectedPresetId(presetId);
      setAiRecommendation(null);
      setIsCustom(false);

      // Quick bilateral check using preset endpoint
      try {
        const token = await getIdToken();
        if (token) {
          // Map preset to intensity level for API compatibility
          const intensityLevel = mapPresetToIntensity(presetId);

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
              },
              userLevel,
              intensityPreference: intensityLevel,
              workoutId,
              usePreset: true, // Skip AI, just do bilateral check
            }),
          });

          if (response.ok) {
            const data: AIIntervalTimerResponse = await response.json();
            if (data.isBilateral) {
              setAiRecommendation(data);
            }
          }
        }
      } catch {
        // Ignore errors for preset mode - bilateral detection is optional
      }
    },
    [exercise, userLevel, workoutId]
  );

  // Start timer with current configuration
  const handleStartTimer = useCallback(() => {
    const config: IntervalTimerConfig = {
      workDuration: currentWork,
      restDuration: currentRest,
      setupDuration: 5,
      isBilateral,
      switchIndicator: aiRecommendation?.switchIndicator,
      currentSet: 1,
      totalSets: exercise.sets,
    };

    onStartTimer(config);
    onOpenChange(false);
  }, [
    currentWork,
    currentRest,
    isBilateral,
    aiRecommendation,
    exercise.sets,
    onStartTimer,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Interval Timer
          </DialogTitle>
          <DialogDescription>
            Configure work and rest intervals for{" "}
            <strong>{exercise.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 min-w-0">
          {/* AI Recommend Button */}
          <div className="flex flex-col gap-2 min-w-0">
            <Button
              variant="outline"
              onClick={handleAIRecommend}
              disabled={loading}
              className="w-full h-12 border-primary/50 hover:border-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing exercise...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                  AI Recommend Timing
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Uses 1 AI credit to analyze exercise and suggest optimal intervals
            </p>
          </div>

          {/* AI Recommendation Display */}
          {aiRecommendation && !isCustom && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">
                  AI Recommendation
                </span>
                <Badge variant="secondary">
                  {aiRecommendation.intensityLevel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {aiRecommendation.explanation}
              </p>
              {aiRecommendation.isBilateral && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-primary">
                    Bilateral Exercise
                  </Badge>
                  <span className="text-muted-foreground">
                    Will switch at midpoint
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Interval Protocol Presets */}
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-semibold">Interval Protocols</Label>
            <div className="w-full min-w-0 overflow-x-auto pb-2 no-scrollbar">
              <div className="flex gap-2 min-w-max">
                {INTERVAL_PRESETS.map((preset) => {
                  const isSelected =
                    !isCustom &&
                    !aiRecommendation &&
                    selectedPresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleUsePreset(preset.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-w-[120px] flex-shrink-0",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-sm font-semibold text-center">
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

          {/* Custom Values */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Custom Values</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCustom(!isCustom);
                  if (!isCustom) {
                    setCustomWork(currentWork);
                    setCustomRest(currentRest);
                  }
                }}
                className="text-xs"
              >
                {isCustom ? "Use Preset" : "Customize"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="work-duration" className="text-xs">
                  Work (seconds)
                </Label>
                <Input
                  id="work-duration"
                  type="number"
                  min={10}
                  max={600}
                  value={isCustom ? customWork : currentWork}
                  onChange={(e) => {
                    setIsCustom(true);
                    setCustomWork(parseInt(e.target.value) || 30);
                  }}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rest-duration" className="text-xs">
                  Rest (seconds)
                </Label>
                <Input
                  id="rest-duration"
                  type="number"
                  min={0}
                  max={600}
                  value={isCustom ? customRest : currentRest}
                  onChange={(e) => {
                    setIsCustom(true);
                    setCustomRest(parseInt(e.target.value) || 30);
                  }}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Timer Summary</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Total time per set:{" "}
                      {isBilateral
                        ? `${currentWork}s (${currentWork / 2}s per side)`
                        : `${currentWork}s`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {currentWork}s
                </p>
                <p className="text-xs text-muted-foreground">Work</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">
                  {currentRest}s
                </p>
                <p className="text-xs text-muted-foreground">Rest</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{exercise.sets}</p>
                <p className="text-xs text-muted-foreground">Sets</p>
              </div>
            </div>
            {isBilateral && (
              <p className="text-xs text-center text-primary mt-2">
                Includes side switch at midpoint
              </p>
            )}
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartTimer}
            className="w-full h-14 text-lg font-semibold rounded-full"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Timer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
