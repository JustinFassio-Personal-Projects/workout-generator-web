"use client";

import { useState } from "react";
import { GraduationCap, Wand2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { TrustBadge } from "./TrustBadge";
import { ReasoningChip } from "./ReasoningChip";
import { CoachExplainSection } from "../CoachExplainSection";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useExerciseImage } from "@/hooks/useExerciseImage";
import {
  ExerciseCompleteFooter,
  ExerciseSetLogTable,
} from "@/components/workout/ExerciseSetLogTable";
import { ResizableExerciseSplit } from "./ResizableExerciseSplit";

interface ManualExerciseCardProps {
  exercise: TrainerWorkoutExercise;
  exerciseId: string;
  sectionIdx: number;
  exerciseIdx: number;
  safetyMode?: boolean;
  reasoning?: string;
  trustBadges?: Array<{
    type: "clinically-vetted" | "ai-optimized" | "safety-modified";
    explanation?: string;
  }>;
  onUpdateSet: (
    sectionIdx: number,
    exerciseIdx: number,
    setIdx: number,
    field: string,
    value: string
  ) => void;
  onToggleSetComplete: (
    sectionIdx: number,
    exerciseIdx: number,
    setIdx: number,
    completed: boolean
  ) => void;
  onExerciseComplete?: (
    sectionIdx: number,
    exerciseIdx: number,
    completed: boolean
  ) => void;
  onOpenAIEditor?: () => void;
  onOpenCoachExplain?: () => void;
  onChooseImage?: () => void;
  className?: string;
}

/**
 * Exercise card for ManualWorkoutPlayer with editable set logging.
 * Reuses layout from ExerciseCardPlayer overview mode.
 */
