"use client";

import React from "react";
import Image from "next/image";
import { Check, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types/trainer";

interface TrainerCardProps {
  trainer: Trainer;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (trainerId: string) => void;
}

export function TrainerCard({
  trainer,
  isSelected,
  isRecommended,
  onSelect,
}: TrainerCardProps) {
  const primaryFocus = trainer.focuses.find((f) => f.isPrimary);
  const secondaryFocuses = trainer.focuses
    .filter((f) => !f.isPrimary)
    .slice(0, 2);

  const hasBanner = !!trainer.banner_image_url;

  return (
    <button
      type="button"
      onClick={() => onSelect(trainer.id)}
      className={cn(
        "relative flex flex-col rounded-xl border-2 transition-all duration-200 text-left group overflow-hidden",
        "hover:shadow-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isSelected
          ? cn(
              trainer.accentColor,
              trainer.borderColor,
              "shadow-lg ring-2 ring-offset-2",
              trainer.borderColor.replace("border-", "ring-")
            )
          : "bg-card border-border hover:border-muted-foreground/50"
      )}
    >
      {/* Recommended Badge */}
      {isRecommended && !isSelected && (
        <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1 bg-amber-500 text-amber-950 text-xs font-semibold px-2 py-1 rounded-full shadow-md">
          <Sparkles className="w-3 h-3" />
          <span>For You</span>
        </div>
      )}

      {/* Selected Checkmark */}
      {isSelected && (
        <div
          className={cn(
            "absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center shadow-md",
            trainer.borderColor.replace("border-", "bg-"),
            "text-white"
          )}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </div>
      )}

      {/* Banner area */}
      {hasBanner && (
        <div
          className={cn(
            // Use CSS breakpoints (not JS) to avoid hydration mismatches.
            // Using next/image instead of inline backgroundImage for safer URL handling + consistency.
            "relative w-full h-56 sm:h-36 overflow-hidden",
            isSelected ? trainer.accentColor : "bg-card"
          )}
          aria-hidden="true"
        >
          <Image
            src={trainer.banner_image_url!}
            alt=""
            fill
            className="object-cover object-top sm:object-contain sm:object-right"
            unoptimized
          />
        </div>
      )}

      {/* Content area */}
      <div
        className={cn("relative flex flex-col", hasBanner ? "p-4 pt-0" : "p-5")}
      >
        {/* Profile portrait overlay row */}
        {hasBanner && (
          <div className="-mt-10 flex items-end gap-3 mb-3">
            <div
              className={cn(
                "h-20 w-16 overflow-hidden rounded-md border bg-muted",
                trainer.borderColor
              )}
            >
              {trainer.imageUrl ? (
                <Image
                  src={trainer.imageUrl}
                  alt={`${trainer.name} profile portrait`}
                  width={64}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                  {trainer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
              )}
            </div>
            <div className="flex-1" />
          </div>
        )}

        {/* Trainer Avatar/Image (only shown when no banner) */}
        {!hasBanner && (
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-3 text-2xl font-bold overflow-hidden",
              trainer.accentColor,
              trainer.borderColor,
              "border-2"
            )}
          >
            {trainer.imageUrl ? (
              <Image
                src={trainer.imageUrl}
                alt={trainer.name}
                width={64}
                height={64}
                className="w-full h-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-foreground/80">
                {trainer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            )}
          </div>
        )}

        {/* Name & Nickname */}
        <div className="mb-2">
          <h3 className="font-bold text-base text-foreground">
            {trainer.name}
          </h3>
          <p
            className={cn(
              "text-sm font-medium",
              isSelected
                ? trainer.borderColor.replace("border-", "text-")
                : "text-muted-foreground"
            )}
          >
            &ldquo;{trainer.nickname}&rdquo;
          </p>
        </div>

        {/* Tagline */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
          {trainer.tagline}
        </p>

        {/* Expertise Icons */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {primaryFocus && (
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full font-medium",
                trainer.accentColor,
                trainer.borderColor,
                "border"
              )}
            >
              {primaryFocus.icon} {primaryFocus.name}
            </span>
          )}
          {secondaryFocuses.map((focus) => (
            <span
              key={focus.id}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
            >
              {focus.icon}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{trainer.stats.avgRating.toFixed(1)}</span>
          </div>
          <div>{trainer.stats.workoutsGenerated.toLocaleString()} workouts</div>
        </div>
      </div>
    </button>
  );
}
