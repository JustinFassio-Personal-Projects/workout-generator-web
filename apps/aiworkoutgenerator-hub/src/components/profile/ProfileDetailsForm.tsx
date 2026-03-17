"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUser } from "@/lib/auth";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";
import type { UserProfile } from "@/types/firestore";
import {
  DIETARY_RESTRICTIONS,
  FOOD_ALLERGIES,
  WORKOUT_MUSIC_PREFERENCES,
  WORKOUT_INTENSITY_PREFERENCES,
} from "@/lib/profile-phase2-options";
import { validateTimeFormat } from "@/lib/validation/profileSchemas";
import { toast } from "sonner";

/**
 * Normalize empty arrays to null to match schema
 */
function normalizeArray<T>(arr: T[] | null | undefined): T[] | null {
  if (!arr || arr.length === 0) return null;
  return arr;
}

/**
 * Normalize empty number to null
 */
function normalizeNumber(num: number | null | undefined): number | null {
  if (num === undefined || num === null || num === 0) return null;
  return num;
}

/**
 * Convert MM:SS format to seconds (uses validateTimeFormat for consistency)
 */
function timeToSeconds(timeStr: string): number | null {
  return validateTimeFormat(timeStr);
}

/**
 * Convert seconds to MM:SS format
 */
function secondsToTime(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Deduplicate and normalize exercise list (preset + custom)
 */
function normalizeExercises(
  exercises: string[] | null | undefined
): string[] | null {
  if (!exercises || exercises.length === 0) return null;
  const normalized = exercises
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .map((e) => e.toLowerCase());
  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : null;
}

export function ProfileDetailsForm() {
  const { profile, loading, error, updateProfile } = useUserProfile();
  const { user } = useUser();
  const { sessionId } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [localData, setLocalData] = useState<Partial<UserProfile>>({});
  // Store raw input values for exercise fields to preserve spaces while typing
  const [exerciseInputs, setExerciseInputs] = useState<{
    favorite_exercises: string;
    disliked_exercises: string;
    exercise_restrictions: string;
  }>({
    favorite_exercises: "",
    disliked_exercises: "",
    exercise_restrictions: "",
  });

  // Initialize local data from profile when it loads
  useEffect(() => {
    if (profile && !loading) {
      setLocalData({
        favorite_exercises: profile.favorite_exercises,
        disliked_exercises: profile.disliked_exercises,
        exercise_restrictions: profile.exercise_restrictions,
        current_bench_press_max: profile.current_bench_press_max,
        current_squat_max: profile.current_squat_max,
        current_deadlift_max: profile.current_deadlift_max,
        current_overhead_press_max: profile.current_overhead_press_max,
        current_mile_time: profile.current_mile_time,
        current_5k_time: profile.current_5k_time,
        resting_heart_rate: profile.resting_heart_rate,
        target_weight: profile.target_weight,
        target_body_fat_percentage: profile.target_body_fat_percentage,
        current_body_fat_percentage: profile.current_body_fat_percentage,
        workout_music_preference: profile.workout_music_preference,
        workout_intensity_preference: profile.workout_intensity_preference,
        prefers_group_workouts: profile.prefers_group_workouts,
        prefers_outdoor_workouts: profile.prefers_outdoor_workouts,
        dietary_restrictions: profile.dietary_restrictions,
        food_allergies: profile.food_allergies,
        daily_calorie_target: profile.daily_calorie_target,
        macro_targets: profile.macro_targets,
      });
      // Initialize raw input values
      setExerciseInputs({
        favorite_exercises: profile.favorite_exercises
          ? profile.favorite_exercises.join(", ")
          : "",
        disliked_exercises: profile.disliked_exercises
          ? profile.disliked_exercises.join(", ")
          : "",
        exercise_restrictions: profile.exercise_restrictions
          ? profile.exercise_restrictions.join(", ")
          : "",
      });
    }
  }, [profile, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const patch: Partial<UserProfile> = {
        favorite_exercises: normalizeExercises(localData.favorite_exercises),
        disliked_exercises: normalizeExercises(localData.disliked_exercises),
        exercise_restrictions: normalizeExercises(
          localData.exercise_restrictions
        ),
        current_bench_press_max: normalizeNumber(
          localData.current_bench_press_max
        ),
        current_squat_max: normalizeNumber(localData.current_squat_max),
        current_deadlift_max: normalizeNumber(localData.current_deadlift_max),
        current_overhead_press_max: normalizeNumber(
          localData.current_overhead_press_max
        ),
        current_mile_time: localData.current_mile_time,
        current_5k_time: localData.current_5k_time,
        resting_heart_rate: normalizeNumber(localData.resting_heart_rate),
        target_weight: normalizeNumber(localData.target_weight),
        target_body_fat_percentage: normalizeNumber(
          localData.target_body_fat_percentage
        ),
        current_body_fat_percentage: normalizeNumber(
          localData.current_body_fat_percentage
        ),
        workout_music_preference: localData.workout_music_preference ?? null,
        workout_intensity_preference:
          localData.workout_intensity_preference ?? null,
        prefers_group_workouts:
          localData.prefers_group_workouts === undefined
            ? null
            : localData.prefers_group_workouts,
        prefers_outdoor_workouts:
          localData.prefers_outdoor_workouts === undefined
            ? null
            : localData.prefers_outdoor_workouts,
        dietary_restrictions: normalizeArray(localData.dietary_restrictions),
        food_allergies: normalizeArray(localData.food_allergies),
        daily_calorie_target: normalizeNumber(localData.daily_calorie_target),
        macro_targets: localData.macro_targets
          ? {
              protein_g: normalizeNumber(localData.macro_targets.protein_g),
              carbs_g: normalizeNumber(localData.macro_targets.carbs_g),
              fat_g: normalizeNumber(localData.macro_targets.fat_g),
            }
          : null,
      };

      await updateProfile(patch);

      // Log profile update activity
      if (user) {
        logUserActivity(
          user.uid,
          "profile:update",
          "profile",
          user.uid,
          {
            fields_updated: Object.keys(patch),
          },
          sessionId || undefined
        ).catch(console.error);
      }

      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading profile: {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        No profile found. Please complete onboarding first.
      </div>
    );
  }

  const formatLabel = (str: string): string => {
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Exercise Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Exercise Preferences</CardTitle>
          <CardDescription>
            Tell us which exercises you love, dislike, or need to avoid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Favorite exercises</Label>
            <p className="text-xs text-muted-foreground">
              Select from presets or add custom exercises
            </p>
            {/* TODO: Implement exercise selector with preset + custom */}
            <Input
              placeholder="e.g., push-ups, squats, deadlifts"
              value={exerciseInputs.favorite_exercises}
              onChange={(e) => {
                const rawValue = e.target.value;
                setExerciseInputs({
                  ...exerciseInputs,
                  favorite_exercises: rawValue,
                });
                // Only process completed items (those ending with comma) to preserve spaces while typing
                const parts = rawValue.split(",");
                const completedExercises = parts
                  .slice(0, -1)
                  .map((e) => e.trim())
                  .filter((e) => e.length > 0);
                // Include current item being typed (last part) WITHOUT trimming to preserve spaces
                const currentItem = parts[parts.length - 1] || "";
                const allExercises =
                  currentItem.length > 0
                    ? [...completedExercises, currentItem]
                    : completedExercises;
                setLocalData({
                  ...localData,
                  favorite_exercises:
                    allExercises.length > 0 ? allExercises : null,
                });
              }}
              onBlur={() => {
                // Final processing on blur - trim all items
                const exercises = exerciseInputs.favorite_exercises
                  .split(",")
                  .map((e) => e.trim())
                  .filter((e) => e.length > 0);
                setLocalData({
                  ...localData,
                  favorite_exercises: exercises.length > 0 ? exercises : null,
                });
                // Update input to cleaned version
                setExerciseInputs({
                  ...exerciseInputs,
                  favorite_exercises:
                    exercises.length > 0 ? exercises.join(", ") : "",
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Disliked exercises</Label>
            <Input
              placeholder="e.g., burpees, running"
              value={exerciseInputs.disliked_exercises}
              onChange={(e) => {
                const rawValue = e.target.value;
                setExerciseInputs({
                  ...exerciseInputs,
                  disliked_exercises: rawValue,
                });
                // Only process completed items (those ending with comma) to preserve spaces while typing
                const parts = rawValue.split(",");
                const completedExercises = parts
                  .slice(0, -1)
                  .map((e) => e.trim())
                  .filter((e) => e.length > 0);
                // Include current item being typed (last part) WITHOUT trimming to preserve spaces
                const currentItem = parts[parts.length - 1] || "";
                const allExercises =
                  currentItem.length > 0
                    ? [...completedExercises, currentItem]
                    : completedExercises;
                setLocalData({
                  ...localData,
                  disliked_exercises:
                    allExercises.length > 0 ? allExercises : null,
                });
              }}
              onBlur={() => {
                // Final processing on blur - trim all items
                const exercises = exerciseInputs.disliked_exercises
                  .split(",")
                  .map((e) => e.trim())
                  .filter((e) => e.length > 0);
                setLocalData({
                  ...localData,
                  disliked_exercises: exercises.length > 0 ? exercises : null,
                });
                // Update input to cleaned version
                setExerciseInputs({
                  ...exerciseInputs,
                  disliked_exercises:
                    exercises.length > 0 ? exercises.join(", ") : "",
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Exercise restrictions</Label>
            <Input
              placeholder="Exercises you cannot do (e.g., due to injury)"
              value={exerciseInputs.exercise_restrictions}
              onChange={(e) => {
                const rawValue = e.target.value;
                setExerciseInputs({
                  ...exerciseInputs,
                  exercise_restrictions: rawValue,
                });
                // Only process completed items (those ending with comma) to preserve spaces while typing
                const parts = rawValue.split(",");
                const completedExercises = parts
                  .slice(0, -1)
                  .map((e) => e.trim())
                  .filter((e) => e.length > 0);
                // Include current item being typed (last part) WITHOUT trimming to preserve spaces
                const currentItem = parts[parts.length - 1] || "";
                const allExercises =
                  currentItem.length > 0
                    ? [...completedExercises, currentItem]
                    : completedExercises;
                setLocalData({
                  ...localData,
                  exercise_restrictions:
                    allExercises.length > 0 ? allExercises : null,
                });
              }}
              onBlur={() => {
                // Final processing on blur - trim all items
                const exercises = exerciseInputs.exercise_restrictions
                  .split(",")
                  .map((e) => e.trim())
                  .filter((e) => e.length > 0);
                setLocalData({
                  ...localData,
                  exercise_restrictions:
                    exercises.length > 0 ? exercises : null,
                });
                // Update input to cleaned version
                setExerciseInputs({
                  ...exerciseInputs,
                  exercise_restrictions:
                    exercises.length > 0 ? exercises.join(", ") : "",
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Strength Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Strength Metrics</CardTitle>
          <CardDescription>
            Your current max lifts (in {profile.preferred_units.weight})
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bench_press">Bench Press Max</Label>
            <Input
              id="bench_press"
              type="number"
              min="0"
              value={localData.current_bench_press_max ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  current_bench_press_max: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder={`Weight in ${profile.preferred_units.weight}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="squat">Squat Max</Label>
            <Input
              id="squat"
              type="number"
              min="0"
              value={localData.current_squat_max ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  current_squat_max: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder={`Weight in ${profile.preferred_units.weight}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadlift">Deadlift Max</Label>
            <Input
              id="deadlift"
              type="number"
              min="0"
              value={localData.current_deadlift_max ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  current_deadlift_max: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder={`Weight in ${profile.preferred_units.weight}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overhead_press">Overhead Press Max</Label>
            <Input
              id="overhead_press"
              type="number"
              min="0"
              value={localData.current_overhead_press_max ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  current_overhead_press_max: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder={`Weight in ${profile.preferred_units.weight}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cardio Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Cardio Metrics</CardTitle>
          <CardDescription>Your current cardio performance</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mile_time">Mile Time (MM:SS)</Label>
            <Input
              id="mile_time"
              type="text"
              value={secondsToTime(localData.current_mile_time ?? null)}
              onChange={(e) => {
                const seconds = timeToSeconds(e.target.value);
                setLocalData({
                  ...localData,
                  current_mile_time: seconds,
                });
              }}
              placeholder="e.g., 8:30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="5k_time">5K Time (MM:SS)</Label>
            <Input
              id="5k_time"
              type="text"
              value={secondsToTime(localData.current_5k_time ?? null)}
              onChange={(e) => {
                const seconds = timeToSeconds(e.target.value);
                setLocalData({
                  ...localData,
                  current_5k_time: seconds,
                });
              }}
              placeholder="e.g., 25:00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resting_hr">Resting Heart Rate (BPM)</Label>
            <Input
              id="resting_hr"
              type="number"
              min="30"
              max="220"
              value={localData.resting_heart_rate ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  resting_heart_rate: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              placeholder="e.g., 65"
            />
          </div>
        </CardContent>
      </Card>

      {/* Body Composition */}
      <Card>
        <CardHeader>
          <CardTitle>Body Composition Goals</CardTitle>
          <CardDescription>Track your body composition targets</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="target_weight">
              Target Weight ({profile.preferred_units.weight})
            </Label>
            <Input
              id="target_weight"
              type="number"
              min="0"
              value={localData.target_weight ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  target_weight: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder={`Weight in ${profile.preferred_units.weight}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_bf">Target Body Fat %</Label>
            <Input
              id="target_bf"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={localData.target_body_fat_percentage ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  target_body_fat_percentage: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder="e.g., 15.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_bf">Current Body Fat %</Label>
            <Input
              id="current_bf"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={localData.current_body_fat_percentage ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  current_body_fat_percentage: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder="e.g., 20.0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Workout Style */}
      <Card>
        <CardHeader>
          <CardTitle>Workout Style Preferences</CardTitle>
          <CardDescription>How you like to work out</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Music Preference</Label>
              <Select
                value={localData.workout_music_preference ?? undefined}
                onValueChange={(v) =>
                  setLocalData({
                    ...localData,
                    workout_music_preference: v
                      ? (v as typeof localData.workout_music_preference)
                      : null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_MUSIC_PREFERENCES.map((pref) => (
                    <SelectItem key={pref} value={pref}>
                      {formatLabel(pref)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Intensity Preference</Label>
              <Select
                value={localData.workout_intensity_preference ?? undefined}
                onValueChange={(v) =>
                  setLocalData({
                    ...localData,
                    workout_intensity_preference: v
                      ? (v as typeof localData.workout_intensity_preference)
                      : null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_INTENSITY_PREFERENCES.map((pref) => (
                    <SelectItem key={pref} value={pref}>
                      {formatLabel(pref)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={localData.prefers_group_workouts ?? false}
                onCheckedChange={(checked) =>
                  setLocalData({
                    ...localData,
                    prefers_group_workouts: checked ? true : null,
                  })
                }
              />
              <Label className="cursor-pointer">Prefer group workouts</Label>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={localData.prefers_outdoor_workouts ?? false}
                onCheckedChange={(checked) =>
                  setLocalData({
                    ...localData,
                    prefers_outdoor_workouts: checked ? true : null,
                  })
                }
              />
              <Label className="cursor-pointer">Prefer outdoor workouts</Label>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition */}
      <Card>
        <CardHeader>
          <CardTitle>Nutrition</CardTitle>
          <CardDescription>
            Dietary preferences and nutrition targets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dietary Restrictions</Label>
            <div className="grid gap-3 sm:grid-cols-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {DIETARY_RESTRICTIONS.map((restriction) => {
                const selected = new Set(localData.dietary_restrictions ?? []);
                return (
                  <label
                    key={restriction}
                    className="flex items-center gap-3 rounded-lg border p-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(restriction)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selected);
                        if (checked) next.add(restriction);
                        else next.delete(restriction);
                        setLocalData({
                          ...localData,
                          dietary_restrictions:
                            next.size > 0 ? Array.from(next) : null,
                        });
                      }}
                    />
                    <Label className="cursor-pointer text-sm">
                      {formatLabel(restriction)}
                    </Label>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Food Allergies</Label>
            <div className="grid gap-3 sm:grid-cols-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {FOOD_ALLERGIES.map((allergy) => {
                const selected = new Set(localData.food_allergies ?? []);
                return (
                  <label
                    key={allergy}
                    className="flex items-center gap-3 rounded-lg border p-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(allergy)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selected);
                        if (checked) next.add(allergy);
                        else next.delete(allergy);
                        setLocalData({
                          ...localData,
                          food_allergies:
                            next.size > 0 ? Array.from(next) : null,
                        });
                      }}
                    />
                    <Label className="cursor-pointer text-sm">
                      {formatLabel(allergy)}
                    </Label>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="calorie_target">Daily Calorie Target</Label>
            <Input
              id="calorie_target"
              type="number"
              min="0"
              value={localData.daily_calorie_target ?? ""}
              onChange={(e) =>
                setLocalData({
                  ...localData,
                  daily_calorie_target: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              placeholder="e.g., 2000"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Macro Targets (grams per day)</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="protein">Protein</Label>
                <Input
                  id="protein"
                  type="number"
                  min="0"
                  value={localData.macro_targets?.protein_g ?? ""}
                  onChange={(e) =>
                    setLocalData({
                      ...localData,
                      macro_targets: {
                        ...localData.macro_targets,
                        protein_g: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                        carbs_g: localData.macro_targets?.carbs_g ?? null,
                        fat_g: localData.macro_targets?.fat_g ?? null,
                      },
                    })
                  }
                  placeholder="e.g., 150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs</Label>
                <Input
                  id="carbs"
                  type="number"
                  min="0"
                  value={localData.macro_targets?.carbs_g ?? ""}
                  onChange={(e) =>
                    setLocalData({
                      ...localData,
                      macro_targets: {
                        ...localData.macro_targets,
                        carbs_g: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                        protein_g: localData.macro_targets?.protein_g ?? null,
                        fat_g: localData.macro_targets?.fat_g ?? null,
                      },
                    })
                  }
                  placeholder="e.g., 200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fat</Label>
                <Input
                  id="fat"
                  type="number"
                  min="0"
                  value={localData.macro_targets?.fat_g ?? ""}
                  onChange={(e) =>
                    setLocalData({
                      ...localData,
                      macro_targets: {
                        ...localData.macro_targets,
                        fat_g: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                        protein_g: localData.macro_targets?.protein_g ?? null,
                        carbs_g: localData.macro_targets?.carbs_g ?? null,
                      },
                    })
                  }
                  placeholder="e.g., 65"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
