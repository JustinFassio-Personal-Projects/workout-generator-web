"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ImageIcon, CheckCircle2 } from "lucide-react";
import { ImageGenerationService } from "@/services/image/ImageGenerationService";
import { getIdToken } from "@/lib/auth";
import type { TrainerWorkoutExercise } from "@/types/firestore";

interface ImageRegenerationPromptProps {
  exercise: TrainerWorkoutExercise;
  workoutId: string;
  onRegenerateComplete?: (newImageUrl: string) => void;
  onSkip?: () => void;
}

/**
 * Component to prompt user to regenerate exercise image after AI edit.
 * Detects if image should be regenerated based on modified fields.
 */
export function ImageRegenerationPrompt({
  exercise,
  workoutId,
  onRegenerateComplete,
  onSkip,
}: ImageRegenerationPromptProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegenerate = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const result = await ImageGenerationService.generateExerciseImage(
        exercise,
        workoutId,
        token
      );

      if (result) {
        setSuccess(true);
        toast.success("Exercise image regenerated successfully!");
        if (onRegenerateComplete) {
          onRegenerateComplete(result.url);
        }
      } else {
        throw new Error("Failed to generate image");
      }
    } catch (err: unknown) {
      console.error("Error regenerating image:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to regenerate image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [exercise, workoutId, onRegenerateComplete]);

  if (success) {
    return (
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
        <CardHeader>
          <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Image Regenerated
          </CardTitle>
          <CardDescription className="text-xs text-green-600 dark:text-green-500">
            The exercise demonstration image has been updated.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Regenerate Exercise Image?
        </CardTitle>
        <CardDescription className="text-sm">
          This exercise was modified. Would you like to regenerate the
          demonstration image to match the updated exercise details?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            onClick={handleRegenerate}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              "Yes, Regenerate Image"
            )}
          </Button>
          {onSkip && (
            <Button variant="outline" onClick={onSkip} disabled={loading}>
              Skip
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper function to determine if image regeneration should be offered.
 * Checks if image_url or exercise details that affect image generation were modified.
 */
export function shouldOfferImageRegeneration(
  fieldsModified: string[]
): boolean {
  const imageRelevantFields = [
    "image_url",
    "name",
    "muscleTarget",
    "equipment_needed",
    "muscle_groups",
  ];

  return fieldsModified.some((field) => imageRelevantFields.includes(field));
}
