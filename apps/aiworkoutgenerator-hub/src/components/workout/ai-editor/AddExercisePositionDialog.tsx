"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface AddExercisePositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (position: "before" | "after") => void;
  exerciseName?: string;
}

export function AddExercisePositionDialog({
  open,
  onOpenChange,
  onSelect,
  exerciseName,
}: AddExercisePositionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>
            {exerciseName
              ? `Add a new exercise before or after "${exerciseName}"`
              : "Add a new exercise before or after this exercise"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => {
              onSelect("before");
              onOpenChange(false);
            }}
          >
            <ArrowUp className="h-4 w-4 shrink-0" />
            Before this exercise
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => {
              onSelect("after");
              onOpenChange(false);
            }}
          >
            <ArrowDown className="h-4 w-4 shrink-0" />
            After this exercise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
