"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  RefreshCw,
  Dumbbell,
  TrendingUp,
  Zap,
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import type { WorkoutSummary } from "@/types/workoutSummary";
import {
  type OverloadProtocol,
  type OverloadProtocolConfig,
  getAllProtocols,
  getRecommendedProtocol,
  getProtocolGuidance,
} from "@/types/overloadProtocol";
import type { SessionExerciseSummary } from "@/types/sessionSummary";
import type { WorkoutSummariesFilters } from "@/hooks/useWorkoutSummaries";
import { Input } from "@/components/ui/input";

interface WorkoutIterationSelectionProps {
  summaries: WorkoutSummary[];
  loading: boolean;
  error?: Error | null;
  onRefresh?: () => void | Promise<void>;
  selectedSummaryId: string | null;
  selectedProtocol: OverloadProtocol | null;
  onSelectSummary: (summaryId: string) => void;
  onSelectProtocol: (protocol: OverloadProtocol) => void;
  onContinue: () => void;
  /** User fitness goals for smart protocol recommendation (e.g. from profile). */
  fitnessGoals?: string[];
  /** Optional filters for the summary list (date, trainer, focus, search). */
  filters?: WorkoutSummariesFilters;
  /** Called when user changes filters (resets pagination on parent). */
  onFiltersChange?: (filters: WorkoutSummariesFilters) => void;
}

/**
 * Get the icon component for a protocol
 */
function ProtocolIcon({
  icon,
  className,
}: {
  icon: OverloadProtocolConfig["icon"];
  className?: string;
}) {
  switch (icon) {
    case "weight":
      return <Dumbbell className={className} />;
    case "trending-up":
      return <TrendingUp className={className} />;
    case "zap":
      return <Zap className={className} />;
    default:
      return <TrendingUp className={className} />;
  }
}

/**
 * Protocol selection card component
 */
