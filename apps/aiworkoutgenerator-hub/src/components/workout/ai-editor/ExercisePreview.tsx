"use client";

import { useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExerciseImageHeader } from "@/components/workout";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import type { ExercisePreviewProps } from "./types";

/**
 * Component to display side-by-side comparison of original vs modified exercise.
 * Memoized to prevent unnecessary re-renders.
 */
export const ExercisePreview = memo(
  function ExercisePreview({
    originalExercise,
    modifiedExercise,
    fieldsModified,
    explanation,
  }: ExercisePreviewProps) {
    const isFieldModified = (field: string) => fieldsModified.includes(field);
    const afterCardRef = useRef<HTMLDivElement>(null);

    const scrollToAfter = () => {
      afterCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

    return (
      <div className="space-y-4">
        {explanation && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">AI Explanation</CardTitle>
              <CardDescription className="text-sm">
                {explanation}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Exercise */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Before</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scrollToAfter}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  After
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <ExercisePreviewSection
                  title="Name"
                  before={originalExercise.name}
                  after={modifiedExercise.name}
                  isModified={isFieldModified("name")}
                />
                <ExercisePreviewSection
                  title="Sets & Reps"
                  before={`${originalExercise.sets} sets`}
                  after={`${modifiedExercise.sets} sets`}
                  isModified={
                    isFieldModified("sets") || isFieldModified("setDetails")
                  }
                  beforeDetails={originalExercise.setDetails}
                  afterDetails={modifiedExercise.setDetails}
                />
                {originalExercise.detailedInstructions && (
                  <ExercisePreviewSection
                    title="Instructions"
                    before={originalExercise.detailedInstructions}
                    after={modifiedExercise.detailedInstructions || ""}
                    isModified={isFieldModified("detailedInstructions")}
                    multiline
                  />
                )}
                {originalExercise.cues && originalExercise.cues.length > 0 && (
                  <ExercisePreviewSection
                    title="Form Cues"
                    before={originalExercise.cues.join(", ")}
                    after={modifiedExercise.cues?.join(", ") || ""}
                    isModified={isFieldModified("cues")}
                    multiline
                  />
                )}
                {originalExercise.equipment_needed &&
                  originalExercise.equipment_needed.length > 0 && (
                    <ExercisePreviewSection
                      title="Equipment"
                      before={originalExercise.equipment_needed.join(", ")}
                      after={
                        modifiedExercise.equipment_needed?.join(", ") || ""
                      }
                      isModified={isFieldModified("equipment_needed")}
                    />
                  )}
                {originalExercise.muscleTarget && (
                  <ExercisePreviewSection
                    title="Muscle Target"
                    before={originalExercise.muscleTarget}
                    after={modifiedExercise.muscleTarget}
                    isModified={isFieldModified("muscleTarget")}
                  />
                )}
                {originalExercise.tempo && (
                  <ExercisePreviewSection
                    title="Tempo"
                    before={originalExercise.tempo}
                    after={modifiedExercise.tempo || ""}
                    isModified={isFieldModified("tempo")}
                  />
                )}
              </Accordion>
            </CardContent>
          </Card>

          {/* Modified Exercise */}
          <Card ref={afterCardRef}>
            <CardHeader>
              <CardTitle className="text-base">After</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Preview */}
              {modifiedExercise.image_url && (
                <div className="w-full">
                  <ExerciseImageHeader
                    src={modifiedExercise.image_url}
                    alt={`${modifiedExercise.name} demonstration`}
                    exerciseName={modifiedExercise.name}
                    showPlaceholder={false}
                    className="rounded-lg"
                  />
                </div>
              )}
              <Accordion type="multiple" className="w-full">
                <ExercisePreviewSection
                  title="Name"
                  before={originalExercise.name}
                  after={modifiedExercise.name}
                  isModified={isFieldModified("name")}
                  showAfter
                />
                <ExercisePreviewSection
                  title="Sets & Reps"
                  before={`${originalExercise.sets} sets`}
                  after={`${modifiedExercise.sets} sets`}
                  isModified={
                    isFieldModified("sets") || isFieldModified("setDetails")
                  }
                  beforeDetails={originalExercise.setDetails}
                  afterDetails={modifiedExercise.setDetails}
                  showAfter
                />
                {(originalExercise.detailedInstructions ||
                  modifiedExercise.detailedInstructions) && (
                  <ExercisePreviewSection
                    title="Instructions"
                    before={originalExercise.detailedInstructions || ""}
                    after={modifiedExercise.detailedInstructions || ""}
                    isModified={isFieldModified("detailedInstructions")}
                    multiline
                    showAfter
                  />
                )}
                {((originalExercise.cues && originalExercise.cues.length > 0) ||
                  (modifiedExercise.cues &&
                    modifiedExercise.cues.length > 0)) && (
                  <ExercisePreviewSection
                    title="Form Cues"
                    before={
                      originalExercise.cues && originalExercise.cues.length > 0
                        ? originalExercise.cues.join(", ")
                        : ""
                    }
                    after={
                      modifiedExercise.cues && modifiedExercise.cues.length > 0
                        ? modifiedExercise.cues.join(", ")
                        : ""
                    }
                    isModified={isFieldModified("cues")}
                    multiline
                    showAfter
                  />
                )}
                {((originalExercise.equipment_needed &&
                  originalExercise.equipment_needed.length > 0) ||
                  (modifiedExercise.equipment_needed &&
                    modifiedExercise.equipment_needed.length > 0)) && (
                  <ExercisePreviewSection
                    title="Equipment"
                    before={
                      originalExercise.equipment_needed &&
                      originalExercise.equipment_needed.length > 0
                        ? originalExercise.equipment_needed.join(", ")
                        : ""
                    }
                    after={
                      modifiedExercise.equipment_needed &&
                      modifiedExercise.equipment_needed.length > 0
                        ? modifiedExercise.equipment_needed.join(", ")
                        : ""
                    }
                    isModified={isFieldModified("equipment_needed")}
                    showAfter
                  />
                )}
                {(originalExercise.muscleTarget ||
                  modifiedExercise.muscleTarget) && (
                  <ExercisePreviewSection
                    title="Muscle Target"
                    before={originalExercise.muscleTarget || ""}
                    after={modifiedExercise.muscleTarget || ""}
                    isModified={isFieldModified("muscleTarget")}
                    showAfter
                  />
                )}
                {(originalExercise.tempo || modifiedExercise.tempo) && (
                  <ExercisePreviewSection
                    title="Tempo"
                    before={originalExercise.tempo || ""}
                    after={modifiedExercise.tempo || ""}
                    isModified={isFieldModified("tempo")}
                    showAfter
                  />
                )}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Using reference equality for exercise objects because:
    // - editResponse state maintains stable references until setEditResponse is called
    // - exercise prop from parent should be stable (same reference if data unchanged)
    // - This matches the pattern used in EditHistoryView and avoids expensive deep equality checks on every render
    // - Deep equality would be O(n) object traversal on every render vs O(1) reference check, reducing performance
    // Note: If parent components recreate objects on every render, fix the parent with useMemo rather than using deep equality here
    // Order-independent shallow comparison for fieldsModified (array of strings)
    // Avoids unnecessary re-renders when the same fields are provided in a different order
    // Since the component uses fieldsModified.includes(), order doesn't affect functionality
    const fieldsModifiedEqual = (() => {
      if (prevProps.fieldsModified.length !== nextProps.fieldsModified.length) {
        return false;
      }
      const prevSorted = [...prevProps.fieldsModified].sort();
      const nextSorted = [...nextProps.fieldsModified].sort();
      return prevSorted.every((field, index) => field === nextSorted[index]);
    })();

    return (
      prevProps.originalExercise === nextProps.originalExercise &&
      prevProps.modifiedExercise === nextProps.modifiedExercise &&
      prevProps.explanation === nextProps.explanation &&
      fieldsModifiedEqual
    );
  }
);

interface ExercisePreviewSectionProps {
  title: string;
  before: string;
  after: string;
  isModified: boolean;
  beforeDetails?: TrainerWorkoutExercise["setDetails"];
  afterDetails?: TrainerWorkoutExercise["setDetails"];
  multiline?: boolean;
  showAfter?: boolean;
}

function ExercisePreviewSection({
  title,
  before,
  after,
  isModified,
  beforeDetails,
  afterDetails,
  multiline = false,
  showAfter = false,
}: ExercisePreviewSectionProps) {
  const displayValue = showAfter ? after : before;
  const displayDetails = showAfter ? afterDetails : beforeDetails;

  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-sm">
        <div className="flex items-center gap-2">
          {title}
          {isModified && (
            <Badge variant="secondary" className="text-xs">
              Modified
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div
          className={`text-sm ${isModified && showAfter ? "bg-green-50 dark:bg-green-950/20 p-2 rounded" : ""} ${multiline ? "whitespace-pre-wrap" : ""}`}
        >
          {displayDetails ? (
            <div className="space-y-2">
              {displayDetails.map((set, idx) => (
                <div
                  key={idx}
                  className="text-xs border-b pb-2 last:border-b-0"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Reps:</span>
                    <span>{set.reps || "-"}</span>
                    <span className="font-medium">Weight:</span>
                    <span>{set.weight || "-"}</span>
                    {set.rest && (
                      <>
                        <span className="font-medium">Rest:</span>
                        <span>{set.rest}</span>
                      </>
                    )}
                  </div>
                  {set.notes && (
                    <p className="mt-1 text-muted-foreground">{set.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={multiline ? "whitespace-pre-wrap" : ""}>
              {displayValue || (
                <span className="text-muted-foreground italic">Not set</span>
              )}
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
