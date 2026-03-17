"use client";

import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AIOrderCheckResponse,
  OrderIssue,
} from "@/types/ai-exercise-editor";

export interface ExerciseOrderCheckResultProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AIOrderCheckResponse | null;
  loading?: boolean;
  error?: string | null;
  exerciseName?: string;
  sectionIdx?: number;
  exerciseIdx?: number;
  onMoveToSuggested?: (
    sectionIdx: number,
    exerciseIdx: number,
    suggestedPosition: number
  ) => void;
}

function severityColor(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "low":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "medium":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "high":
      return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function IssueRow({ issue }: { issue: OrderIssue }) {
  return (
    <div
      className={`rounded-lg border p-3 ${severityColor(issue.severity)}`}
      role="listitem"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{issue.description}</p>
          {issue.affectedExercises.length > 0 && (
            <p className="text-xs opacity-90">
              Affected: {issue.affectedExercises.join(", ")}
            </p>
          )}
          {issue.recommendation && (
            <p className="text-xs opacity-90">
              Recommendation: {issue.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExerciseOrderCheckResult({
  open,
  onOpenChange,
  result,
  loading = false,
  error = null,
  exerciseName,
  sectionIdx,
  exerciseIdx,
  onMoveToSuggested,
}: ExerciseOrderCheckResultProps) {
  const isSafe = result?.isSafe ?? false;
  const hasSuggested =
    result &&
    typeof result.suggestedPosition === "number" &&
    sectionIdx !== undefined &&
    exerciseIdx !== undefined &&
    onMoveToSuggested;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exercise Order Check</DialogTitle>
          <DialogDescription>
            {exerciseName
              ? `Safety analysis for "${exerciseName}"`
              : "Safety analysis for this exercise"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing exercise order...
              </p>
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {result && !loading && !error && (
            <>
              <div className="flex items-center gap-3">
                {isSafe ? (
                  <>
                    <ShieldCheck className="h-8 w-8 text-green-500" />
                    <Badge
                      variant="secondary"
                      className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
                    >
                      Safe
                    </Badge>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-8 w-8 text-amber-500" />
                    <Badge
                      variant="secondary"
                      className={severityColor(result.riskLevel)}
                    >
                      {result.riskLevel === "high"
                        ? "Higher risk"
                        : result.riskLevel === "medium"
                          ? "Moderate risk"
                          : "Low risk"}
                    </Badge>
                  </>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {result.explanation}
              </p>

              {result.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Issues</h4>
                  <ul className="space-y-2" role="list">
                    {result.issues.map((issue, i) => (
                      <IssueRow key={i} issue={issue} />
                    ))}
                  </ul>
                </div>
              )}

              {!isSafe &&
                hasSuggested &&
                result.suggestedPosition !== undefined &&
                exerciseIdx !== undefined &&
                result.suggestedPosition !== exerciseIdx && (
                  <div className="pt-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        onMoveToSuggested?.(
                          sectionIdx!,
                          exerciseIdx!,
                          result.suggestedPosition!
                        );
                        onOpenChange(false);
                      }}
                    >
                      Move to position {result.suggestedPosition + 1}
                    </Button>
                  </div>
                )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
