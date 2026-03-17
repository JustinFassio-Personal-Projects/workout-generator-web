"use client";

import { ReactNode } from "react";

interface ViewMorphProps {
  id: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for View Transitions API.
 * Assigns unique view-transition-name to enable morphing animations
 * when elements move between different views (list -> active).
 */
export function ViewMorph({ id, children, className = "" }: ViewMorphProps) {
  // Assign a unique view-transition-name to enable browser morphing
  const style = {
    viewTransitionName: `exercise-card-${id}`,
  } as React.CSSProperties;

  return (
    <div style={style} className={`transition-all duration-500 ${className}`}>
      {children}
    </div>
  );
}
