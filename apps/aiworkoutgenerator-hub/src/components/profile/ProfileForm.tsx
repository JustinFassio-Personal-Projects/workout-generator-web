"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { type Phase1ProfileInput } from "@/services/profile/ProfileService";
import {
  validateCategories,
  getCategoryDisplayLabel,
} from "@/lib/equipment-categories";
import type {
  Gender,
  FitnessLevel,
  ActivityLevel,
  PreferredUnits,
} from "@/types/firestore";

const GOALS = [
  "Build muscle",
  "Lose fat",
  "Improve endurance",
  "Increase strength",
  "Mobility & flexibility",
  "General health",
] as const;

const COMMON_INJURIES = [
  "Knee",
  "Shoulder",
  "Back",
  "Hip",
  "Ankle",
  "Wrist",
  "Neck",
] as const;

const COMMON_CONDITIONS = [
  "None",
  "High blood pressure",
  "Asthma",
  "Diabetes",
  "Heart condition",
  "Pregnancy",
] as const;

export function ProfileForm() {
  const { profile, loading, error, updateProfile } = useUserProfile();
  const { user } = useUser();
  const { sessionId } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Phase1ProfileInput>>({});

  // Store original values to detect changes
  const [originalData, setOriginalData] = useState<Partial<Phase1ProfileInput>>(
    {}
  );

  // Track last initialized profile to prevent re-initialization when profile hasn't changed
  const lastInitializedProfileRef = useRef<{
    gender?: string;
    fitness_level?: string;
    id?: string;
  } | null>(null);

  // Initialize form data from profile when it loads or updates
  useEffect(() => {
    if (profile && !loading) {
      const profileGender = profile.gender ?? "prefer_not_to_say";
      const profileFitnessLevel = profile.fitness_level ?? "beginner";
      const lastProfile = lastInitializedProfileRef.current;

      // Only re-initialize if this is a different profile or if gender/fitness_level actually changed
      const needsInit =
        !lastProfile ||
        lastProfile.id !== profile.id ||
        lastProfile.gender !== profileGender ||
        lastProfile.fitness_level !== profileFitnessLevel;

      if (needsInit) {
        // Update ref with current profile values
        lastInitializedProfileRef.current = {
          id: profile.id,
          gender: profileGender,
          fitness_level: profileFitnessLevel,
        };

        const data: Partial<Phase1ProfileInput> = {
          first_name: profile.first_name,
          last_name: profile.last_name,
          age: profile.age,
          gender: profileGender,
          weight: profile.weight,
          height: profile.height,
          preferred_units: profile.preferred_units,
          fitness_level: profileFitnessLevel,
          current_activity_level: profile.current_activity_level,
          fitness_goals: profile.fitness_goals ?? [],
          injuries: profile.injuries ?? [],
          injury_details: profile.injury_details,
          medical_conditions: profile.medical_conditions ?? [],
          medical_notes: profile.medical_notes,
          equipment_access: profile.equipment_access ?? [],
          available_equipment: profile.available_equipment ?? [],
        };
        setFormData(data);
        setOriginalData(data);
      }
    }
  }, [profile, loading]);

  // Handle fitness level changes - validate and filter equipment categories
  useEffect(() => {
    if (!formData.fitness_level || !formData.equipment_access) return;
    if (formData.equipment_access.length === 0) return;

    const validCategories = validateCategories(
      formData.equipment_access,
      formData.fitness_level
    );

    if (validCategories.length !== formData.equipment_access.length) {
      // Categories were filtered out
      setFormData((prev) => ({
        ...prev,
        equipment_access: validCategories,
      }));
      toast.warning("Equipment categories updated", {
        description:
          "Some equipment categories were removed because they're not available for your fitness level.",
        duration: 5000,
      });
    }
  }, [formData.fitness_level, formData.equipment_access]);

  // Calculate if there are changes
  const hasChanges = useMemo(() => {
    if (loading || !profile) return false;

    const compareArray = (
      a: string[] | undefined,
      b: string[] | undefined
    ): boolean => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    };

    // Normalize gender values: undefined/empty string should be treated as "prefer_not_to_say" for comparison
    const normalizedFormGender = formData.gender || "prefer_not_to_say";
    const normalizedOriginalGender = originalData.gender || "prefer_not_to_say";
    const genderChanged = normalizedFormGender !== normalizedOriginalGender;

    return (
      formData.first_name !== originalData.first_name ||
      formData.last_name !== originalData.last_name ||
      formData.age !== originalData.age ||
      genderChanged ||
      formData.weight !== originalData.weight ||
      formData.height !== originalData.height ||
      JSON.stringify(formData.preferred_units) !==
        JSON.stringify(originalData.preferred_units) ||
      formData.fitness_level !== originalData.fitness_level ||
      formData.current_activity_level !== originalData.current_activity_level ||
      !compareArray(formData.fitness_goals, originalData.fitness_goals) ||
      !compareArray(formData.injuries, originalData.injuries) ||
      formData.injury_details !== originalData.injury_details ||
      !compareArray(
        formData.medical_conditions,
        originalData.medical_conditions
      ) ||
      formData.medical_notes !== originalData.medical_notes ||
      !compareArray(formData.equipment_access, originalData.equipment_access) ||
      !compareArray(
        formData.available_equipment,
        originalData.available_equipment
      )
    );
  }, [formData, originalData, loading, profile]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      errors.first_name = "First name is required";
    }

    if (!formData.last_name?.trim()) {
      errors.last_name = "Last name is required";
    }

    if (!formData.age || formData.age < 13 || formData.age > 120) {
      errors.age = "Age must be between 13 and 120";
    }

    if (!formData.weight || formData.weight <= 0) {
      errors.weight = "Weight must be greater than 0";
    }

    if (!formData.height || formData.height <= 0) {
      errors.height = "Height must be greater than 0";
    }

    if (!formData.gender) {
      errors.gender = "Gender is required";
    }

    if (!formData.fitness_level) {
      errors.fitness_level = "Fitness level is required";
    }

    if (!formData.current_activity_level) {
      errors.current_activity_level = "Activity level is required";
    }

    if (!formData.fitness_goals || formData.fitness_goals.length === 0) {
      errors.fitness_goals = "At least one fitness goal is required";
    }

    return errors;
  }, [formData]);

  const isValid = Object.keys(validationErrors).length === 0;

  const handleSave = async () => {
    if (!profile || !isValid) return;

    setSubmitting(true);
    const saveData = {
      first_name: formData.first_name!,
      last_name: formData.last_name!,
      age: formData.age!,
      gender: formData.gender ?? "prefer_not_to_say",
      weight: formData.weight!,
      height: formData.height!,
      preferred_units: formData.preferred_units!,
      fitness_level: formData.fitness_level!,
      current_activity_level: formData.current_activity_level!,
      fitness_goals: formData.fitness_goals!,
      injuries: formData.injuries ?? [],
      injury_details: formData.injury_details ?? null,
      medical_conditions: formData.medical_conditions ?? [],
      medical_notes: formData.medical_notes ?? null,
      equipment_access: formData.equipment_access ?? [],
      available_equipment: formData.available_equipment ?? [],
    };
    try {
      await updateProfile(saveData);

      // Log profile update activity
      if (user) {
        logUserActivity(
          user.uid,
          "profile:update",
          "profile",
          user.uid,
          {
            fields_updated: Object.keys(saveData),
          },
          sessionId || undefined
        ).catch(console.error);
      }

      // Update original data after successful save
      setOriginalData({ ...formData });

      toast.success("Profile updated", {
        description: "Your profile has been updated successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = <K extends keyof Phase1ProfileInput>(
    field: K,
    value: Phase1ProfileInput[K]
  ) => {
    // Prevent empty string values for gender and fitness_level
    if (field === "gender" && value === "") {
      return; // Ignore empty string values
    }
    if (field === "fitness_level" && value === "") {
      return; // Ignore empty string values
    }

    setFormData((prev) => {
      return { ...prev, [field]: value };
    });
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
        {error}
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const preferred_units: PreferredUnits = formData.preferred_units ?? {
    weight: "lb",
    height: "in",
    distance: "mi",
    temperature: "f",
  };

  const injuries = new Set(formData.injuries ?? []);
  const medical_conditions = new Set(formData.medical_conditions ?? []);
  const fitness_goals = new Set(formData.fitness_goals ?? []);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      {/* Basic Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
          <CardDescription>
            This helps personalize your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={formData.first_name ?? ""}
                onChange={(e) => updateField("first_name", e.target.value)}
                placeholder="Jane"
              />
              {validationErrors.first_name && (
                <p className="text-sm text-destructive">
                  {validationErrors.first_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={formData.last_name ?? ""}
                onChange={(e) => updateField("last_name", e.target.value)}
                placeholder="Doe"
              />
              {validationErrors.last_name && (
                <p className="text-sm text-destructive">
                  {validationErrors.last_name}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={formData.gender ?? "prefer_not_to_say"}
              onValueChange={(v) => updateField("gender", v as Gender)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="prefer_not_to_say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.gender && (
              <p className="text-sm text-destructive">
                {validationErrors.gender}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Body Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle>Body Stats</CardTitle>
          <CardDescription>
            Used for scaling workouts and recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                value={formData.age ?? ""}
                onChange={(e) => updateField("age", Number(e.target.value))}
                placeholder="30"
              />
              {validationErrors.age && (
                <p className="text-sm text-destructive">
                  {validationErrors.age}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <div className="flex gap-2">
                <Input
                  id="height"
                  type="number"
                  inputMode="decimal"
                  value={formData.height ?? ""}
                  onChange={(e) =>
                    updateField("height", Number(e.target.value))
                  }
                  placeholder="72"
                />
                <Select
                  value={preferred_units.height}
                  onValueChange={(v) =>
                    updateField("preferred_units", {
                      ...preferred_units,
                      height: v as PreferredUnits["height"],
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">in</SelectItem>
                    <SelectItem value="cm">cm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {validationErrors.height && (
                <p className="text-sm text-destructive">
                  {validationErrors.height}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <div className="flex gap-2">
                <Input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  value={formData.weight ?? ""}
                  onChange={(e) =>
                    updateField("weight", Number(e.target.value))
                  }
                  placeholder="180"
                />
                <Select
                  value={preferred_units.weight}
                  onValueChange={(v) =>
                    updateField("preferred_units", {
                      ...preferred_units,
                      weight: v as PreferredUnits["weight"],
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {validationErrors.weight && (
                <p className="text-sm text-destructive">
                  {validationErrors.weight}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fitness Section */}
      <Card>
        <CardHeader>
          <CardTitle>Fitness Level</CardTitle>
          <CardDescription>
            So workouts match your current ability and schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fitness level</Label>
              <Select
                value={formData.fitness_level ?? "beginner"}
                onValueChange={(v) =>
                  updateField("fitness_level", v as FitnessLevel)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="athlete">Athlete</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.fitness_level && (
                <p className="text-sm text-destructive">
                  {validationErrors.fitness_level}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Activity level</Label>
              <Select
                value={formData.current_activity_level ?? "moderately_active"}
                onValueChange={(v) =>
                  updateField("current_activity_level", v as ActivityLevel)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="lightly_active">Lightly active</SelectItem>
                  <SelectItem value="moderately_active">
                    Moderately active
                  </SelectItem>
                  <SelectItem value="very_active">Very active</SelectItem>
                  <SelectItem value="extremely_active">
                    Extremely active
                  </SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.current_activity_level && (
                <p className="text-sm text-destructive">
                  {validationErrors.current_activity_level}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
          <CardDescription>
            Pick at least one—this steers workout recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((goal) => (
              <label
                key={goal}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={fitness_goals.has(goal)}
                  onCheckedChange={() => {
                    const next = new Set(fitness_goals);
                    if (next.has(goal)) next.delete(goal);
                    else next.add(goal);
                    updateField("fitness_goals", Array.from(next));
                  }}
                />
                <Label className="cursor-pointer">{goal}</Label>
              </label>
            ))}
          </div>
          {validationErrors.fitness_goals && (
            <p className="text-sm text-destructive">
              {validationErrors.fitness_goals}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Safety Section */}
      <Card>
        <CardHeader>
          <CardTitle>Safety</CardTitle>
          <CardDescription>
            Help us avoid movements that might aggravate injuries or conditions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-medium">Injuries (optional)</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMMON_INJURIES.map((injury) => (
                <label
                  key={injury}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={injuries.has(injury)}
                    onCheckedChange={() => {
                      const next = new Set(injuries);
                      if (next.has(injury)) next.delete(injury);
                      else next.add(injury);
                      updateField("injuries", Array.from(next));
                    }}
                  />
                  <Label className="cursor-pointer">{injury}</Label>
                </label>
              ))}
            </div>
            <Textarea
              placeholder="Any details? (optional)"
              value={formData.injury_details ?? ""}
              onChange={(e) =>
                updateField(
                  "injury_details",
                  e.target.value.trim() ? e.target.value : null
                )
              }
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-medium">
              Medical conditions (optional)
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMMON_CONDITIONS.map((condition) => (
                <label
                  key={condition}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={
                      condition === "None"
                        ? medical_conditions.size === 0
                        : medical_conditions.has(condition)
                    }
                    onCheckedChange={() => {
                      if (condition === "None") {
                        updateField("medical_conditions", []);
                      } else {
                        const next = new Set(medical_conditions);
                        if (next.has(condition)) next.delete(condition);
                        else next.add(condition);
                        updateField("medical_conditions", Array.from(next));
                      }
                    }}
                  />
                  <Label className="cursor-pointer">{condition}</Label>
                </label>
              ))}
            </div>
            <Textarea
              placeholder="Any notes? (optional)"
              value={formData.medical_notes ?? ""}
              onChange={(e) =>
                updateField(
                  "medical_notes",
                  e.target.value.trim() ? e.target.value : null
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>
            Fitness level determines available equipment categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Equipment Categories</div>
            {Array.isArray(formData.equipment_access) &&
            formData.equipment_access.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.equipment_access.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {getCategoryDisplayLabel(category)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No categories selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Available Equipment</div>
            <p className="text-sm text-muted-foreground">
              {formData.available_equipment?.length ?? 0} equipment items
              selected
            </p>
          </div>

          <Button variant="outline" asChild>
            <Link href="/equipment">Manage Equipment</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end pt-4 border-t">
        <Button
          type="submit"
          disabled={submitting || !hasChanges || !isValid}
          className="min-w-[120px]"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
