"use client";

import { useMemo, useState } from "react";
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

type WrittenExerciseEditFieldsProps = {
  initialExercise: TrainerWorkoutExercise;
  title: string;
  onSave: (exercise: TrainerWorkoutExercise) => void;
  onCancel: () => void;
};

function WrittenExerciseEditFields({
  initialExercise,
  title,
  onSave,
  onCancel,
}: WrittenExerciseEditFieldsProps) {
  const [name, setName] = useState(() => initialExercise.name ?? "");
  const [muscleTarget, setMuscleTarget] = useState(
    () => initialExercise.muscleTarget ?? ""
  );
  const [muscleGroups, setMuscleGroups] = useState(() =>
    (initialExercise.muscle_groups ?? []).join(", ")
  );
  const [equipment, setEquipment] = useState(() =>
    (initialExercise.equipment_needed ?? []).join(", ")
  );
  const [tempo, setTempo] = useState(() => initialExercise.tempo ?? "");
  const [detailedInstructions, setDetailedInstructions] = useState(
    () => initialExercise.detailedInstructions ?? ""
  );
  const [cuesText, setCuesText] = useState(() =>
    (initialExercise.cues ?? []).join("\n")
  );
  const [setCount, setSetCount] = useState(() => {
    const sd = initialExercise.setDetails?.length ?? initialExercise.sets ?? 3;
    return Math.max(1, sd);
  });

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
  };

  return (
    <>
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
        <Button type="button" variant="outline" onClick={onCancel}>
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
    </>
  );
}

export function WrittenExerciseEditSheet({
  open,
  onOpenChange,
  mode,
  initialExercise,
  onSave,
}: WrittenExerciseEditSheetProps) {
  const muscleGroupsKey = (initialExercise.muscle_groups ?? []).join(",");
  const equipmentKey = (initialExercise.equipment_needed ?? []).join(",");
  const cuesKey = (initialExercise.cues ?? []).join("\n");

  const initialExerciseKey = useMemo(
    () =>
      [
        mode,
        initialExercise.name,
        initialExercise.muscleTarget,
        String(initialExercise.sets ?? 0),
        String(initialExercise.setDetails?.length ?? 0),
        muscleGroupsKey,
        equipmentKey,
        initialExercise.tempo ?? "",
        initialExercise.detailedInstructions ?? "",
        cuesKey,
      ].join("\0"),
    [
      mode,
      initialExercise.name,
      initialExercise.muscleTarget,
      initialExercise.sets,
      initialExercise.setDetails?.length,
      muscleGroupsKey,
      equipmentKey,
      initialExercise.tempo,
      initialExercise.detailedInstructions,
      cuesKey,
    ]
  );

  const title =
    mode === "edit"
      ? "Edit exercise"
      : mode === "insert-before"
        ? "Add exercise before"
        : "Add exercise after";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto flex flex-col"
      >
        {open ? (
          <WrittenExerciseEditFields
            key={initialExerciseKey}
            initialExercise={initialExercise}
            title={title}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
