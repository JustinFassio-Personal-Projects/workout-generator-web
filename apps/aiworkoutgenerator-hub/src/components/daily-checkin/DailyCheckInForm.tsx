"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

import type {
  CyclePhase,
  LocationType,
  MuscleGroupFocus,
  SorenessArea,
} from "@/types/firestore";
import { useUserDailyState } from "@/hooks/useUserDailyState";
import type { DailyStatePatch } from "@/lib/validation/dailyStateSchemas";
import { toast } from "sonner";

const MUSCLE_GROUPS = [
  "legs",
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
] as const;

// Soreness uses the same muscle groups
const SORENESS_PRESETS = MUSCLE_GROUPS;

const LOCATION_OPTIONS: Array<{ value: LocationType; label: string }> = [
  { value: "home", label: "Home" },
  { value: "gym", label: "Gym" },
  { value: "outdoor", label: "Outdoor" },
  { value: "hotel", label: "Hotel" },
  { value: "office", label: "Office" },
  { value: "other", label: "Other" },
];

const CYCLE_PHASE_OPTIONS: Array<{ value: CyclePhase; label: string }> = [
  { value: "menstrual", label: "Menstrual" },
  { value: "follicular", label: "Follicular" },
  { value: "ovulation", label: "Ovulation" },
  { value: "luteal", label: "Luteal" },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getSorenessLevel(areas: SorenessArea[], area: string): number | null {
  return areas.find((a) => a.area === area)?.level ?? null;
}

function setSorenessLevel(
  areas: SorenessArea[],
  area: string,
  level: number
): SorenessArea[] {
  const next = areas.filter((a) => a.area !== area);
  next.push({ area, level });
  return next;
}

function removeSorenessArea(
  areas: SorenessArea[],
  area: string
): SorenessArea[] {
  return areas.filter((a) => a.area !== area);
}

// ─────────────────────────────────────────────────────────────
// Muscle Group Focus Helper Functions
// ─────────────────────────────────────────────────────────────

function getMuscleGroupFocus(
  groups: MuscleGroupFocus[],
  area: string
): MuscleGroupFocus | null {
  return groups.find((g) => g.area === area) ?? null;
}

/**
 * Redistribute percentages among unlocked groups to ensure total = 100%.
 * Locked groups keep their percentages, unlocked groups split the remainder equally.
 * The last unlocked group absorbs any rounding remainder.
 */
function redistributePercentages(
  groups: MuscleGroupFocus[]
): MuscleGroupFocus[] {
  if (groups.length === 0) return [];

  const lockedGroups = groups.filter((g) => g.locked);
  const unlockedGroups = groups.filter((g) => !g.locked);

  const lockedTotal = lockedGroups.reduce((sum, g) => sum + g.percentage, 0);
  const remainingPercentage = Math.max(0, 100 - lockedTotal);

  if (unlockedGroups.length === 0) {
    // All groups are locked - just return as is
    return groups;
  }

  const perUnlocked = Math.floor(remainingPercentage / unlockedGroups.length);
  const remainder = remainingPercentage - perUnlocked * unlockedGroups.length;

  // Assign percentages to unlocked groups, last one gets remainder
  const redistributedUnlocked = unlockedGroups.map((g, idx) => ({
    ...g,
    percentage:
      idx === unlockedGroups.length - 1 ? perUnlocked + remainder : perUnlocked,
  }));

  // Preserve original order
  return groups.map((g) => {
    if (g.locked) return g;
    const redistributed = redistributedUnlocked.find((r) => r.area === g.area);
    return redistributed ?? g;
  });
}

/**
 * Add a muscle group to focus array with auto-distributed percentage.
 */
function addMuscleGroupFocus(
  groups: MuscleGroupFocus[],
  area: string
): MuscleGroupFocus[] {
  // Don't add if already exists
  if (groups.some((g) => g.area === area)) return groups;

  // Add new group as unlocked with 0% (will be redistributed)
  const newGroups = [...groups, { area, percentage: 0, locked: false }];
  return redistributePercentages(newGroups);
}

/**
 * Remove a muscle group and redistribute remaining percentages.
 */
function removeMuscleGroupFocus(
  groups: MuscleGroupFocus[],
  area: string
): MuscleGroupFocus[] {
  const filtered = groups.filter((g) => g.area !== area);
  if (filtered.length === 0) return [];

  // Unlock all remaining groups for redistribution
  const unlocked = filtered.map((g) => ({ ...g, locked: false }));
  return redistributePercentages(unlocked);
}

/**
 * Update a muscle group's percentage and mark it as locked.
 * Redistributes remaining percentage among other unlocked groups.
 */
function setMuscleGroupPercentage(
  groups: MuscleGroupFocus[],
  area: string,
  newPercentage: number
): MuscleGroupFocus[] {
  // Clamp requested percentage to valid range
  const clampedPercentage = Math.max(
    0,
    Math.min(100, Math.round(newPercentage))
  );
  // Compute how much percentage is already locked on other groups so locked total never exceeds 100
  const otherLockedTotal = groups
    .filter((g) => g.locked && g.area !== area)
    .reduce((sum, g) => sum + (g.percentage ?? 0), 0);
  const remainingAvailable = Math.max(0, 100 - otherLockedTotal);
  const effectivePercentage = Math.min(clampedPercentage, remainingAvailable);

  // Update the target group and mark as locked
  const updated = groups.map((g) =>
    g.area === area
      ? { ...g, percentage: effectivePercentage, locked: true }
      : g
  );

  return redistributePercentages(updated);
}

/**
 * Check if this is the last unlocked group (which shows remainder and can't be adjusted).
 */
function isLastUnlockedGroup(
  groups: MuscleGroupFocus[],
  area: string
): boolean {
  const unlockedGroups = groups.filter((g) => !g.locked);
  return unlockedGroups.length === 1 && unlockedGroups[0]?.area === area;
}

export function DailyCheckInForm() {
  const { dateISO, data, loading, error, upsert } = useUserDailyState();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Track if component is mounted to prevent navigation after unmount
  const isMountedRef = useRef(true);
  // Track timeout ID to clear on unmount
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initial: DailyStatePatch = useMemo(
    () => ({
      energy_level: 6,
      sleep_quality: 6,
      sleep_hours: null,
      stress_level: 4,
      motivation_level: 6,
      soreness_areas: [],
      muscle_group_focus: [],
      current_location: "home",
      available_time: null,
      weather_condition: null,
      temperature: null,
      cycle_phase: null,
      cycle_symptoms: null,
      data_source: "manual",
    }),
    []
  );

  const [form, setForm] = useState<DailyStatePatch>(initial);
  const [cycleSymptomsText, setCycleSymptomsText] = useState("");
  // Track if we've initialized form from Firestore data to prevent unnecessary re-syncs
  const hasInitializedFromDataRef = useRef(false);

  // Reset initialization flag when date changes (so we can sync new day's data)
  useEffect(() => {
    hasInitializedFromDataRef.current = false;
  }, [dateISO]);

  // Sync form state with loaded data from Firestore
  // This is safe because:
  // 1. We only sync once when data first becomes available (tracked by hasInitializedFromDataRef)
  // 2. The dependency [data] ensures we sync when Firestore data changes
  // 3. This is a controlled sync pattern - external data source (Firestore) -> local form state
  // 4. The ref is reset when dateISO changes, allowing sync of new day's data
  useEffect(() => {
    if (!data) return;
    // Only sync once when data first loads for the current date
    // This prevents overwriting user edits with stale Firestore data
    if (!hasInitializedFromDataRef.current) {
      setForm({
        energy_level: data.energy_level,
        sleep_quality: data.sleep_quality,
        sleep_hours: data.sleep_hours,
        stress_level: data.stress_level,
        motivation_level: data.motivation_level,
        soreness_areas: data.soreness_areas ?? [],
        muscle_group_focus: data.muscle_group_focus ?? [],
        current_location: data.current_location,
        available_time: data.available_time,
        weather_condition: data.weather_condition,
        temperature: data.temperature,
        cycle_phase: data.cycle_phase,
        cycle_symptoms: data.cycle_symptoms,
        data_source: data.data_source,
      });
      setCycleSymptomsText((data.cycle_symptoms ?? []).join(", "));
      hasInitializedFromDataRef.current = true;
    }
  }, [data, dateISO]);

  // Cleanup: mark component as unmounted and clear any pending timeouts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await upsert(form);
      // Only show success and navigate if component is still mounted
      if (isMountedRef.current) {
        toast.success("Check-in saved successfully!", {
          description: `Your daily check-in for ${dateISO} has been saved. Redirecting to workout generation...`,
          duration: 2000,
        });
        // Navigate to generate page after a brief delay to show the success message
        // Store timeout ID and clear on unmount to prevent navigation after component unmounts
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            router.push("/generate");
          }
          timeoutRef.current = null;
        }, 1500);
      }
    } catch (err) {
      // Only show error if component is still mounted
      if (isMountedRef.current) {
        toast.error("Failed to save check-in", {
          description:
            err instanceof Error ? err.message : "An unexpected error occurred",
          duration: 5000,
        });
      }
    } finally {
      // Always reset submitting state if component is still mounted
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading…</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
        {error}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Check-In</CardTitle>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Date: <span className="font-medium">{dateISO}</span>
            </p>
            {data?.saved_at_datetime && (
              <p>
                Last saved:{" "}
                <span className="font-medium">
                  {new Date(data.saved_at_datetime).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Energy level ({form.energy_level})</Label>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[form.energy_level]}
              onValueChange={(v) =>
                setForm({ ...form, energy_level: clampInt(v[0] ?? 1, 1, 10) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Sleep quality ({form.sleep_quality})</Label>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[form.sleep_quality]}
              onValueChange={(v) =>
                setForm({ ...form, sleep_quality: clampInt(v[0] ?? 1, 1, 10) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sleep_hours">Sleep hours (optional)</Label>
            <Input
              id="sleep_hours"
              type="number"
              inputMode="decimal"
              placeholder="e.g., 7.5"
              value={form.sleep_hours ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setForm({
                  ...form,
                  sleep_hours: val === "" ? null : Number(val),
                });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Stress level ({form.stress_level})</Label>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[form.stress_level]}
              onValueChange={(v) =>
                setForm({ ...form, stress_level: clampInt(v[0] ?? 1, 1, 10) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Motivation level ({form.motivation_level})</Label>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[form.motivation_level]}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  motivation_level: clampInt(v[0] ?? 1, 1, 10),
                })
              }
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <Label>Soreness areas (optional)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Select areas you feel sore and set a level (1–10).
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {SORENESS_PRESETS.map((area) => {
                const checked =
                  getSorenessLevel(form.soreness_areas, area) !== null;
                const level = getSorenessLevel(form.soreness_areas, area) ?? 4;
                return (
                  <div key={area} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`soreness_${area}`}
                        checked={checked}
                        onCheckedChange={(v) => {
                          const isChecked = v === true;
                          setForm({
                            ...form,
                            soreness_areas: isChecked
                              ? setSorenessLevel(
                                  form.soreness_areas,
                                  area,
                                  level
                                )
                              : removeSorenessArea(form.soreness_areas, area),
                          });
                        }}
                      />
                      <Label
                        htmlFor={`soreness_${area}`}
                        className="capitalize"
                      >
                        {area}
                      </Label>
                    </div>
                    {checked && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Level ({level})
                        </Label>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[level]}
                          onValueChange={(v) => {
                            const nextLevel = clampInt(v[0] ?? 1, 1, 10);
                            setForm({
                              ...form,
                              soreness_areas: setSorenessLevel(
                                form.soreness_areas,
                                area,
                                nextLevel
                              ),
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Muscle Groups Focus Section */}
          <div className="space-y-3">
            <div>
              <Label>Target muscle groups (optional)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Select which muscle groups to focus on and adjust the percentage
                of your workout dedicated to each.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {MUSCLE_GROUPS.map((area) => {
                const focus = getMuscleGroupFocus(
                  form.muscle_group_focus,
                  area
                );
                const isSelected = focus !== null;
                const percentage = focus?.percentage ?? 0;
                const isLocked = focus?.locked ?? false;
                const isLastUnlocked =
                  isSelected &&
                  isLastUnlockedGroup(form.muscle_group_focus, area);
                const sorenessLevel = getSorenessLevel(
                  form.soreness_areas,
                  area
                );
                const isSore = sorenessLevel !== null && sorenessLevel >= 7;

                return (
                  <div
                    key={area}
                    className={`rounded-md border p-3 space-y-3 ${
                      isSore && isSelected
                        ? "border-amber-500/50 bg-amber-500/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`muscle_${area}`}
                        checked={isSelected}
                        onCheckedChange={(v) => {
                          const isChecked = v === true;
                          if (isChecked) {
                            // Check if this area is marked as sore
                            if (isSore) {
                              toast.warning(
                                `Heads up: You marked ${area} as sore (level ${sorenessLevel}/10). Your workout will still include it, but consider reducing the focus percentage.`,
                                { duration: 5000 }
                              );
                            }
                            setForm({
                              ...form,
                              muscle_group_focus: addMuscleGroupFocus(
                                form.muscle_group_focus,
                                area
                              ),
                            });
                          } else {
                            setForm({
                              ...form,
                              muscle_group_focus: removeMuscleGroupFocus(
                                form.muscle_group_focus,
                                area
                              ),
                            });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`muscle_${area}`}
                        className="capitalize flex items-center gap-2"
                      >
                        {area}
                        {isSore && isSelected && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            (sore)
                          </span>
                        )}
                      </Label>
                    </div>
                    {isSelected && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            Focus: {percentage}%
                            {isLastUnlocked && (
                              <span className="ml-1 text-muted-foreground/60">
                                (remainder)
                              </span>
                            )}
                            {isLocked && !isLastUnlocked && (
                              <span className="ml-1 text-muted-foreground/60">
                                (locked)
                              </span>
                            )}
                          </Label>
                        </div>
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[percentage]}
                          disabled={isLastUnlocked}
                          onValueChange={(v) => {
                            const newPercentage = v[0] ?? 0;
                            setForm({
                              ...form,
                              muscle_group_focus: setMuscleGroupPercentage(
                                form.muscle_group_focus,
                                area,
                                newPercentage
                              ),
                            });
                          }}
                          className={isLastUnlocked ? "opacity-50" : ""}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total percentage indicator */}
            {form.muscle_group_focus.length > 0 && (
              <div className="text-sm text-muted-foreground text-right">
                Total:{" "}
                <span className="font-medium">
                  {form.muscle_group_focus.reduce(
                    (sum, g) => sum + g.percentage,
                    0
                  )}
                  %
                </span>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Current location</Label>
              <Select
                value={form.current_location}
                onValueChange={(v) =>
                  setForm({ ...form, current_location: v as LocationType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="available_time">
                Available time (minutes, optional)
              </Label>
              <Input
                id="available_time"
                type="number"
                inputMode="numeric"
                placeholder="e.g., 45"
                value={form.available_time ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    available_time: val === "" ? null : Number(val),
                  });
                }}
              />
            </div>
          </div>

          {form.current_location === "outdoor" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weather_condition">
                  Weather condition (optional)
                </Label>
                <Input
                  id="weather_condition"
                  type="text"
                  placeholder="e.g., sunny"
                  value={form.weather_condition ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weather_condition: e.target.value || null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (optional)</Label>
                <Input
                  id="temperature"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 72"
                  value={form.temperature ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      temperature: val === "" ? null : Number(val),
                    });
                  }}
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div>
              <Label>Cycle tracking (optional)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                If applicable, you can set cycle phase and symptoms.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cycle phase</Label>
                <Select
                  value={form.cycle_phase ?? undefined}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      cycle_phase: (v as CyclePhase) || null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLE_PHASE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cycle_symptoms">
                  Cycle symptoms (comma-separated)
                </Label>
                <Input
                  id="cycle_symptoms"
                  type="text"
                  placeholder="e.g., cramps, fatigue"
                  value={cycleSymptomsText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCycleSymptomsText(raw);
                    const tokens = raw
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0);
                    setForm({
                      ...form,
                      cycle_symptoms: tokens.length > 0 ? tokens : null,
                    });
                  }}
                  onBlur={() => {
                    const tokens = cycleSymptomsText
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0);
                    const cleaned = tokens.length > 0 ? tokens.join(", ") : "";
                    setCycleSymptomsText(cleaned);
                    setForm({
                      ...form,
                      cycle_symptoms: tokens.length > 0 ? tokens : null,
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save check-in"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tip: You can update this any time today — it’s meant to reflect how you
        feel right now.
      </div>
    </form>
  );
}
