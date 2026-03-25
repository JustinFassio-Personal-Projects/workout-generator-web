"use client";

import { useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Shield } from "lucide-react";
import type {
  TrainerWorkoutSection,
  TrainerWorkoutExercise,
} from "@/types/firestore";
import { ExerciseCard } from "./ExerciseCard";
import type { WorkoutTourAnchor } from "./WorkoutDisplay";

interface WorkoutSectionProps {
  section: TrainerWorkoutSection;
  sectionIdx: number;
  onExerciseClick: (sIdx: number, eIdx: number) => void;
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
  retryingImageKey?: string | null;
  onExerciseComplete?: (
    sectionIdx: number,
    exerciseIdx: number,
    completed: boolean
  ) => void;
  onOpenAIEditor?: (sectionIdx: number, exerciseIdx: number) => void;
  onOpenCoachExplain?: (sectionIdx: number, exerciseIdx: number) => void;
  onChooseImage?: (sectionIdx: number, exerciseIdx: number) => void;
  onOpenAddExercise?: (sectionIdx: number, exerciseIdx: number) => void;
  onCheckOrder?: (sectionIdx: number, exerciseIdx: number) => void;
  onReorderExercises?: (
    sectionIdx: number,
    reorderedExercises: TrainerWorkoutExercise[]
  ) => void;
  isEditing?: boolean;
  disableReorder?: boolean;
  /** When false, hide session completion chrome on exercise cards (editor preview). */
  showSessionCompletionState?: boolean;
  /** Optional anchor card for onboarding tour target attributes. */
  tourAnchor?: WorkoutTourAnchor | null;
}

/**
 * Get the color class for a section type indicator.
 */
function getSectionColor(type: string): string {
  switch (type) {
    case "Warmup":
      return "bg-yellow-500";
    case "Main Workout":
      return "bg-primary";
    case "Finisher":
      return "bg-red-500";
    case "Cooldown":
      return "bg-green-500";
    default:
      return "bg-primary";
  }
}

interface SortableExerciseItemProps {
  exercise: TrainerWorkoutExercise;
  sectionIdx: number;
  exerciseIdx: number;
  onExerciseClick: (sIdx: number, eIdx: number) => void;
  onUpdateSet: WorkoutSectionProps["onUpdateSet"];
  onToggleSetComplete: WorkoutSectionProps["onToggleSetComplete"];
  onRetryImage: WorkoutSectionProps["onRetryImage"];
  isRetryingImage: boolean;
  onExerciseComplete: WorkoutSectionProps["onExerciseComplete"];
  onOpenAIEditor: WorkoutSectionProps["onOpenAIEditor"];
  onOpenCoachExplain: WorkoutSectionProps["onOpenCoachExplain"];
  onChooseImage: WorkoutSectionProps["onChooseImage"];
  onOpenAddExercise: WorkoutSectionProps["onOpenAddExercise"];
  onCheckOrder: WorkoutSectionProps["onCheckOrder"];
  isDraggable: boolean;
  showSessionCompletionState: WorkoutSectionProps["showSessionCompletionState"];
  tourAnchor: WorkoutSectionProps["tourAnchor"];
}

