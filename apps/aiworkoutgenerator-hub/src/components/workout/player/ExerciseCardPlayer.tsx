"use client";

import { useState, useEffect, useRef } from "react";
import { GraduationCap, Wand2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { ViewMorph } from "./ViewMorph";
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
import { getExerciseImagesByPosition } from "@/services/image/ImageMappingService";
import { useExerciseImage } from "@/hooks/useExerciseImage";

interface ExerciseCardPlayerProps {
  exercise: TrainerWorkoutExercise;
  exerciseId: string; // For View Transitions
  safetyMode?: boolean;
  isActive?: boolean; // Whether this is the active exercise view
  reasoning?: string; // Why this exercise was selected
  trustBadges?: Array<{
    type: "clinically-vetted" | "ai-optimized" | "safety-modified";
    explanation?: string;
  }>;
  onSelect?: () => void;
  onOpenCoachExplain?: () => void;
  onOpenAIEditor?: () => void;
  onChooseImage?: () => void;
  className?: string;
}

/**
 * Player-specific exercise card with trust features, progressive disclosure,
 * and reasoning chips. Uses View Transitions for morphing animations.
 */
export function ExerciseCardPlayer({
  exercise,
  exerciseId,
  safetyMode = false,
  isActive = false,
  reasoning,
  trustBadges = [],
  onSelect,
  onOpenCoachExplain,
  onOpenAIEditor,
  onChooseImage,
  className = "",
}: ExerciseCardPlayerProps) {
  const [showDetails, setShowDetails] = useState(!safetyMode);

  // Get user's preferred image (checks user preferences first)
  const preferredImageUrl = useExerciseImage(exercise.name, exercise.image_url);

  const [exerciseImage, setExerciseImage] = useState<string | null>(
    preferredImageUrl || exercise.image_url || null
  );
  const abortControllerRef = useRef<{ cancelled: boolean } | null>(null);
  const prevImageUrlRef = useRef<string | null>(
    preferredImageUrl || exercise.image_url || null
  );

  // Update image when preferred image changes (user selected a new image)
  useEffect(() => {
    const newImageUrl = preferredImageUrl || exercise.image_url || null;
    if (prevImageUrlRef.current !== newImageUrl) {
      prevImageUrlRef.current = newImageUrl;
      // Intentionally sync state when preferred image changes.
      // This is a local state update based on prop change, so we disable the lint rule.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExerciseImage(newImageUrl);
    }
  }, [preferredImageUrl, exercise.image_url]);

  // Fetch image position 1 when in active view (but prefer user preference)
  useEffect(() => {
    if (!isActive) {
      // When not active, use preferred image or exercise.image_url
      const newImageUrl = preferredImageUrl || exercise.image_url || null;
      if (prevImageUrlRef.current !== newImageUrl) {
        prevImageUrlRef.current = newImageUrl;
        // Intentionally sync state when isActive changes to false.
        // This is a local state reset based on prop change, so we disable the lint rule.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExerciseImage(newImageUrl);
      }
      return;
    }

    // If user has a preference, use it (don't fetch position 1)
    if (preferredImageUrl) {
      setExerciseImage(preferredImageUrl);
      return;
    }

    // Update ref when active
    prevImageUrlRef.current = exercise.image_url || null;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.cancelled = true;
    }

    // Create new cancellation token for this request
    const cancellationToken = { cancelled: false };
    abortControllerRef.current = cancellationToken;

    // Fetch image position 1 asynchronously (only if no user preference)
    getExerciseImagesByPosition(exercise.name, [1])
      .then((images) => {
        // Only update state if this specific request wasn't cancelled
        if (!cancellationToken.cancelled) {
          // Use fetched image or fallback to exercise.image_url
          const imageToUse = images[0] || exercise.image_url || null;
          setExerciseImage(imageToUse);
        }
      })
      .catch(() => {
        // On error, fallback to exercise.image_url
        if (!cancellationToken.cancelled) {
          setExerciseImage(exercise.image_url || null);
        }
      });

    // Cleanup: cancel request when effect re-runs or component unmounts
    return () => {
      cancellationToken.cancelled = true;
    };
  }, [exercise.name, exercise.image_url, isActive, preferredImageUrl]);

  // In Safety Mode, show only ONE primary form cue
  const primaryCue = exercise.cues?.[0] || "";
  const remainingCues = exercise.cues?.slice(1) || [];

  // Determine if exercise has certified image (for Clinically Vetted badge)
  const hasCertifiedImage = exercise.image_source === "master";

  // Default badges: AI Optimized (always), Clinically Vetted (if certified)
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
    <ViewMorph id={exerciseId} className={className}>
      <div
        className={cn(
          "bg-card border border-border rounded-xl overflow-hidden transition-all",
          isActive && "shadow-xl border-0 rounded-none w-full",
          onSelect && "cursor-pointer hover:border-primary/50"
        )}
        onClick={onSelect}
      >
        {isActive ? (
          /* Active Mode: Side-by-side layout */
          <div className="flex flex-col md:flex-row md:min-h-[600px]">
            {/* Left Column: Workout Details */}
            <div className="w-full md:w-1/2 min-w-0 overflow-y-auto flex flex-col">
              {/* Header with badges */}
              <div className="p-3 border-b border-border shrink-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold leading-tight flex-1 min-w-0">
                        {exercise.name}
                      </h3>
                      {/* AI Edit and Coach Explain Buttons - Next to title */}
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
                            <span className="text-xs hidden sm:inline">
                              AI Edit
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
                    {/* Coach Explain Section - Display existing content */}
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

                {/* Trust Badges */}
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

                {/* Reasoning Chip */}
                {reasoning && (
                  <ReasoningChip reasoning={reasoning} className="mt-2" />
                )}

                {/* Exercise metadata */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  {exercise.tempo && (
                    <span>
                      Tempo:{" "}
                      <strong className="text-foreground">
                        {exercise.tempo}
                      </strong>
                    </span>
                  )}
                  <span>
                    Sets:{" "}
                    <strong className="text-foreground">{exercise.sets}</strong>
                  </span>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-4 space-y-4 flex-1">
                {/* Primary Form Cue (always visible) */}
                {primaryCue && (
                  <div className="bg-muted/50 rounded-lg border border-border p-2">
                    <p className="font-medium text-xs">{primaryCue}</p>
                  </div>
                )}

                {/* Progressive Disclosure */}
                {safetyMode && (
                  <Accordion
                    type="single"
                    collapsible
                    value={showDetails ? "details" : undefined}
                    onValueChange={(value) =>
                      setShowDetails(value === "details")
                    }
                  >
                    <AccordionItem value="details" className="border-none">
                      <AccordionTrigger className="text-sm py-2">
                        More Details
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <ExerciseDetails
                          exercise={exercise}
                          remainingCues={remainingCues}
                          safetyMode={false}
                          isActive={isActive}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {!safetyMode && (
                  <ExerciseDetails
                    exercise={exercise}
                    remainingCues={remainingCues}
                    safetyMode={false}
                    isActive={isActive}
                  />
                )}

                {/* Detailed Instructions Accordion */}
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

                {/* Coach Explain Expandable Container */}
                {exercise.ai_coach_explain && (
                  <div>
                    <CoachExplainSection
                      content={exercise.ai_coach_explain}
                      size="large"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Single Image (Position 1) */}
            <div className="w-full md:w-1/2 shrink-0 border-l border-border bg-muted flex items-stretch">
              <div className="relative w-full aspect-video md:aspect-auto md:h-full min-h-[300px]">
                {exerciseImage || exercise.image_url ? (
                  <Image
                    src={exerciseImage || exercise.image_url || ""}
                    alt={`${exercise.name} demonstration`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={isActive}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-muted/50">
                    <span className="text-sm">No image available</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Overview Mode: Original vertical layout */
          <>
            {/* Header with badges */}
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold leading-tight flex-1 min-w-0">
                      {exercise.name}
                    </h3>
                    {/* AI Edit and Coach Explain Buttons - Next to title */}
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
                          <span className="text-xs hidden sm:inline">
                            AI Edit
                          </span>
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
                  {/* Coach Explain Section - Display existing content */}
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

              {/* Trust Badges */}
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

              {/* Reasoning Chip */}
              {reasoning && (
                <ReasoningChip reasoning={reasoning} className="mt-2" />
              )}

              {/* Exercise metadata */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                {exercise.tempo && (
                  <span>
                    Tempo:{" "}
                    <strong className="text-foreground">
                      {exercise.tempo}
                    </strong>
                  </span>
                )}
                <span>
                  Sets:{" "}
                  <strong className="text-foreground">{exercise.sets}</strong>
                </span>
              </div>
            </div>

            {/* Single Image */}
            <div className="relative w-full bg-muted aspect-video overflow-hidden">
              {exerciseImage || exercise.image_url ? (
                <Image
                  src={exerciseImage || exercise.image_url || ""}
                  alt={`${exercise.name} demonstration`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">No image available</span>
                </div>
              )}
            </div>

            {/* Coach Explain Expandable Container - Below Image */}
            {exercise.ai_coach_explain && (
              <div className="px-4 pb-4">
                <CoachExplainSection
                  content={exercise.ai_coach_explain}
                  size="large"
                />
              </div>
            )}

            {/* Content Area */}
            <div className="p-4 space-y-4">
              {/* Primary Form Cue (always visible) */}
              {primaryCue && (
                <div className="bg-muted/50 rounded-lg border border-border p-3">
                  <p className="font-medium text-sm">{primaryCue}</p>
                </div>
              )}

              {/* Progressive Disclosure - Always use accordion in active mode for better UX */}
              {isActive ? (
                <Accordion
                  type="single"
                  collapsible
                  value={showDetails ? "details" : undefined}
                  onValueChange={(value) => setShowDetails(value === "details")}
                >
                  <AccordionItem value="details" className="border-none">
                    <AccordionTrigger className="text-sm py-2">
                      Detailed Instructions
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <ExerciseDetails
                        exercise={exercise}
                        remainingCues={remainingCues}
                        safetyMode={false}
                        isActive={isActive}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : safetyMode ? (
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
                      <ExerciseDetails
                        exercise={exercise}
                        remainingCues={remainingCues}
                        safetyMode={false}
                        isActive={isActive}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : (
                <ExerciseDetails
                  exercise={exercise}
                  remainingCues={remainingCues}
                  safetyMode={false}
                  isActive={isActive}
                />
              )}

              {/* Detailed Instructions Accordion */}
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
          </>
        )}
      </div>
    </ViewMorph>
  );
}

function ExerciseDetails({
  exercise,
  remainingCues,
  safetyMode,
  isActive = false,
}: {
  exercise: TrainerWorkoutExercise;
  remainingCues: string[];
  safetyMode: boolean;
  isActive?: boolean;
}) {
  return (
    <div className={cn(isActive ? "space-y-2" : "space-y-3")}>
      {/* Additional Cues */}
      {remainingCues.length > 0 && (
        <div>
          <h4
            className={cn(
              "font-semibold mb-2",
              isActive ? "text-xs" : "text-sm"
            )}
          >
            Form Cues
          </h4>
          <ul className="space-y-1">
            {remainingCues.map((cue, idx) => (
              <li
                key={idx}
                className={cn(
                  "text-muted-foreground flex items-start gap-2",
                  isActive ? "text-xs" : "text-sm"
                )}
              >
                <span className="text-primary mt-1">•</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Set Details Table */}
      {exercise.setDetails && exercise.setDetails.length > 0 && (
        <div>
          <h4
            className={cn(
              "font-semibold mb-2",
              isActive ? "text-xs" : "text-sm"
            )}
          >
            Set Details
          </h4>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className={cn("w-full", isActive ? "text-xs" : "text-sm")}>
              <thead className="bg-muted">
                <tr>
                  <th
                    className={cn(
                      "text-left font-semibold",
                      isActive ? "p-1" : "p-2"
                    )}
                  >
                    Set
                  </th>
                  <th
                    className={cn(
                      "text-right font-semibold",
                      isActive ? "p-1" : "p-2"
                    )}
                  >
                    Reps
                  </th>
                  {!safetyMode && (
                    <>
                      <th
                        className={cn(
                          "text-right font-semibold",
                          isActive ? "p-1" : "p-2"
                        )}
                      >
                        Weight
                      </th>
                      <th
                        className={cn(
                          "text-right font-semibold",
                          isActive ? "p-1" : "p-2"
                        )}
                      >
                        Rest
                      </th>
                      <th
                        className={cn(
                          "text-center font-semibold",
                          isActive ? "p-1" : "p-2"
                        )}
                      >
                        Completed
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {exercise.setDetails.map((set, idx) => {
                  const isSetCompleted = set.completed === true;
                  return (
                    <tr
                      key={idx}
                      className="border-t border-border last:border-0"
                    >
                      <td
                        className={cn("font-medium", isActive ? "p-1" : "p-2")}
                      >
                        #{idx + 1}
                      </td>
                      <td
                        className={cn("text-right", isActive ? "p-1" : "p-2")}
                      >
                        {set.reps || "—"}
                      </td>
                      {!safetyMode && (
                        <>
                          <td
                            className={cn(
                              "text-right text-muted-foreground",
                              isActive ? "p-1" : "p-2"
                            )}
                          >
                            {set.weight || "—"}
                          </td>
                          <td
                            className={cn(
                              "text-right text-muted-foreground",
                              isActive ? "p-1" : "p-2"
                            )}
                          >
                            {set.rest || "—"}
                          </td>
                          <td
                            className={cn(
                              "text-center",
                              isActive ? "p-1" : "p-2"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0",
                                isSetCompleted
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-border bg-background"
                              )}
                              aria-label={
                                isSetCompleted
                                  ? `Set ${idx + 1} completed`
                                  : `Set ${idx + 1} not completed`
                              }
                            >
                              {isSetCompleted && (
                                <span className="text-xs leading-none">✓</span>
                              )}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
