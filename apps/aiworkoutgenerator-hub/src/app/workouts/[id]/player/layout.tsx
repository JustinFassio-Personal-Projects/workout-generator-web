"use client";

import { useEffect } from "react";

/**
 * Layout wrapper for the workout player route.
 * Sets up View Transitions API support for smooth morphing animations.
 */
export default function WorkoutPlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Enable View Transitions API if supported
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      // View Transitions API is available
      // The browser will automatically handle transitions when elements
      // have matching view-transition-name CSS properties
    }
  }, []);

  return <>{children}</>;
}
