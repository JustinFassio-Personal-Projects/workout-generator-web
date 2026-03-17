"use client";

import { ExerciseImage } from "./ExerciseImage";
import { cn } from "@/lib/utils";

interface ExerciseImageHeaderProps {
  src?: string;
  alt: string;
  exerciseName: string;
  className?: string;
  showPlaceholder?: boolean;
  isLoading?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
}

/**
 * Exercise image header component with 16:9 aspect ratio and name overlay.
 * Displays the exercise image as a header container with the exercise name
 * overlaid on a semi-transparent dark background.
 */
export function ExerciseImageHeader({
  src,
  alt,
  exerciseName,
  className,
  showPlaceholder = true,
  isLoading = false,
  isRetrying = false,
  onRetry,
}: ExerciseImageHeaderProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <ExerciseImage
        src={src}
        alt={alt}
        variant="header"
        showPlaceholder={showPlaceholder}
        isLoading={isLoading}
        isRetrying={isRetrying}
        onRetry={onRetry}
        className="rounded-t-lg"
      />
      {/* Name overlay with semi-transparent dark background */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-t-lg">
        <h2 className="text-2xl md:text-3xl font-black text-white text-center px-4 drop-shadow-lg">
          {exerciseName}
        </h2>
      </div>
    </div>
  );
}
