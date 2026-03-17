"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InjuryVisualizerProps {
  injuries: string[];
  activeMuscles?: string[];
  avoidedMuscles?: string[];
  className?: string;
}

/**
 * Anatomical mini-map showing injury awareness.
 * Highlights user injuries in Amber, active muscles in Green,
 * and avoided muscles in Grey.
 */
export function InjuryVisualizer({
  injuries,
  activeMuscles = [],
  avoidedMuscles = [],
  className = "",
}: InjuryVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (injuries.length === 0 && activeMuscles.length === 0) {
    return null;
  }

  // Simplified SVG representation of human body
  // In a production app, this would be a more detailed anatomical diagram
  const bodyParts = [
    { id: "shoulder", label: "Shoulder", x: 50, y: 20 },
    { id: "chest", label: "Chest", x: 50, y: 30 },
    { id: "back", label: "Back", x: 50, y: 35 },
    { id: "arm", label: "Arm", x: 50, y: 45 },
    { id: "core", label: "Core", x: 50, y: 50 },
    { id: "hip", label: "Hip", x: 50, y: 60 },
    { id: "knee", label: "Knee", x: 50, y: 70 },
    { id: "ankle", label: "Ankle", x: 50, y: 85 },
  ];

  const getPartColor = (partId: string) => {
    const normalizedId = partId.toLowerCase();
    const normalizedInjuries = injuries.map((i) => i.toLowerCase());

    if (
      normalizedInjuries.some(
        (inj) => normalizedId.includes(inj) || inj.includes(normalizedId)
      )
    ) {
      return "#f59e0b"; // Amber for injuries
    }
    if (activeMuscles.some((m) => m.toLowerCase().includes(normalizedId))) {
      return "#10b981"; // Green for active muscles
    }
    if (avoidedMuscles.some((m) => m.toLowerCase().includes(normalizedId))) {
      return "#6b7280"; // Grey for avoided muscles
    }
    return "#e5e7eb"; // Default grey
  };

  return (
    <div
      className={cn(
        "border border-border rounded-xl overflow-hidden bg-card",
        className
      )}
    >
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="font-semibold">Injury Awareness Map</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="p-4 border-t border-border">
          <div className="mb-4">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-48 mx-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Simplified body outline */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="#f3f4f6"
                stroke="#d1d5db"
                strokeWidth="1"
              />

              {/* Body parts */}
              {bodyParts.map((part) => (
                <circle
                  key={part.id}
                  cx={part.x}
                  cy={part.y}
                  r="4"
                  fill={getPartColor(part.id)}
                  stroke="#fff"
                  strokeWidth="0.5"
                />
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="space-y-2 text-sm">
            {injuries.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">
                  Your injuries ({injuries.join(", ")})
                </span>
              </div>
            )}
            {activeMuscles.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  Active muscles ({activeMuscles.join(", ")})
                </span>
              </div>
            )}
            {avoidedMuscles.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500" />
                <span className="text-muted-foreground">
                  Avoided muscles ({avoidedMuscles.join(", ")})
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
