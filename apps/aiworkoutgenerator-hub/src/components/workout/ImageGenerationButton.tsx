"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrainerWorkout } from "@/types/firestore";

interface ImageGenerationButtonProps {
  workout: TrainerWorkout;
  onRequestImages?: () => void;
  disabled?: boolean;
}

/**
 * Button component for requesting image certification.
 *
 * This button opens the certification workflow modal where users can
 * submit their workout for coach review and image certification.
 *
 * Note: Image generation functionality has been decoupled from this button.
 * Future image generation will be available through an exercise image gallery
 * where users can generate additional, uncertified images for specific exercises.
 *
 * @see docs/design/IMAGE_GENERATION_DESIGN_DECISION.md
 */
export function ImageGenerationButton({
  workout,
  onRequestImages,
  disabled = false,
}: ImageGenerationButtonProps) {
  // Check if images already exist (certified)
  const hasImages = workout.has_images;

  // Already has certified images
  if (hasImages) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        Images Certified
      </Button>
    );
  }

  // Default: show request button
  return (
    <Button
      variant="default"
      onClick={onRequestImages}
      disabled={disabled || !onRequestImages}
      className="gap-2"
    >
      Request Images
    </Button>
  );
}