function ProtocolCard({
  protocol,
  isSelected,
  isRecommended,
  onSelect,
}: {
  protocol: OverloadProtocolConfig;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
        "hover:border-primary/50 hover:bg-accent/30",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-card"
      )}
    >
      {/* Recommended badge */}
      {isRecommended && !isSelected && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30"
        >
          Recommended
        </Badge>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isSelected ? "bg-primary/10" : "bg-muted"
          )}
        >
          <ProtocolIcon
            icon={protocol.icon}
            className={cn(
              "w-5 h-5",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{protocol.shortName}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {protocol.description}
          </p>

          {/* Best for tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {protocol.bestFor.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Format "Previous" column for an exercise (sets×reps @ load).
 */
function formatPreviousExercise(exercise: SessionExerciseSummary): string {
  const sets = exercise.setsPlanned ?? 0;
  const firstSet = exercise.setDetails?.[0];
  const reps = firstSet?.reps ?? "—";
  const load = firstSet?.actualWeight ?? firstSet?.weight ?? null;
  if (load) return `${sets}×${reps} @ ${load}`;
  return `${sets}×${reps}`;
}

/**
 * Get "Next" progression label and indicator for a protocol (heuristic, no AI).
 */
function getProgressionNext(protocol: OverloadProtocol): {
  label: string;
  indicator: string;
} {
  switch (protocol) {
    case "linear_load":
      return { label: "Same reps, +2–5% load", indicator: "↑ weight" };
    case "double_progression":
      return { label: "+1–2 reps or same weight", indicator: "↑ reps" };
    case "density_leverage":
      return {
        label: "Shorter rest or harder variation",
        indicator: "variation",
      };
    default:
      return { label: "Progress per protocol", indicator: "—" };
  }
}

/**
 * Progression preview: previous workout exercises vs expected next (protocol-based).
 */
function ProgressionPreview({
  summary,
  protocol,
}: {
  summary: WorkoutSummary;
  protocol: OverloadProtocol;
}) {
  const exercises = summary.sections?.flatMap((s) => s.exercises ?? []) ?? [];
  const { label: nextLabel, indicator } = getProgressionNext(protocol);

  if (exercises.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">Progression Preview</h4>
          <p className="text-sm text-muted-foreground">
            No exercise details in this report. Progression will follow{" "}
            {protocol.replace("_", " ")}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <h4 className="font-medium text-sm mb-3">Progression Preview</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" role="table">
            <caption className="sr-only">
              Previous workout exercises and expected progression for{" "}
              {protocol.replace("_", " ")}
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium">Exercise</th>
                <th className="text-left py-2 pr-4 font-medium">Previous</th>
                <th className="text-left py-2 pr-4 font-medium">
                  Next ({protocol.replace("_", " ")})
                </th>
                <th className="text-left py-2 font-medium w-20">Change</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex, i) => (
                <tr
                  key={`${ex.name}-${i}`}
                  className="border-b border-border/50"
                >
                  <td className="py-2 pr-4 font-medium">{ex.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {formatPreviousExercise(ex)}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {nextLabel}
                  </td>
                  <td className="py-2 text-muted-foreground">{indicator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Workout summary preview card
 */
function SummaryPreview({ summary }: { summary: WorkoutSummary }) {
  const completedDate = summary.completed_at?.toDate?.();
  const formattedDate = completedDate
    ? format(completedDate, "MMM d, yyyy")
    : "Unknown date";

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{summary.title}</h4>
            <p className="text-sm text-muted-foreground">
              {summary.trainer_name || "AI Trainer"}
            </p>
          </div>

          <Badge variant="secondary" className="capitalize shrink-0">
            {summary.difficulty}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{formattedDate}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{summary.stats.totalTimeMinutes || "—"} min</span>
          </div>

          {/* Focus */}
          {summary.focus && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="truncate capitalize">{summary.focus}</span>
            </div>
          )}

          {/* Completion */}
          {summary.stats.completionPercentage != null && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <span>{Math.round(summary.stats.completionPercentage)}%</span>
            </div>
          )}
        </div>

        {/* Autoregulation data */}
        {(summary.session_rpe || summary.weight_selection) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            {summary.session_rpe && (
              <Badge variant="outline" className="text-xs">
                RPE: {summary.session_rpe}/10
              </Badge>
            )}
            {summary.weight_selection && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs capitalize",
                  summary.weight_selection === "too_light" &&
                    "border-amber-500/50 text-amber-600",
                  summary.weight_selection === "perfect" &&
                    "border-green-500/50 text-green-600",
                  summary.weight_selection === "too_heavy" &&
                    "border-red-500/50 text-red-600"
                )}
              >
                {summary.weight_selection.replace("_", " ")}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for the component
 */
function WorkoutIterationSelectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      {/* Dropdown skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Protocol cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border-2 border-border">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Workout Iteration Selection Component
 *
 * Allows users to select a previous workout and an overload protocol
 * to generate a progressive follow-up workout.
 */
export function WorkoutIterationSelection({
  summaries,
  loading,
  error,
  onRefresh,
  selectedSummaryId,
  selectedProtocol,
  onSelectSummary,
  onSelectProtocol,
  onContinue,
  fitnessGoals = [],
  filters = {},
  onFiltersChange,
}: WorkoutIterationSelectionProps) {
  const protocols = getAllProtocols();

  // Get the selected summary object
  const selectedSummary = useMemo(() => {
    if (!selectedSummaryId) return null;
    return summaries.find((s) => s.id === selectedSummaryId) ?? null;
  }, [summaries, selectedSummaryId]);

  // Smart protocol recommendation from summary equipment and user goals
  const recommendedProtocol = useMemo((): OverloadProtocol => {
    if (!selectedSummary?.sections?.length) return "double_progression";
    const hasBarbell = selectedSummary.sections.some((section) =>
      section.exercises?.some((exercise) =>
        (exercise.equipment_needed ?? []).some((eq) =>
          String(eq).toLowerCase().includes("barbell")
        )
      )
    );
    const isBodyweightOnly = selectedSummary.sections.every((section) =>
      (section.exercises ?? []).every((exercise) => {
        const eq = exercise.equipment_needed ?? [];
        return (
          eq.length === 0 ||
          eq.every((e) => String(e).toLowerCase() === "bodyweight")
        );
      })
    );
    return getRecommendedProtocol(hasBarbell, isBodyweightOnly, fitnessGoals);
  }, [selectedSummary, fitnessGoals]);

  // Can continue only if both summary and protocol are selected
  const canContinue = selectedSummaryId && selectedProtocol;

  // Non-blocking warnings when both summary and protocol are selected
  const iterationWarnings = useMemo((): string[] => {
    if (!selectedSummary || !selectedProtocol) return [];
    const warnings: string[] = [];
    const completedAt = selectedSummary.completed_at?.toDate?.();
    if (completedAt) {
      // Use current time for "over 30 days" check (acceptable for this UX)
      const nowMs =
        // eslint-disable-next-line react-hooks/purity -- 30-day warning needs current time
        Date.now();
      const daysSince = (nowMs - completedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        warnings.push(
          "This workout is over 30 days old; consider choosing a more recent one."
        );
      }
    }
    const pct = selectedSummary.stats?.completionPercentage;
    if (pct != null && pct < 50) {
      warnings.push("Low completion last time; we'll take that into account.");
    }
    const rpe = selectedSummary.session_rpe;
    if (rpe != null && rpe >= 9 && selectedProtocol === "linear_load") {
      warnings.push(
        "High RPE last time; consider Double Progression or maintaining load."
      );
    }
    return warnings;
  }, [selectedSummary, selectedProtocol]);

  if (loading && summaries.length === 0) {
    return <WorkoutIterationSelectionSkeleton />;
  }

  // Fetch error
  if (error && summaries.length === 0) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Couldn&apos;t load session reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {error.message} Check your connection and try again.
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No summaries available (reports are created when you complete a workout)
  if (!loading && summaries.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            No session reports yet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Session reports are created when you{" "}
            <strong>complete a workout</strong> and submit the completion form
            (rate difficulty, RPE, etc.). Until then, there are no reports to
            iterate from.
          </p>
          <p className="text-muted-foreground text-sm">
            Generate a new workout, do it, mark it complete, then come back here
            to build on it with an overload protocol.
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh list
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-lg font-semibold">
          <RefreshCw className="w-5 h-5" />
          <span>Iterate Previous Workout</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Select a completed workout and choose a progression protocol to
          generate your next session.
        </p>
      </div>

      {/* Filter bar (when list has items and parent supports filters) */}
      {summaries.length > 0 && onFiltersChange && (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
          <Label className="text-xs text-muted-foreground">Filter list</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={
                filters.dateFrom != null && filters.dateTo != null
                  ? (() => {
                      const days =
                        (filters.dateTo!.getTime() -
                          filters.dateFrom!.getTime()) /
                        (1000 * 60 * 60 * 24);
                      return days <= 8 ? "7" : days <= 31 ? "30" : "all";
                    })()
                  : "all"
              }
              onValueChange={(v) => {
                const now = new Date();
                if (v === "7") {
                  const d = new Date(now);
                  d.setDate(d.getDate() - 7);
                  onFiltersChange({ ...filters, dateFrom: d, dateTo: now });
                } else if (v === "30") {
                  const d = new Date(now);
                  d.setDate(d.getDate() - 30);
                  onFiltersChange({ ...filters, dateFrom: d, dateTo: now });
                } else {
                  onFiltersChange({
                    ...filters,
                    dateFrom: undefined,
                    dateTo: undefined,
                  });
                }
              }}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.trainerName ?? "all"}
              onValueChange={(v) =>
                onFiltersChange({
                  ...filters,
                  trainerName: v === "all" ? undefined : v,
                })
              }
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Trainer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trainers</SelectItem>
                {Array.from(
                  new Set(
                    summaries.map((s) => s.trainer_name).filter(Boolean)
                  ) as Set<string>
                )
                  .sort()
                  .map((name) => (
                    <SelectItem key={name} value={name!}>
                      {name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.focus ?? "all"}
              onValueChange={(v) =>
                onFiltersChange({
                  ...filters,
                  focus: v === "all" ? undefined : v,
                })
              }
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All focus</SelectItem>
                {Array.from(
                  new Set(
                    summaries.map((s) => s.focus).filter(Boolean)
                  ) as Set<string>
                )
                  .sort()
                  .map((focus) => (
                    <SelectItem key={focus} value={focus!}>
                      {focus}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search by title..."
              className="h-8 w-[160px] text-xs"
              value={filters.searchQuery ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  searchQuery: e.target.value || undefined,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Workout Selection Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="workout-select">Select Workout to Iterate</Label>
        <Select value={selectedSummaryId ?? ""} onValueChange={onSelectSummary}>
          <SelectTrigger id="workout-select" className="w-full">
            <SelectValue placeholder="Choose a completed workout..." />
          </SelectTrigger>
          <SelectContent>
            {summaries.map((summary) => {
              const completedDate = summary.completed_at?.toDate?.();
              const formattedDate = completedDate
                ? format(completedDate, "MMM d")
                : "";

              return (
                <SelectItem key={summary.id} value={summary.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">
                      {summary.title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({formattedDate})
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Workout Preview */}
      {selectedSummary && <SummaryPreview summary={selectedSummary} />}

      {/* Protocol Selection */}
      {selectedSummaryId && (
        <div className="space-y-3">
          <Label>Select Overload Protocol</Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Choose how you want to progress from your previous workout.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {protocols.map((protocol) => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                isSelected={selectedProtocol === protocol.id}
                isRecommended={recommendedProtocol === protocol.id}
                onSelect={() => onSelectProtocol(protocol.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Protocol Logic Preview (contextual guidance when summary + protocol selected) */}
      {selectedProtocol && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-2">Progression Logic</h4>
            <p className="text-sm text-muted-foreground">
              {selectedSummary
                ? getProtocolGuidance(selectedSummary, selectedProtocol)
                : protocols.find((p) => p.id === selectedProtocol)
                    ?.progressionLogic}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Visual progression preview (previous vs next by protocol) */}
      {selectedSummary && selectedProtocol && (
        <ProgressionPreview
          summary={selectedSummary}
          protocol={selectedProtocol}
        />
      )}

      {/* Non-blocking iteration warnings */}
      {iterationWarnings.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Tips
            </h4>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              {iterationWarnings.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          size="lg"
          className="min-w-[150px]"
        >
          Continue
          <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
        </Button>
      </div>
    </div>
  );
}
