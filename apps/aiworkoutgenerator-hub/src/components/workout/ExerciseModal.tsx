"use client";

import { useState, useCallback, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Timer,
  CheckCircle2,
  Save,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExerciseImageHeader } from "./ExerciseImageHeader";
import { CoachExplainSection } from "./CoachExplainSection";
import { useExerciseImage } from "@/hooks/useExerciseImage";
import type {
  TrainerWorkoutSection,
  TrainerWorkoutExercise,
} from "@/types/firestore";

interface ExerciseModalProps {
  sections: TrainerWorkoutSection[];
  activeIndices: { sIdx: number; eIdx: number } | null;
  onClose: () => void;
  onNavigate: (indices: { sIdx: number; eIdx: number }) => void;
  onUpdateSet: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    field: string,
    value: string
  ) => void;
  onAddSet: (sIdx: number, eIdx: number) => void;
  onSaveWeights: () => void;
  weightSaveMessage: string | null;
  onToggleSetComplete?: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    completed: boolean
  ) => void;
  /** When false, ignore completion flags for row styling (editor preview). */
  showSessionCompletionState?: boolean;
}

export function ExerciseModal({
  sections,
  activeIndices,
  onClose,
  onNavigate,
  onUpdateSet,
  onAddSet,
  onSaveWeights,
  weightSaveMessage,
  onToggleSetComplete,
  showSessionCompletionState = true,
}: ExerciseModalProps) {
  const [showDetailedInstructions, setShowDetailedInstructions] =
    useState(false);
  const showDoneColumn = Boolean(onToggleSetComplete);

  // Get active exercise info (may be null if indices invalid)
  // Calculate this early so we can use it in the hook
  const activeSection = activeIndices ? sections[activeIndices.sIdx] : null;
  const activeExercise = activeSection?.exercises?.[
    activeIndices?.eIdx ?? -1
  ] as TrainerWorkoutExercise | undefined;

  // Get image URL with user preferences (hook must be called unconditionally at top level)
  const activeImageUrl = useExerciseImage(
    activeExercise?.name ?? "",
    activeExercise?.image_url
  );

  const handleNext = useCallback(() => {
    setShowDetailedInstructions(false);
    if (!activeIndices) return;
    const { sIdx, eIdx } = activeIndices;

    // Bounds validation: ensure section exists
    const currentSection = sections[sIdx];
    if (!currentSection) return;

    if (
      currentSection.exercises &&
      eIdx < currentSection.exercises.length - 1
    ) {
      onNavigate({ sIdx, eIdx: eIdx + 1 });
    } else if (sIdx < sections.length - 1) {
      onNavigate({ sIdx: sIdx + 1, eIdx: 0 });
    }
  }, [activeIndices, sections, onNavigate]);

  const handlePrev = useCallback(() => {
    setShowDetailedInstructions(false);
    if (!activeIndices) return;
    const { sIdx, eIdx } = activeIndices;

    if (eIdx > 0) {
      onNavigate({ sIdx, eIdx: eIdx - 1 });
    } else if (sIdx > 0) {
      const prevSection = sections[sIdx - 1];
      // Bounds validation: ensure previous section and exercises exist
      if (!prevSection?.exercises) return;
      onNavigate({ sIdx: sIdx - 1, eIdx: prevSection.exercises.length - 1 });
    }
  }, [activeIndices, sections, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeIndices) return;
      if (document.activeElement?.tagName === "INPUT") return;

      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndices, handleNext, handlePrev, onClose]);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (activeIndices) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activeIndices]);

  if (!activeIndices) return null;

  // Bounds validation: ensure section and exercise exist before accessing
  // This handles cases where sections change while modal is open (e.g., Firestore realtime updates)
  if (!activeSection?.exercises) {
    // Section no longer exists or has no exercises, close modal on next render
    // Using setTimeout to avoid calling setState during render
    setTimeout(onClose, 0);
    return null;
  }

  if (!activeExercise) {
    // Exercise no longer exists, close modal on next render
    setTimeout(onClose, 0);
    return null;
  }

  const activeSectionTitle = activeSection.type;

  const isFirst = activeIndices.sIdx === 0 && activeIndices.eIdx === 0;
  const lastSection = sections[sections.length - 1];
  const isLast =
    activeIndices.sIdx === sections.length - 1 &&
    lastSection?.exercises &&
    activeIndices.eIdx === lastSection.exercises.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-modal-title"
    >
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 text-foreground">
        <div className="flex flex-col">
          <span
            id="exercise-modal-title"
            className="text-primary text-xs font-bold uppercase tracking-widest"
          >
            {activeSectionTitle}
          </span>
          <span className="text-muted-foreground text-sm">
            Exercise {activeIndices.eIdx + 1} of{" "}
            {activeSection.exercises.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-muted"
          aria-label="Close exercise modal"
        >
          <X className="w-8 h-8 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>

      {/* Main Slide Area */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-4">
        {/* Prev Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          disabled={isFirst}
          className="p-3 rounded-full hover:bg-muted disabled:opacity-30 hidden md:flex h-16 w-16"
        >
          <ChevronLeft className="w-10 h-10 text-primary" />
        </Button>

        {/* Card Container */}
        <div className="w-full max-w-2xl bg-card rounded-2xl p-1 shadow-2xl border border-border relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-primary/60 rounded-2xl opacity-20 blur-sm"></div>
          <div className="relative bg-card rounded-xl overflow-hidden h-full max-h-[80vh] overflow-y-auto">
            {/* Exercise Image Header */}
            <ExerciseImageHeader
              src={activeImageUrl || undefined}
              alt={`${activeExercise.name} demonstration`}
              exerciseName={activeExercise.name}
              showPlaceholder={true}
              className="rounded-t-xl"
            />
            <div className="p-6 md:p-8">
              <div className="flex gap-2 mb-6">
                <Badge variant="secondary" className="uppercase tracking-wider">
                  {activeExercise.muscleTarget}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-muted p-4 rounded-xl border border-border/50">
                  <span className="text-muted-foreground text-xs uppercase font-bold block mb-1">
                    Total Sets
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {activeExercise.setDetails.length}
                  </span>
                </div>
                <div className="bg-muted p-4 rounded-xl border border-border/50">
                  <span className="text-muted-foreground text-xs uppercase font-bold block mb-1">
                    Tempo
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {activeExercise.tempo || "Standard"}
                  </span>
                </div>
              </div>

              {activeExercise.cues && activeExercise.cues.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Form Cues
                  </h3>
                  <ul className="grid gap-3">
                    {activeExercise.cues.map((cue: string, i: number) => (
                      <li
                        key={i}
                        className="flex gap-3 text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border"
                      >
                        <span className="text-primary font-bold text-lg">
                          •
                        </span>
                        <span className="leading-snug">{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeExercise.detailedInstructions && (
                <div className="mb-8">
                  <button
                    onClick={() =>
                      setShowDetailedInstructions(!showDetailedInstructions)
                    }
                    className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50 text-sm font-bold text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      Detailed Instructions
                    </div>
                    {showDetailedInstructions ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  {showDetailedInstructions && (
                    <div className="mt-4 p-6 bg-background rounded-xl border border-border text-base text-muted-foreground leading-relaxed animate-in slide-in-from-top-2 duration-200">
                      {activeExercise.detailedInstructions}
                    </div>
                  )}
                </div>
              )}

              {activeExercise.ai_coach_explain && (
                <div className="mb-8">
                  <CoachExplainSection
                    content={activeExercise.ai_coach_explain}
                    size="large"
                  />
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Set Details
                </h3>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4 text-left">Set</th>
                        <th className="py-3 px-4 text-center">Reps</th>
                        <th className="py-3 px-4 text-center">Intensity</th>
                        <th className="py-3 px-4 text-center text-primary">
                          Weight
                        </th>
                        <th className="py-3 px-4 text-right">Rest / Time</th>
                        <th className="py-3 px-4 text-right">Done</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card/50">
                      {activeExercise.setDetails.map((set, idx) => {
                        const isSetCompleted =
                          showSessionCompletionState &&
                          set.completed === true;
                        const isExerciseCompleted =
                          showSessionCompletionState &&
                          activeExercise.completed === true;
                        const shouldStrikethrough =
                          isExerciseCompleted && !isSetCompleted;
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-muted/50 transition-colors ${
                              isSetCompleted ? "bg-emerald-500/5" : ""
                            }`}
                          >
                            <td className="py-4 px-4 font-mono text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {onToggleSetComplete && (
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onToggleSetComplete(
                                        activeIndices.sIdx,
                                        activeIndices.eIdx,
                                        idx,
                                        !isSetCompleted
                                      );
                                    }}
                                    onMouseDown={(e) => {
                                      // Prevent focus change which can cause scroll
                                      e.preventDefault();
                                    }}
                                    className={`h-4 w-4 rounded border flex items-center justify-center ${
                                      isSetCompleted
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "border-border text-muted-foreground"
                                    }`}
                                    aria-label={
                                      isSetCompleted
                                        ? "Mark set as incomplete"
                                        : "Mark set as complete"
                                    }
                                  >
                                    {isSetCompleted && (
                                      <span className="text-[10px] leading-none">
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                )}
                                <span
                                  className={
                                    shouldStrikethrough
                                      ? "line-through opacity-60"
                                      : ""
                                  }
                                >
                                  {idx + 1}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-2 text-center">
                              {set.isUserAdded ? (
                                <Input
                                  type="text"
                                  value={set.reps || ""}
                                  onChange={(e) =>
                                    onUpdateSet(
                                      activeIndices.sIdx,
                                      activeIndices.eIdx,
                                      idx,
                                      "reps",
                                      e.target.value
                                    )
                                  }
                                  className={`w-full bg-background border-border text-foreground text-center p-2 ${
                                    shouldStrikethrough ? "opacity-60" : ""
                                  }`}
                                />
                              ) : (
                                <span
                                  className={`font-bold text-foreground text-lg ${
                                    shouldStrikethrough
                                      ? "line-through opacity-60"
                                      : ""
                                  }`}
                                >
                                  {set.reps || "-"}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-2 text-center">
                              {set.isUserAdded ? (
                                <Input
                                  type="text"
                                  value={set.weight || ""}
                                  onChange={(e) =>
                                    onUpdateSet(
                                      activeIndices.sIdx,
                                      activeIndices.eIdx,
                                      idx,
                                      "weight",
                                      e.target.value
                                    )
                                  }
                                  className={`w-full bg-background border-border text-foreground text-center text-xs p-2 ${
                                    shouldStrikethrough ? "opacity-60" : ""
                                  }`}
                                />
                              ) : (
                                <span
                                  className={`text-muted-foreground ${
                                    shouldStrikethrough
                                      ? "line-through opacity-60"
                                      : ""
                                  }`}
                                >
                                  {set.weight || "-"}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="text"
                                placeholder="lbs"
                                value={set.actualWeight || ""}
                                onChange={(e) =>
                                  onUpdateSet(
                                    activeIndices.sIdx,
                                    activeIndices.eIdx,
                                    idx,
                                    "actualWeight",
                                    e.target.value
                                  )
                                }
                                className={`w-full bg-background border-border text-primary text-center font-bold p-2 placeholder-muted-foreground ${
                                  shouldStrikethrough ? "opacity-60" : ""
                                }`}
                              />
                            </td>
                            <td className="py-4 px-2 text-right">
                              {set.isUserAdded ? (
                                <Input
                                  type="text"
                                  value={set.duration || set.rest || ""}
                                  onChange={(e) =>
                                    onUpdateSet(
                                      activeIndices.sIdx,
                                      activeIndices.eIdx,
                                      idx,
                                      "rest",
                                      e.target.value
                                    )
                                  }
                                  className={`w-full bg-background border-border text-foreground text-center p-2 ${
                                    shouldStrikethrough ? "opacity-60" : ""
                                  }`}
                                />
                              ) : (
                                <span
                                  className={`text-muted-foreground ${
                                    shouldStrikethrough
                                      ? "line-through opacity-60"
                                      : ""
                                  }`}
                                >
                                  {set.duration || set.rest || "-"}
                                </span>
                              )}
                            </td>
                            {showDoneColumn ? (
                              <td className="py-4 px-4 text-right">
                                {onToggleSetComplete ? (
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onToggleSetComplete(
                                        activeIndices.sIdx,
                                        activeIndices.eIdx,
                                        idx,
                                        !isSetCompleted
                                      );
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                    }}
                                    className={`inline-flex items-center justify-end gap-2 text-[11px] font-semibold ${
                                      isSetCompleted
                                        ? "text-emerald-400"
                                        : "text-muted-foreground hover:text-emerald-400"
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
                                    <span
                                      className={
                                        shouldStrikethrough
                                          ? "line-through opacity-60"
                                          : ""
                                      }
                                    >
                                      {isSetCompleted ? "Done" : "Mark Complete"}
                                    </span>
                                  </button>
                                ) : null}
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Add Set Button */}
                  <div className="bg-card/50 p-2">
                    <button
                      onClick={() =>
                        onAddSet(activeIndices.sIdx, activeIndices.eIdx)
                      }
                      className="w-full py-2 border-2 border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" /> Add Set
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Save Button */}
              <div className="mt-6 flex justify-end items-center gap-4 border-t border-border pt-6">
                {weightSaveMessage && (
                  <span className="text-primary text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                    <CheckCircle2 className="w-4 h-4" /> {weightSaveMessage}
                  </span>
                )}
                <Button onClick={onSaveWeights} className="gap-2">
                  <Save className="w-5 h-5" /> Save Weights
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Next Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={isLast}
          className="p-3 rounded-full hover:bg-muted disabled:opacity-30 hidden md:flex h-16 w-16"
        >
          <ChevronRight className="w-10 h-10 text-primary" />
        </Button>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden gap-4 mt-6 w-full px-4">
        <Button
          variant="secondary"
          onClick={handlePrev}
          disabled={isFirst}
          className="flex-1"
        >
          <ChevronLeft className="w-6 h-6" /> Prev
        </Button>
        <Button
          variant="secondary"
          onClick={handleNext}
          disabled={isLast}
          className="flex-1"
        >
          Next <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
      <div className="mt-6 text-muted-foreground text-sm hidden md:block">
        Use Arrow Keys to Navigate • ESC to Close
      </div>
    </div>
  );
}
