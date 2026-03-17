"use client";

import { useMemo, memo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import type { ExerciseAIEditHistory } from "@/types/ai-exercise-editor";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { DollarSign, Hash, MessageSquare, Sparkles } from "lucide-react";

interface EditHistoryViewProps {
  history: ExerciseAIEditHistory[] | undefined;
  exercise: TrainerWorkoutExercise;
}

/**
 * Component to display edit history for an exercise.
 * Shows AI edits and swaps in reverse chronological order.
 * Memoized to prevent unnecessary re-renders.
 */
export const EditHistoryView = memo(
  function EditHistoryView({ history }: EditHistoryViewProps) {
    // Sort history by applied_at in reverse chronological order (newest first)
    const sortedHistory = useMemo(() => {
      if (!history || history.length === 0) return [];
      return [...history].sort((a, b) => {
        const aTime = a.applied_at.toMillis?.() || 0;
        const bTime = b.applied_at.toMillis?.() || 0;
        return bTime - aTime; // Newest first
      });
    }, [history]);

    if (!history || history.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit History</CardTitle>
            <CardDescription>
              No edit history available for this exercise yet.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit History</CardTitle>
            <CardDescription>
              {sortedHistory.length} edit{sortedHistory.length !== 1 ? "s" : ""}{" "}
              recorded
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {sortedHistory.map((entry, index) => (
            <EditHistoryEntry key={entry.edit_id || index} entry={entry} />
          ))}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Using reference equality for exercise and history because:
    // - exercise prop from parent should be stable (same reference if data unchanged)
    // - history array reference is stable if extracted from same exercise object (arrays passed by reference)
    // - This matches the pattern used in ExercisePreview and avoids expensive deep equality checks on every render
    // - Deep equality would be O(n) object/array traversal on every render vs O(1) reference check, reducing performance
    // Note: If parent components recreate objects on every render, fix the parent with useMemo rather than using deep equality here
    return (
      prevProps.exercise === nextProps.exercise &&
      prevProps.history === nextProps.history
    );
  }
);

interface EditHistoryEntryProps {
  entry: ExerciseAIEditHistory;
}

function EditHistoryEntry({ entry }: EditHistoryEntryProps) {
  const appliedDate = entry.applied_at.toDate?.() || new Date();
  const timeAgo = formatDistanceToNow(appliedDate, { addSuffix: true });
  const editTypeLabel = entry.edit_type === "ai_edit" ? "AI Edit" : "AI Swap";
  const editModeLabel =
    entry.edit_type === "ai_edit" && "edit_mode" in entry
      ? formatEditMode(entry.edit_mode)
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={
                  entry.edit_type === "ai_edit" ? "default" : "secondary"
                }
              >
                {editTypeLabel}
              </Badge>
              {editModeLabel && (
                <Badge variant="outline" className="text-xs">
                  {editModeLabel}
                </Badge>
              )}
              {entry.user_rating && (
                <Badge variant="outline" className="text-xs">
                  {entry.user_rating}/5 ⭐
                </Badge>
              )}
            </div>
            <CardTitle className="text-sm">{timeAgo}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {/* User Prompt */}
          <AccordionItem value="prompt">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                User Prompt
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {entry.user_prompt || "No prompt provided"}
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Fields Modified */}
          {entry.fields_modified && entry.fields_modified.length > 0 && (
            <AccordionItem value="fields">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Fields Modified ({entry.fields_modified.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {entry.fields_modified.map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {formatFieldName(field)}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Before/After Comparison */}
          {entry.previous_exercise && (
            <AccordionItem value="comparison">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">View Changes</div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm">
                  {Object.entries(entry.previous_exercise).map(
                    ([key, value]) => {
                      if (entry.fields_modified?.includes(key)) {
                        return (
                          <div
                            key={key}
                            className="border-l-2 border-primary pl-3"
                          >
                            <div className="font-medium mb-1">
                              {formatFieldName(key)}
                            </div>
                            <div className="space-y-1">
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Before:{" "}
                                </span>
                                <span className="text-sm">
                                  {formatFieldValue(value)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Metadata */}
          <AccordionItem value="metadata">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Metadata
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Applied:</span>
                  <span>{appliedDate.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI Model:</span>
                  <span>{entry.ai_model}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Tokens:
                  </span>
                  <span>{entry.generation_tokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Cost:
                  </span>
                  <span>${entry.generation_cost_usd.toFixed(6)}</span>
                </div>
                {entry.genkit_trace_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trace ID:</span>
                    <span className="font-mono text-xs">
                      {entry.genkit_trace_id.substring(0, 8)}...
                    </span>
                  </div>
                )}
                {entry.user_feedback && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground text-xs">
                        User Feedback:
                      </span>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {entry.user_feedback}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function formatEditMode(mode: string): string {
  const modeMap: Record<string, string> = {
    add_detail: "Add Detail",
    update_images: "Update Images",
    adjust_difficulty: "Adjust Difficulty",
    modify_for_injury: "Modify for Injury",
    change_intensity: "Change Intensity",
    create_complex: "Create Complex",
    simplify: "Simplify",
    adjust_equipment: "Adjust Equipment",
    rewrite_cues: "Rewrite Cues",
    custom: "Custom",
  };
  return modeMap[mode] || mode;
}

function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    name: "Name",
    sets: "Sets",
    detailedInstructions: "Instructions",
    cues: "Form Cues",
    muscleTarget: "Muscle Target",
    tempo: "Tempo",
    equipment_needed: "Equipment",
    image_url: "Image",
    setDetails: "Set Details",
    muscle_groups: "Muscle Groups",
  };
  return fieldMap[field] || field;
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "Not set";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
