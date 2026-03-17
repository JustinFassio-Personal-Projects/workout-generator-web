"use client";

import { useState } from "react";
import {
  Dumbbell,
  Timer,
  ChevronDown,
  ChevronUp,
  FileText,
  Maximize2,
  CheckCircle2,
  Wand2,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseImageHeader } from "./ExerciseImageHeader";
import { CoachExplainSection } from "./CoachExplainSection";
import { useExerciseImage } from "@/hooks/useExerciseImage";
import type { TrainerWorkoutExercise } from "@/types/firestore";

interface ExerciseCardProps {
  exercise: TrainerWorkoutExercise;
  sectionIdx: number;
  exerciseIdx: number;
  onClick?: () => void;
  onUpdateSet: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    field: string,
    value: string
  ) => void;
  onToggleSetComplete?: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    completed: boolean
  ) => void;
  onRetryImage?: (sectionIdx: number, exerciseIdx: number) => Promise<void>;
  isRetryingImage?: boolean;
  isHoverable?: boolean;
  onExerciseComplete?: (
    sectionIdx: number,
    exerciseIdx: number,
    completed: boolean
  ) => void;
  onOpenAIEditor?: (sectionIdx: number, exerciseIdx: number) => void;
  onOpenCoachExplain?: (sectionIdx: number, exerciseIdx: number) => void;
  onChooseImage?: (sectionIdx: number, exerciseIdx: number) => void;
  onCheckOrder?: (sectionIdx: number, exerciseIdx: number) => void;
  onOpenAddExercise?: (sectionIdx: number, exerciseIdx: number) => void;
}

