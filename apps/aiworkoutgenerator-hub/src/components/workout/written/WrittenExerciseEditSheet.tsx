"use client";

import { useEffect, useState } from "react";
import type {
  TrainerSetDetail,
  TrainerWorkoutExercise,
} from "@/types/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type WrittenExerciseEditMode = "edit" | "insert-before" | "insert-after";

export interface WrittenExerciseEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: WrittenExerciseEditMode;
  initialExercise: TrainerWorkoutExercise;
  onSave: (exercise: TrainerWorkoutExercise) => void;
}

function resizeSetDetails(
  prev: TrainerSetDetail[] | undefined,
  newCount: number
): TrainerSetDetail[] {
  const n = Math.max(1, Math.min(50, newCount));
  const rows = prev ?? [];
  const template: TrainerSetDetail = rows[rows.length - 1] ?? {
    reps: "",
    weight: "",
    rest: "60s",
    actualWeight: "",
    notes: "",
  };
  const next = rows.slice(0, n);
  while (next.length < n) {
    next.push({
      ...template,
      reps: "",
      weight: "",
      actualWeight: "",
      notes: "",
      completed: undefined,
    });
  }
  return next;
}

function splitCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function WrittenExerciseEditSheet({
  open,
  onOpenChange,
  mode,
  initialExercise,
  onSave,
}: WrittenExerciseEditSheetProps) {
  const [name, setName] = useState("");
  const [muscleTarget, setMuscleTarget] = useState("");
  const [muscleGroups, setMuscleGroups] = useState("");
  const [equipment, setEquipment] = useState("");
  const [tempo, setTempo] = useState("");
  const [detailedInstructions, setDetailedInstructions] = useState("");
  const [cuesText, setCuesText] = useState("");
  const [setCount, setSetCount] = useState(3);

  useEffect(() => {
    if (!open) return;
    const ex = initialExercise;
    setName(ex.name ?? "");
    setMuscleTarget(ex.muscleTarget ?? "");
    setMuscleGroups((ex.muscle_groups ?? []).join(", "));
    setEquipment((ex.equipment_needed ?? []).join(", "));
    setTempo(ex.tempo ?? "");
    setDetailedInstructions(ex.detailedInstructions ?? "");
    setCuesText((ex.cues ?? []).join("\n"));
    const sd = ex.setDetails?.length ?? ex.sets ?? 3;
    setSetCount(Math.max(1, sd));
  }, [open, initialExercise]);

  const title =
    mode === "edit"
      ? "Edit exercise"
      : mode === "insert-before"
        ? "Add exercise before"
        : "Add exercise after";

  const handleSave = () => {
    const trimmedName = name.trim() || "New exercise";
    const cues = cuesText
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    const setDetails = resizeSetDetails(initialExercise.setDetails, setCount);
    const next: TrainerWorkoutExercise = {
      ...initialExercise,
      name: trimmedName,
      muscleTarget: muscleTarget.trim() || "General",
      muscle_groups: splitCommaList(muscleGroups),
      equipment_needed: splitCommaList(equipment),
      tempo: tempo.trim() || null,
      detailedInstructions: detailedInstructions.trim() || null,
      cues,
      setDetails,
      sets: setDetails.length,
    };
    onSave(next);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto flex flex-col"
      >
        <SheetHeader>
          <SheetTitle className="text-left pr-8">{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm flex-1">
          <div className="space-y-2">
            <Label htmlFor="we-name">Name</Label>
            <Input
              id="we-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we-muscle">Muscle target</Label>
            <Input
              id="we-muscle"
              value={muscleTarget}
              onChange={(e) => setMuscleTarget(e.target.value)}
              placeholder="e.g. Chest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we-groups">Muscle groups (comma-separated)</Label>
            <Input
              id="we-groups"
              value={muscleGroups}
              onChange={(e) => setMuscleGroups(e.target.value)}
              placeholder="chest, shoulders"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we-equipment">Equipment (comma-separated)</Label>
            <Input
              id="we-equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="dumbbells, bench"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we-tempo">Tempo (optional)</Label>
            <Input
              id="we-tempo"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              placeholder="3-0-1-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we-sets">Number of sets</Label>
            <Input
              id="we-sets"
              type="number"
              min={1}
              max={50}
              value={setCount}
              onChange={(e) =>
                setSetCount(
                  Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we-instructions">Instructions</Label>
            <Textarea
              id="we-instructions"
              value={detailedInstructions}
              onChange={(e) => setDetailedInstructions(e.target.value)}
              placeholder="How to perform the movement"
              rows={5}
              className="resize-y min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="we-cues">Cues (one per line)</Label>
            <Textarea
              id="we-cues"
              value={cuesText}
              onChange={(e) => setCuesText(e.target.value)}
              placeholder="One cue per line"
              rows={4}
              className="resize-y"
            />
          </div>
        </div>
        <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-sky-600 text-white hover:bg-sky-500"
            onClick={handleSave}
          >
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