export function ManualExerciseCard({
  exercise,
  exerciseId,
  sectionIdx,
  exerciseIdx,
  safetyMode = false,
  reasoning,
  trustBadges = [],
  onUpdateSet,
  onToggleSetComplete,
  onExerciseComplete,
  onOpenAIEditor,
  onOpenCoachExplain,
  onChooseImage,
  className = "",
}: ManualExerciseCardProps) {
  const [showDetails, setShowDetails] = useState(!safetyMode);
  const preferredImageUrl = useExerciseImage(exercise.name, exercise.image_url);
  const exerciseImage = preferredImageUrl || exercise.image_url || null;

  const primaryCue = exercise.cues?.[0] || "";
  const remainingCues = exercise.cues?.slice(1) || [];

  const hasCertifiedImage = exercise.image_source === "master";
  const defaultBadges = [
    {
      type: "ai-optimized" as const,
      explanation: "Selected by algorithm for your specific goal.",
    },
    ...(hasCertifiedImage
      ? [
          {
            type: "clinically-vetted" as const,
            explanation: "Content reviewed by a certified professional.",
          },
        ]
      : []),
  ];
  const allBadges = [...defaultBadges, ...trustBadges];

  return (
    <div
      id={exerciseId}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden transition-all w-full min-w-0",
        className
      )}
    >
      {/* Header with badges */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-xl font-bold leading-tight flex-1 min-w-0">
                {exercise.name}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenAIEditor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAIEditor();
                    }}
                    className="bg-background/90 backdrop-blur-sm border-border hover:bg-background shadow-sm shrink-0"
                    aria-label="Edit with AI"
                    title="Edit with AI"
                  >
                    <Wand2 className="w-4 h-4 mr-1.5 text-[hsl(82.7,77.9%,55.5%)]" />
                    <span className="text-xs hidden sm:inline">AI Edit</span>
                  </Button>
                )}
                {onChooseImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChooseImage();
                    }}
                    className="bg-background/90 backdrop-blur-sm border-border hover:border-primary hover:bg-background shadow-sm shrink-0"
                    aria-label="Choose Image"
                    title="Select an image for this exercise"
                  >
                    <ImageIcon className="w-4 h-4 mr-1.5" />
                    <span className="text-xs hidden sm:inline">
                      Choose Image
                    </span>
                  </Button>
                )}
                {onOpenCoachExplain && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCoachExplain();
                    }}
                    className="bg-background/90 backdrop-blur-sm border-[hsl(82.7,77.9%,55.5%)]/50 hover:border-[hsl(82.7,77.9%,55.5%)] hover:bg-background shadow-sm shrink-0"
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
            </div>
            {exercise.ai_coach_explain && (
              <CoachExplainSection
                content={exercise.ai_coach_explain}
                size="small"
              />
            )}
          </div>
          <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-1 rounded uppercase tracking-wider border border-border shrink-0">
            {exercise.muscleTarget}
          </span>
        </div>

        {allBadges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {allBadges.map((badge, idx) => (
              <TrustBadge
                key={`${badge.type}-${idx}`}
                type={badge.type}
                explanation={badge.explanation}
              />
            ))}
          </div>
        )}

        {reasoning && <ReasoningChip reasoning={reasoning} className="mt-2" />}

        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          {exercise.tempo && (
            <span>
              Tempo:{" "}
              <strong className="text-foreground">{exercise.tempo}</strong>
            </span>
          )}
          <span>
            Sets: <strong className="text-foreground">{exercise.sets}</strong>
          </span>
        </div>
      </div>

      {/* Image + details: resizable split on md+, stacked on mobile */}
      <ResizableExerciseSplit
        storageKey="manual-exercise-card"
        defaultLeftPercent={58}
        minLeftPercent={24}
        maxLeftPercent={72}
        rowClassName="md:min-h-[min(520px,70vh)]"
        left={
          <div className="relative w-full h-full min-h-[200px] md:min-h-[240px] bg-muted aspect-video md:aspect-auto overflow-hidden">
            {exerciseImage ? (
              <Image
                src={exerciseImage}
                alt={`${exercise.name} demonstration`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>
        }
        right={
          <div className="flex-1 min-w-0 w-full p-4 space-y-4">
            {primaryCue && (
              <div className="bg-muted/50 rounded-lg border border-border p-3">
                <p className="font-medium text-sm">{primaryCue}</p>
              </div>
            )}

            {safetyMode ? (
              <Accordion
                type="single"
                collapsible
                value={showDetails ? "details" : undefined}
                onValueChange={(value) => setShowDetails(value === "details")}
              >
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="text-sm py-2">
                    More Details
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <RemainingCues cues={remainingCues} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              remainingCues.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Form Cues</h4>
                  <ul className="space-y-1">
                    {remainingCues.map((cue, idx) => (
                      <li
                        key={idx}
                        className="text-muted-foreground flex items-start gap-2 text-sm"
                      >
                        <span className="text-primary mt-1">•</span>
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}

            <div>
              <h4 className="font-semibold mb-2 text-sm">Set Details</h4>
              <div className="border border-border rounded-lg overflow-hidden p-2 sm:p-3">
                <ExerciseSetLogTable
                  exercise={exercise}
                  sectionIdx={sectionIdx}
                  exerciseIdx={exerciseIdx}
                  onUpdateSet={onUpdateSet}
                  onToggleSetComplete={onToggleSetComplete}
                  showLoggingColumns
                  gridMinWidth="min-w-[36rem]"
                />
                <ExerciseCompleteFooter
                  exercise={exercise}
                  sectionIdx={sectionIdx}
                  exerciseIdx={exerciseIdx}
                  onExerciseComplete={onExerciseComplete}
                  borderClassName="border-border"
                />
              </div>
            </div>

            {exercise.ai_coach_explain && (
              <div>
                <CoachExplainSection
                  content={exercise.ai_coach_explain}
                  size="large"
                />
              </div>
            )}

            <Accordion type="single" collapsible>
              <AccordionItem value="clinical" className="border-none">
                <AccordionTrigger className="text-sm py-2">
                  Detailed Instructions
                </AccordionTrigger>
                <AccordionContent className="pt-2 text-sm text-muted-foreground">
                  <p>
                    Source Database: NASM v4.2. Biomechanical Load:{" "}
                    {exercise.muscleTarget}-Medium.
                  </p>
                  {exercise.detailedInstructions && (
                    <p className="mt-2">{exercise.detailedInstructions}</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        }
      />
    </div>
  );
}

function RemainingCues({ cues }: { cues: string[] }) {
  if (cues.length === 0) return null;
  return (
    <div>
      <h4 className="font-semibold mb-2 text-sm">Form Cues</h4>
      <ul className="space-y-1">
        {cues.map((cue, idx) => (
          <li
            key={idx}
            className="text-muted-foreground flex items-start gap-2 text-sm"
          >
            <span className="text-primary mt-1">•</span>
            <span>{cue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
