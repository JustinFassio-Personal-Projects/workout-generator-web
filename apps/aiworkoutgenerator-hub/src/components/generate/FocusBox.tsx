"use client";

import React from "react";
import Image from "next/image";
import { Target, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Trainer, TrainerFocus } from "@/types/trainer";

interface FocusBoxProps {
  trainer: Trainer;
  selectedFocusId: string | null;
  onSelectFocus: (focusId: string | null) => void;
  onContinue: () => void;
}

export function FocusBox({
  trainer,
  selectedFocusId,
  onSelectFocus,
  onContinue,
}: FocusBoxProps) {
  const isBlendMode = selectedFocusId === null;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-6 transition-all",
        trainer.accentColor,
        trainer.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 overflow-hidden",
            trainer.accentColor,
            trainer.borderColor
          )}
        >
          {trainer.imageUrl ? (
            <Image
              src={trainer.imageUrl}
              alt={trainer.name}
              width={40}
              height={40}
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
        <div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="font-medium">{trainer.name} selected</span>
          </div>
          <p className="text-sm text-muted-foreground">
            What type of workout do you want {trainer.name.split(" ")[0]} to
            create?
          </p>
        </div>
      </div>

      {/* Focus Options */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="w-4 h-4" />
          <span>Select Your Focus</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {trainer.focuses.map((focus) => (
            <FocusOption
              key={focus.id}
              focus={focus}
              isSelected={selectedFocusId === focus.id}
              isPrimary={focus.isPrimary}
              accentColor={trainer.accentColor}
              borderColor={trainer.borderColor}
              onSelect={() => onSelectFocus(focus.id)}
            />
          ))}
        </div>
      </div>

      {/* Blend Mode Option */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => onSelectFocus(null)}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm",
            isBlendMode
              ? cn(trainer.accentColor, trainer.borderColor, "font-medium")
              : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>
            Skip — Let {trainer.name.split(" ")[0]} blend their expertise
          </span>
          {isBlendMode && <Check className="w-4 h-4 ml-auto" />}
        </button>
        {isBlendMode && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {trainer.name.split(" ")[0]} will create a balanced workout drawing
            from {trainer.focuses.map((f) => f.name).join(", ")}
          </p>
        )}
      </div>

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full" size="lg">
        Continue to Equipment Selection
      </Button>
    </div>
  );
}

interface FocusOptionProps {
  focus: TrainerFocus;
  isSelected: boolean;
  isPrimary: boolean;
  accentColor: string;
  borderColor: string;
  onSelect: () => void;
}

function FocusOption({
  focus,
  isSelected,
  isPrimary,
  accentColor,
  borderColor,
  onSelect,
}: FocusOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
        isSelected
          ? cn(accentColor, borderColor, "font-medium")
          : "border-border hover:border-muted-foreground/50 bg-background/50"
      )}
    >
      <span className="text-lg">{focus.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate">{focus.name}</span>
          {isPrimary && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
              Primary
            </span>
          )}
        </div>
      </div>
      {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
}
