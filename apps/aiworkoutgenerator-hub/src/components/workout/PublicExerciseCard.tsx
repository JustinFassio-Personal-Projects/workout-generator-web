"use client";

import { useState } from "react";
import {
  Dumbbell,
  Timer,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CoachExplainSection } from "./CoachExplainSection";
import { useExerciseImage } from "@/hooks/useExerciseImage";
import { cn } from "@/lib/utils";
import type { TrainerWorkoutExercise } from "@/types/firestore";

interface PublicExerciseCardProps {
  exercise: TrainerWorkoutExercise;
}

/**
 * Read-only exercise card for public workout display.
 * Shows exercise details, sets, images, and Coach Explain without editing capabilities.
 */
export function PublicExerciseCard({ exercise }: PublicExerciseCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const isCompleted = exercise.completed === true;

  // Get image URL, checking user preferences first
  const imageUrl = useExerciseImage(exercise.name, exercise.image_url);

  const completedSetsCount =
    exercise.setDetails?.filter((set) => set.completed === true).length || 0;
  const totalSets = exercise.setDetails?.length || exercise.sets || 0;

  return (
    <div
      className={cn(
        "bg-slate-900/60 rounded-lg p-4 mb-4 border border-slate-800 transition-all relative flex flex-col",
        isCompleted && "border-emerald-500/50 bg-emerald-500/5"
      )}
    >
      {/* Exercise Image */}
      {imageUrl && (
        <div className="relative -m-4 mb-3 -mt-4 h-48 bg-slate-950 overflow-hidden rounded-t-lg">
          <Image
            src={imageUrl}
            alt={`${exercise.name} demonstration`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-lg font-bold text-white drop-shadow-lg">
              {exercise.name}
            </h3>
          </div>
        </div>
      )}

      {/* Exercise Header (if no image) */}
      {!imageUrl && (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge
          variant="secondary"
          className="bg-blue-500/10 text-blue-400 border-blue-500/20"
        >
          {exercise.muscleTarget}
        </Badge>
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-slate-700 text-slate-300"
        >
          <Dumbbell className="w-3 h-3" /> {totalSets} Sets
        </Badge>
        {exercise.tempo && (
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-slate-700 text-slate-300"
          >
            <Timer className="w-3 h-3" /> {exercise.tempo}
          </Badge>
        )}
        {isCompleted && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )}
        {completedSetsCount > 0 && completedSetsCount < totalSets && (
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-400"
          >
            {completedSetsCount}/{totalSets} Sets Done
          </Badge>
        )}
      </div>

      {/* Technique Cues */}
      {exercise.cues && exercise.cues.length > 0 && (
        <div className="mb-4 bg-slate-950/50 p-3 rounded border border-slate-800">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
            Technique Cues
          </h5>
          <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside marker:text-blue-400">
            {exercise.cues.map((cue: string, i: number) => (
              <li key={i} className="leading-relaxed">
                {cue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Instructions (Expandable) */}
      {exercise.detailedInstructions && (
        <div className="mb-4">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between p-2 bg-slate-950/50 rounded border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-all"
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
            <div className="mt-2 p-3 bg-slate-950 rounded border border-slate-800 text-sm text-slate-300 leading-relaxed animate-in slide-in-from-top-2 duration-200">
              {exercise.detailedInstructions}
            </div>
          )}
        </div>
      )}

      {/* Coach Explain (Expandable) */}
      {exercise.ai_coach_explain && (
        <div className="mb-4">
          <CoachExplainSection
            content={exercise.ai_coach_explain}
            size="small"
          />
        </div>
      )}

      {/* Sets Table */}
      {exercise.setDetails && exercise.setDetails.length > 0 && (
        <div className="space-y-2 mt-4">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
            Sets
          </h5>
          <div className="grid grid-cols-[30px_1fr_1fr_1fr_1fr] gap-2 text-[10px] uppercase text-slate-400 font-bold mb-2 px-1">
            <span className="text-left">#</span>
            <span className="text-center">Reps</span>
            <span className="text-center">Intensity</span>
            <span className="text-center">Weight</span>
            <span className="text-right">Rest</span>
          </div>
          {exercise.setDetails.map((set, idx) => {
            const isSetCompleted = set.completed === true;
            return (
              <div
                key={idx}
                className={cn(
                  "grid grid-cols-[30px_1fr_1fr_1fr_1fr] gap-2 items-center bg-slate-950 p-2 rounded text-sm border",
                  isSetCompleted
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-slate-800"
                )}
              >
                <span className="text-slate-400 font-mono text-xs text-center">
                  {idx + 1}
                </span>
                <span className="text-white font-medium text-center text-xs">
                  {set.reps || "—"}
                </span>
                <span
                  className="text-slate-300 font-medium text-center text-[10px] truncate"
                  title={set.weight}
                >
                  {set.weight || "—"}
                </span>
                <span className="text-slate-300 font-medium text-center text-xs">
                  {set.actualWeight || set.weight || "—"}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-slate-300 font-medium text-right text-xs truncate">
                    {set.duration || set.rest || "—"}
                  </span>
                  {isSetCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Equipment and Muscle Groups */}
      {(exercise.equipment_needed?.length > 0 ||
        exercise.muscle_groups?.length > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap gap-2">
            {exercise.equipment_needed?.map((equipment, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-slate-700 text-slate-400"
              >
                {equipment}
              </Badge>
            ))}
            {exercise.muscle_groups?.map((muscle, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-slate-700 text-slate-400"
              >
                {muscle}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Set Notes (if any) */}
      {exercise.setDetails?.some((set) => set.notes?.trim()) && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
            Set Notes
          </h5>
          <div className="space-y-2">
            {exercise.setDetails.map((set, idx) => {
              if (!set.notes?.trim()) return null;
              return (
                <div
                  key={idx}
                  className="text-xs text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800"
                >
                  <span className="font-medium text-slate-300">
                    Set {idx + 1}:
                  </span>{" "}
                  {set.notes}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