function SortableExerciseItem({
  exercise,
  sectionIdx,
  exerciseIdx,
  onExerciseClick,
  onUpdateSet,
  onToggleSetComplete,
  onRetryImage,
  isRetryingImage,
  onExerciseComplete,
  onOpenAIEditor,
  onOpenCoachExplain,
  onChooseImage,
  onOpenAddExercise,
  onCheckOrder,
  isDraggable,
  showSessionCompletionState,
  tourAnchor,
}: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(exerciseIdx),
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-50 opacity-80" : ""}`}
    >
      {isDraggable && (
        <button
          type="button"
          className="absolute left-2 top-4 z-10 flex touch-none cursor-grab items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className={isDraggable ? "pl-10" : ""}>
        <ExerciseCard
          exercise={exercise}
          sectionIdx={sectionIdx}
          exerciseIdx={exerciseIdx}
          onUpdateSet={onUpdateSet}
          onToggleSetComplete={onToggleSetComplete}
          onRetryImage={onRetryImage}
          isRetryingImage={isRetryingImage}
          isHoverable={true}
          onClick={() => onExerciseClick(sectionIdx, exerciseIdx)}
          onExerciseComplete={onExerciseComplete}
          onOpenAIEditor={onOpenAIEditor}
          onOpenCoachExplain={onOpenCoachExplain}
          onChooseImage={onChooseImage}
          onOpenAddExercise={onOpenAddExercise}
          onCheckOrder={onCheckOrder}
          showSessionCompletionState={showSessionCompletionState}
          isTourAnchor={
            tourAnchor?.sectionIdx === sectionIdx &&
            tourAnchor?.exerciseIdx === exerciseIdx
          }
        />
      </div>
    </div>
  );
}

export function WorkoutSection({
  section,
  sectionIdx,
  onExerciseClick,
  onUpdateSet,
  onToggleSetComplete,
  onRetryImage,
  retryingImageKey,
  onExerciseComplete,
  onOpenAIEditor,
  onOpenCoachExplain,
  onChooseImage,
  onOpenAddExercise,
  onCheckOrder,
  onReorderExercises,
  isEditing = false,
  disableReorder = false,
  showSessionCompletionState = true,
  tourAnchor = null,
}: WorkoutSectionProps) {
  const isWarmup = section.type === "Warmup";
  const exercises = section.exercises ?? [];
  const canDrag =
    isEditing &&
    !disableReorder &&
    !!onReorderExercises &&
    exercises.length > 1;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorderExercises) return;
      const oldIndex = exercises.findIndex((_, i) => String(i) === active.id);
      const newIndex = exercises.findIndex((_, i) => String(i) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(exercises, oldIndex, newIndex);
      onReorderExercises(sectionIdx, reordered);
    },
    [exercises, sectionIdx, onReorderExercises]
  );

  const sortableIds = useMemo(
    () => exercises.map((_, i) => String(i)),
    [exercises]
  );

  const exerciseList = (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {exercises.map((exercise, eIdx) => {
        const exerciseKey = `${sectionIdx}-${eIdx}`;
        if (canDrag) {
          return (
            <SortableExerciseItem
              key={`${exercise.name}-${eIdx}`}
              exercise={exercise}
              sectionIdx={sectionIdx}
              exerciseIdx={eIdx}
              onExerciseClick={onExerciseClick}
              onUpdateSet={onUpdateSet}
              onToggleSetComplete={onToggleSetComplete}
              onRetryImage={onRetryImage}
              isRetryingImage={retryingImageKey === exerciseKey}
              onExerciseComplete={onExerciseComplete}
              onOpenAIEditor={onOpenAIEditor}
              onOpenCoachExplain={onOpenCoachExplain}
              onChooseImage={onChooseImage}
              onOpenAddExercise={onOpenAddExercise}
              onCheckOrder={onCheckOrder}
              isDraggable={true}
              showSessionCompletionState={showSessionCompletionState}
              tourAnchor={tourAnchor}
            />
          );
        }
        return (
          <ExerciseCard
            key={`${exercise.name}-${eIdx}`}
            exercise={exercise}
            sectionIdx={sectionIdx}
            exerciseIdx={eIdx}
            onUpdateSet={onUpdateSet}
            onToggleSetComplete={onToggleSetComplete}
            onRetryImage={onRetryImage}
            isRetryingImage={retryingImageKey === exerciseKey}
            isHoverable={true}
            onClick={() => onExerciseClick(sectionIdx, eIdx)}
            onExerciseComplete={onExerciseComplete}
            onOpenAIEditor={onOpenAIEditor}
            onOpenCoachExplain={onOpenCoachExplain}
            onChooseImage={onChooseImage}
            onOpenAddExercise={onOpenAddExercise}
            onCheckOrder={onCheckOrder}
            showSessionCompletionState={showSessionCompletionState}
            isTourAnchor={
              tourAnchor?.sectionIdx === sectionIdx &&
              tourAnchor?.exerciseIdx === eIdx
            }
          />
        );
      })}
    </div>
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`h-8 w-1 rounded-full ${getSectionColor(section.type)}`}
        />
        <h3 className="text-2xl font-bold text-foreground">{section.type}</h3>
        {isWarmup && (
          <div
            className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full border border-yellow-500/30"
            aria-label="Safety Component: Warmup section is separate from workout time"
          >
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Safety Component
            </span>
          </div>
        )}
        <span className="text-muted-foreground text-sm font-mono border border-border px-2 py-0.5 rounded">
          {section.durationEstimate}
        </span>
        {isWarmup && (
          <span className="text-xs text-muted-foreground italic">
            (separate from workout time)
          </span>
        )}
      </div>

      {canDrag ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {exerciseList}
          </SortableContext>
        </DndContext>
      ) : (
        exerciseList
      )}
    </div>
  );
}
