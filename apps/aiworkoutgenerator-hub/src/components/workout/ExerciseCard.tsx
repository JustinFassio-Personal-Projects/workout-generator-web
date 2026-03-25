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
  ShieldCheck,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExerciseImageHeader } from "./ExerciseImageHeader";
import { CoachExplainSection } from "./CoachExplainSection";
import {
  ExerciseCompleteFooter,
  ExerciseSetLogTable,
} from "./ExerciseSetLogTable";
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

      <ExerciseSetLogTable
        className="mt-auto"
        exercise={exercise}
        sectionIdx={sectionIdx}
        exerciseIdx={exerciseIdx}
        onUpdateSet={onUpdateSet}
        onToggleSetComplete={onToggleSetComplete}
        showLoggingColumns
        stopPropagationOnInteract
      />

      <ExerciseCompleteFooter
        exercise={exercise}
        sectionIdx={sectionIdx}
        exerciseIdx={exerciseIdx}
        onExerciseComplete={onExerciseComplete}
        stopPropagationOnInteract
      />
    </div>
  );
}
