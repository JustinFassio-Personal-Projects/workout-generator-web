"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EditModePanel } from "./EditModePanel";
import { SwapModePanel } from "./SwapModePanel";
import { AddModePanel } from "./AddModePanel";
import { AddExercisePositionDialog } from "./AddExercisePositionDialog";
import { EditHistoryView } from "./EditHistoryView";
import type { AIExerciseEditorProps } from "./types";

type TabMode = "edit" | "swap" | "add" | "history";

/**
 * Main dialog component for AI exercise editing.
 * Provides Edit, Swap, Add, and History tabs for modifying exercises using AI.
 */
export function AIExerciseEditor({
  exercise,
  sectionType,
  sectionIndex,
  exerciseIndex,
  workoutId,
  workout,
  open,
  onOpenChange,
  onApplyEdit,
  onApplyAdd,
  onUpdateImageUrl,
  initialAction,
}: AIExerciseEditorProps) {
  const [mode, setMode] = useState<TabMode>("edit");
  const [addPosition, setAddPosition] = useState<"before" | "after" | null>(
    null
  );
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);

  const editHistory = exercise.ai_edit_history;

  useEffect(() => {
    if (initialAction === "add") {
      // Use setTimeout to avoid synchronous setState warning
      setTimeout(() => {
        setMode("add");
        setAddPosition(null);
        setPositionDialogOpen(true);
      }, 0);
    }
  }, [initialAction]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
      if (!newOpen) {
        setAddPosition(null);
        setPositionDialogOpen(false);
      }
    },
    [onOpenChange]
  );

  const handleAddTabChange = () => {
    if (mode !== "add") return;
    setAddPosition(null);
    setPositionDialogOpen(true);
  };

  const handlePositionSelect = (position: "before" | "after") => {
    setAddPosition(position);
    setPositionDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Exercise Editor: {exercise.name}</DialogTitle>
          <DialogDescription>
            Edit exercise details, swap with alternatives, add exercises, or
            view edit history.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            const next = v as TabMode;
            setMode(next);
            if (next === "add") handleAddTabChange();
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="edit">Edit Exercise</TabsTrigger>
            <TabsTrigger value="swap">Swap Exercise</TabsTrigger>
            <TabsTrigger value="add">Add Exercise</TabsTrigger>
            <TabsTrigger value="history">
              History
              {editHistory &&
                editHistory.length > 0 &&
                ` (${editHistory.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4">
            <EditModePanel
              exercise={exercise}
              sectionType={sectionType}
              workoutId={workoutId}
              sectionIndex={sectionIndex}
              exerciseIndex={exerciseIndex}
              workout={workout}
              onApply={onApplyEdit}
              onUpdateImageUrl={onUpdateImageUrl}
              initialAction={initialAction}
            />
          </TabsContent>

          <TabsContent value="swap" className="mt-4">
            <SwapModePanel
              exercise={exercise}
              sectionType={sectionType}
              workoutId={workoutId}
              sectionIndex={sectionIndex}
              exerciseIndex={exerciseIndex}
              workout={workout}
              onApply={onApplyEdit}
              onUpdateImageUrl={onUpdateImageUrl}
            />
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            <AddExercisePositionDialog
              open={positionDialogOpen}
              onOpenChange={setPositionDialogOpen}
              onSelect={handlePositionSelect}
              exerciseName={exercise.name}
            />
            {addPosition && onApplyAdd && (
              <AddModePanel
                exercise={exercise}
                sectionType={sectionType}
                workoutId={workoutId}
                sectionIndex={sectionIndex}
                exerciseIndex={exerciseIndex}
                insertPosition={addPosition}
                workout={workout}
                onApplyAdd={onApplyAdd}
                onUpdateImageUrl={onUpdateImageUrl}
              />
            )}
            {addPosition && !onApplyAdd && (
              <p className="text-sm text-muted-foreground">
                Add exercise is not available. Missing apply handler.
              </p>
            )}
            {!addPosition && !positionDialogOpen && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose before or after this exercise to add a new exercise.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setPositionDialogOpen(true)}
                >
                  Choose position
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <EditHistoryView history={editHistory} exercise={exercise} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