export function ExerciseCard({
  exercise,
  sectionIdx,
  exerciseIdx,
  onClick,
  onUpdateSet,
  onToggleSetComplete,
  onRetryImage,
  isRetryingImage = false,
  isHoverable = false,
  onExerciseComplete,
  onOpenAIEditor,
  onOpenCoachExplain,
  onChooseImage,
  onCheckOrder,
  onOpenAddExercise,
}: ExerciseCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const isCompleted = exercise.completed === true;

  // Get image URL, checking user preferences first
  const imageUrl = useExerciseImage(exercise.name, exercise.image_url);

  const handleToggleInstructions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInstructions(!showInstructions);
  };

  const handleRetryImage = () => {
    if (onRetryImage) {
      onRetryImage(sectionIdx, exerciseIdx);
    }
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExerciseComplete) {
      onExerciseComplete(sectionIdx, exerciseIdx, !isCompleted);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-card/50 rounded-lg p-4 mb-3 border border-border/50 transition-all relative h-full flex flex-col ${
        isHoverable
          ? "group hover:border-primary/50 cursor-pointer hover:scale-[1.01] hover:bg-card hover:shadow-xl hover:shadow-primary/10"
          : ""
      } ${isCompleted ? "border-green-500/50 bg-green-500/5" : ""}`}
    >
      {isHoverable && (
        <div className="absolute top-4 right-4 z-10 text-muted-foreground group-hover:text-primary transition-colors">
          <Maximize2 className="w-4 h-4" />
        </div>
      )}

      {/* Exercise Image Header with Name Overlay */}
      <div className="relative -m-4 mb-3 -mt-4">
        <ExerciseImageHeader
          src={imageUrl || undefined}
          alt={`${exercise.name} demonstration`}
          exerciseName={exercise.name}
          showPlaceholder={true}
          isRetrying={isRetryingImage}
          onRetry={onRetryImage ? handleRetryImage : undefined}
          className={isCompleted ? "opacity-60" : ""}
        />
        {/* Action buttons overlay on image header */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {onCheckOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCheckOrder(sectionIdx, exerciseIdx);
              }}
              className="shrink-0 bg-background/90 backdrop-blur-sm border-border hover:bg-background shadow-lg"
              aria-label="Check exercise order"
              title="Check if this exercise is safely positioned in the order"
            >
              <ShieldCheck className="w-4 h-4 mr-1 text-muted-foreground" />
              <span className="text-xs hidden sm:inline">Order</span>
            </Button>
          )}
          {onOpenAddExercise && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddExercise(sectionIdx, exerciseIdx);
              }}
              className="shrink-0 bg-background/90 backdrop-blur-sm border-border hover:bg-background shadow-lg"
              aria-label="Add exercise"
              title="Add exercise before or after this one"
            >
              <Plus className="w-4 h-4 mr-1 text-muted-foreground" />
              <span className="text-xs hidden sm:inline">Add</span>
            </Button>
          )}
          {onOpenAIEditor && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAIEditor(sectionIdx, exerciseIdx);
              }}
              className="shrink-0 bg-background/90 backdrop-blur-sm border-border hover:bg-background shadow-lg"
              aria-label="Edit with AI"
              title="Edit with AI"
            >
              <Wand2 className="w-4 h-4 mr-1 text-[hsl(82.7,77.9%,55.5%)]" />
              <span className="text-xs hidden sm:inline">AI Edit</span>
            </Button>
          )}
        </div>
        {isCompleted && (
          <div className="absolute bottom-4 left-4 z-10">
            <Badge className="bg-green-500/90 backdrop-blur-sm text-white border-green-500 text-xs shadow-lg">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}
      </div>

      {/* Coach Explain and Choose Image Buttons - Right justified below image */}
      {(onOpenCoachExplain || onChooseImage) && (
        <div className="flex justify-end gap-2 mb-3">
          {onChooseImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onChooseImage(sectionIdx, exerciseIdx);
              }}
              className="bg-background/90 backdrop-blur-sm border-border hover:border-primary hover:bg-background shadow-sm"
              aria-label="Choose Image"
              title="Select an image for this exercise"
            >
              <ImageIcon className="w-4 h-4 mr-1.5" />
              <span className="text-xs">Choose Image</span>
            </Button>
          )}
          {onOpenCoachExplain && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCoachExplain(sectionIdx, exerciseIdx);
              }}
              className="bg-background/90 backdrop-blur-sm border-[hsl(82.7,77.9%,55.5%)]/50 hover:border-[hsl(82.7,77.9%,55.5%)] hover:bg-background shadow-sm"
              aria-label="Open Coach Explain"
              title="Get personalized exercise breakdown"
            >
              <GraduationCap className="w-4 h-4 mr-1.5 text-[hsl(82.7,77.9%,55.5%)]" />
              <span className="text-xs text-[hsl(82.7,77.9%,55.5%)]">
                Coach Explain
              </span>
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge
          variant="secondary"
          className="bg-primary/10 text-primary border-primary/20"
        >
          {exercise.muscleTarget}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Dumbbell className="w-3 h-3" /> {exercise.sets} Sets
        </Badge>
        {exercise.tempo && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Timer className="w-3 h-3" /> {exercise.tempo}
          </Badge>
        )}
      </div>

      {exercise.cues && exercise.cues.length > 0 && (
        <div className="mb-4 bg-muted/50 p-3 rounded border border-border/30 flex-grow">
          <h5 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">
            Technique Cues
          </h5>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside marker:text-primary">
            {exercise.cues.map((cue: string, i: number) => (
              <li key={i} className="leading-relaxed">
                {cue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exercise.detailedInstructions && (
        <div className="mb-4">
          <button
            onClick={handleToggleInstructions}
            className="w-full flex items-center justify-between p-2 bg-muted/50 rounded border border-border/30 text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Detailed Instructions
            </div>
            {showInstructions ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showInstructions && (
            <div className="mt-2 p-3 bg-background rounded border border-border text-sm text-muted-foreground leading-relaxed animate-in slide-in-from-top-2 duration-200">
              {exercise.detailedInstructions}
            </div>
          )}
        </div>
      )}

      {exercise.ai_coach_explain && (
        <CoachExplainSection content={exercise.ai_coach_explain} size="small" />
      )}

      <div className="space-y-1 mt-auto">
        <div className="grid grid-cols-[20px_0.8fr_1fr_1fr_0.8fr_0.9fr] gap-2 text-[10px] uppercase text-muted-foreground font-bold mb-1 px-1">
          <span className="text-left">#</span>
          <span className="text-center">Reps</span>
          <span className="text-center">Intensity</span>
          <span className="text-center text-primary">Weight</span>
          <span className="text-right">Rest</span>
          <span className="text-right">Done</span>
        </div>
        {exercise.setDetails.map((set, idx) => {
          const isSetCompleted = set.completed === true;
          const shouldStrikethrough = isCompleted && !isSetCompleted;
          return (
            <div
              key={idx}
              className={`grid grid-cols-[20px_0.8fr_1fr_1fr_0.8fr_0.9fr] gap-2 items-center bg-muted p-2 rounded text-sm border border-border ${
                isSetCompleted ? "border-emerald-500/60 bg-emerald-500/5" : ""
              }`}
            >
              <span
                className={`text-muted-foreground font-mono text-xs text-center ${
                  shouldStrikethrough ? "line-through opacity-60" : ""
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`text-foreground font-medium text-center text-xs ${
                  shouldStrikethrough ? "line-through opacity-60" : ""
                }`}
              >
                {set.reps || "-"}
              </span>
              <span
                className={`text-foreground font-medium text-center text-[10px] truncate ${
                  shouldStrikethrough ? "line-through opacity-60" : ""
                }`}
                title={set.weight}
              >
                {set.weight || "-"}
              </span>
              <Input
                type="text"
                placeholder="lbs"
                value={set.actualWeight || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onUpdateSet(
                    sectionIdx,
                    exerciseIdx,
                    idx,
                    "actualWeight",
                    e.target.value
                  )
                }
                className={`h-7 bg-background border-border text-center text-primary text-xs py-1 px-1 w-full focus:border-primary placeholder-muted-foreground ${
                  shouldStrikethrough ? "opacity-60" : ""
                }`}
              />
              <span
                className={`text-foreground font-medium text-right text-xs truncate ${
                  shouldStrikethrough ? "line-through opacity-60" : ""
                }`}
              >
                {set.duration || set.rest || "-"}
              </span>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onToggleSetComplete) {
                    onToggleSetComplete(
                      sectionIdx,
                      exerciseIdx,
                      idx,
                      !isSetCompleted
                    );
                  }
                }}
                onMouseDown={(e) => {
                  // Prevent focus change which can cause scroll
                  e.preventDefault();
                }}
                className={`inline-flex items-center justify-end gap-1 text-[10px] font-semibold ${
                  isSetCompleted
                    ? "text-emerald-500"
                    : "text-muted-foreground hover:text-emerald-500"
                }`}
                aria-label={
                  isSetCompleted
                    ? `Mark set ${idx + 1} as incomplete`
                    : `Mark set ${idx + 1} as complete`
                }
              >
                <span
                  className={`h-4 w-4 rounded-full border flex items-center justify-center text-[9px] ${
                    isSetCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-border"
                  }`}
                >
                  {isSetCompleted ? "✓" : ""}
                </span>
                <span>{isSetCompleted ? "Done" : "Complete"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Center Complete Button */}
      {onExerciseComplete && (
        <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-border/50">
          <Button
            variant={isCompleted ? "default" : "outline"}
            size="sm"
            onClick={handleToggleComplete}
            className={`w-full sm:w-auto ${
              isCompleted
                ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                : "border-border hover:bg-background"
            }`}
            aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
          >
            <CheckCircle2 className={`w-4 h-4 ${isCompleted ? "" : "mr-2"}`} />
            {isCompleted ? "Completed" : "Complete Exercise"}
          </Button>
          {isCompleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleComplete}
              className="shrink-0 border-border hover:bg-background rounded-full p-2 h-8 w-8"
              aria-label="Restore exercise (mark as incomplete)"
              title="Restore exercise"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
