"use client";

import React from "react";
import {
  CheckCircle2,
  Target,
  Dumbbell,
  Activity,
  Wrench,
  User,
  Calendar,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryDisplayLabel } from "@/lib/equipment-categories";
import type { WebsiteOnboardingData } from "@/types/websiteOnboarding";

interface PlanBuilderSummaryProps {
  data: WebsiteOnboardingData;
  className?: string;
}

// Display labels for enum values
const FITNESS_LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  athlete: "Athlete",
};

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  lightly_active: "Lightly Active",
  moderately_active: "Moderately Active",
  very_active: "Very Active",
  extremely_active: "Extremely Active",
};

// Equipment access is now string[] of categories, so we don't need enum labels

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

/**
 * Displays a summary of Phase A data collected on the website.
 * Shows the user what they've already completed before starting Phase B.
 */
export function PlanBuilderSummary({
  data,
  className,
}: PlanBuilderSummaryProps) {
  const levelLabel =
    FITNESS_LEVEL_LABELS[data.fitness_level] || data.fitness_level;
  const activityLabel =
    ACTIVITY_LEVEL_LABELS[data.current_activity_level] ||
    data.current_activity_level;
  // equipment_access is now string[] of categories
  const equipmentCategories = Array.isArray(data.equipment_access)
    ? data.equipment_access
    : [];

  // Format units display
  const unitsDisplay = `${data.preferred_units.weight}/${data.preferred_units.height}`;

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            You&apos;ve already completed:
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what you shared on the website. We&apos;ll collect a few
          more details to personalize your workout.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Fitness Goals */}
        <div className="flex items-start gap-3">
          <Target className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Fitness Goals</span>
            <div className="flex flex-wrap gap-1.5">
              {data.fitness_goals.map((goal) => (
                <Badge key={goal} variant="secondary" className="text-xs">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Fitness Level */}
        <div className="flex items-center gap-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Fitness Level:</span>
            <span className="text-sm text-muted-foreground">{levelLabel}</span>
          </div>
        </div>

        {/* Activity Level */}
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Activity Level:</span>
            <span className="text-sm text-muted-foreground">
              {activityLabel}
            </span>
          </div>
        </div>

        {/* Equipment Categories */}
        <div className="flex items-start gap-3">
          <Wrench className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Equipment Categories</span>
            {equipmentCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {equipmentCategories.map((category) => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {getCategoryDisplayLabel(category)}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                No equipment categories selected
              </span>
            )}
          </div>
        </div>

        {/* Units */}
        <div className="flex items-center gap-3">
          <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Units:</span>
            <span className="text-sm text-muted-foreground">
              {unitsDisplay}
            </span>
          </div>
        </div>

        {/* Gender (if provided and not "prefer not to say") */}
        {data.gender && data.gender !== "prefer_not_to_say" && (
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Gender:</span>
              <span className="text-sm text-muted-foreground">
                {GENDER_LABELS[data.gender] || data.gender}
              </span>
            </div>
          </div>
        )}

        {/* Age (if provided) */}
        {data.age && (
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Age:</span>
              <span className="text-sm text-muted-foreground">
                {data.age} years old
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
