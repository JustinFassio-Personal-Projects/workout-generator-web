"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

interface ExerciseImageProps {
  src?: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "thumbnail" | "header";
  showPlaceholder?: boolean;
  isLoading?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

/**
 * Check if a URL is a placeholder/mock image.
 * Checks for both current (placehold.co) and legacy (via.placeholder.com) placeholder services.
 */
function isPlaceholderUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes("placehold.co") || url.includes("via.placeholder.com");
}

/**
 * Exercise demonstration image component with loading and placeholder states.
 */
export function ExerciseImage({
  src: initialSrc,
  alt,
  className,
  size = "md",
  variant = "thumbnail",
  showPlaceholder = true,
  isLoading = false,
  isRetrying = false,
  onRetry,
}: ExerciseImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const prevSrcRef = useRef<string | undefined>(initialSrc);

  // Fix legacy placeholder URLs from via.placeholder.com which is unreliable
  const src = initialSrc?.includes("via.placeholder.com")
    ? (() => {
        const fixedSrc = initialSrc.replace(
          "via.placeholder.com",
          "placehold.co"
        );
        // If the URL has a ?text= parameter and doesn't already have .png
        // immediately before it, insert .png before the first ?text=.
        if (fixedSrc.includes("?text=") && !fixedSrc.includes(".png?text=")) {
          return fixedSrc.replace("?text=", ".png?text=");
        }
        return fixedSrc;
      })()
    : initialSrc;

  // Reset image state when src changes (e.g., after retry)
  // This is necessary for retry functionality - when src changes, we need to reset
  // the error/loaded state so the new image can be attempted
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      setImageError(false);
      setImageLoaded(false);
      prevSrcRef.current = src;
    }
  }, [src]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const showImage = src && !imageError;
  const isMockImage = isPlaceholderUrl(src);
  const canRetry = onRetry && (imageError || isMockImage || !src);

  // Container classes based on variant
  const containerClasses =
    variant === "header"
      ? "relative overflow-hidden bg-muted w-full aspect-video"
      : cn(
          "relative overflow-hidden rounded-lg bg-muted group",
          sizeClasses[size]
        );

  // Show loading/retrying state
  if (isLoading || isRetrying) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg",
          variant === "header" ? "w-full aspect-video" : sizeClasses[size],
          className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No image - show placeholder with optional retry
  if (!showImage) {
    if (!showPlaceholder) return null;

    return (
      <div
        className={cn(
          "relative flex items-center justify-center bg-muted rounded-lg group",
          variant === "header" ? "w-full aspect-video" : sizeClasses[size],
          className
        )}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        {canRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-opacity rounded-lg"
            aria-label="Retry image generation"
            title="Retry image generation"
          >
            <RefreshCw className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        containerClasses,
        variant === "thumbnail" ? "group" : "",
        className
      )}
    >
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(
          "object-cover transition-opacity duration-200",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      {/* Show retry button overlay for placeholder images */}
      {isMockImage && onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-opacity rounded-lg"
          aria-label="Retry image generation"
          title="Retry image generation"
        >
          <RefreshCw className="h-5 w-5 text-white" />
        </button>
      )}
    </div>
  );
}
