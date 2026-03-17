"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getIdToken } from "@/lib/auth";
import type { MasterExerciseImage } from "@/types/firestore";

interface ExerciseImageSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  currentImageUrl?: string | null;
  onImageSelected?: (imageUrl: string) => void;
}

export function ExerciseImageSelectorModal({
  open,
  onOpenChange,
  exerciseName,
  currentImageUrl,
  onImageSelected,
}: ExerciseImageSelectorModalProps) {
  const [images, setImages] = useState<MasterExerciseImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userPreference, setUserPreference] = useState<string | null>(null);

  // Load images when modal opens
  useEffect(() => {
    if (!open || !exerciseName.trim()) {
      return;
    }

    let cancelled = false;

    async function loadImages() {
      setLoading(true);
      try {
        const idToken = await getIdToken();
        if (!idToken) {
          toast.error("You must be signed in to select images");
          return;
        }

        const response = await fetch(
          `/api/images/search?searchPhrase=${encodeURIComponent(exerciseName)}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`Failed to search images: ${response.status}`);
        }

        const data = await response.json();
        setImages(data.images || []);

        // Load user preference
        const prefResponse = await fetch(
          `/api/images/preferences?exerciseName=${encodeURIComponent(exerciseName)}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!cancelled && prefResponse.ok) {
          const prefData = await prefResponse.json();
          if (prefData.preference) {
            setUserPreference(prefData.preference.selectedImageId);
            setSelectedImageId(prefData.preference.selectedImageId);
          } else if (currentImageUrl) {
            // If no preference but there's a current image, try to find it in the list
            const currentImage = data.images?.find(
              (img: MasterExerciseImage) => img.image_url === currentImageUrl
            );
            if (currentImage) {
              setSelectedImageId(currentImage.id);
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load images:", error);
          toast.error("Failed to load images");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [open, exerciseName, currentImageUrl]);

  const handleSelectImage = async (image: MasterExerciseImage) => {
    setSelectedImageId(image.id);
  };

  const handleSave = async () => {
    if (!selectedImageId) {
      toast.error("Please select an image");
      return;
    }

    const selectedImage = images.find((img) => img.id === selectedImageId);
    if (!selectedImage) {
      toast.error("Selected image not found");
      return;
    }

    setSaving(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        toast.error("You must be signed in to save preferences");
        return;
      }

      const response = await fetch("/api/images/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          exerciseName,
          imageUrl: selectedImage.image_url,
          imageId: selectedImage.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save preference: ${response.status}`);
      }

      setUserPreference(selectedImage.id);
      toast.success("Image preference saved");

      // Dispatch custom event to trigger refresh in other components
      // Use a small delay to ensure the preference is saved to Firestore first
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("exercise-image-preference-updated"));
        }
      }, 100);

      onImageSelected?.(selectedImage.image_url);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save preference:", error);
      toast.error("Failed to save image preference");
    } finally {
      setSaving(false);
    }
  };

  const handleUseDefault = async () => {
    setSaving(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        toast.error("You must be signed in");
        return;
      }

      const response = await fetch(
        `/api/images/preferences?exerciseName=${encodeURIComponent(exerciseName)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to clear preference: ${response.status}`);
      }

      setUserPreference(null);
      setSelectedImageId(null);
      toast.success("Reset to default image");

      // Dispatch custom event to trigger refresh in other components
      // Use a small delay to ensure the preference is deleted from Firestore first
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("exercise-image-preference-updated"));
        }
      }, 100);

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to clear preference:", error);
      toast.error("Failed to reset preference");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Image for {exerciseName}</DialogTitle>
          <DialogDescription>
            Select an image from all available images containing &quot;
            {exerciseName}&quot; in the title. Your selection will apply to all
            workouts with this exercise.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No images found containing &quot;{exerciseName}&quot;</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
              {images.map((image) => {
                const isSelected = selectedImageId === image.id;
                const isUserPreference = userPreference === image.id;

                return (
                  <div
                    key={image.id}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-primary shadow-lg scale-105"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleSelectImage(image)}
                  >
                    <div className="relative aspect-square bg-muted">
                      <Image
                        src={image.image_url}
                        alt={image.exercise_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-2">
                            <Check className="h-5 w-5" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-background">
                      <p className="text-xs font-medium truncate">
                        {image.exercise_name}
                      </p>
                      {image.position && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Position {image.position}
                        </Badge>
                      )}
                      {isUserPreference && (
                        <Badge variant="outline" className="mt-1 text-xs ml-1">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleUseDefault}
                disabled={saving || !userPreference}
              >
                Use Default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !selectedImageId}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Select Image"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
