"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if viewport is mobile (< 768px)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    // Use setTimeout to defer initial state update (avoids setState in effect warning)
    const timeoutId = setTimeout(() => {
      setMatches(mediaQuery.matches);
    }, 0);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => {
      clearTimeout(timeoutId);
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * Hook to detect if viewport is mobile (< 768px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
