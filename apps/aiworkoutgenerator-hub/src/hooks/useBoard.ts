"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserProfile } from "@/hooks/useUserProfile";
import { BoardService, type BoardBundle } from "@/services/board";
import { logger } from "@/lib/logger";
import type { BoardPost } from "@/types/board";

interface UseBoardReturn {
  bundle: BoardBundle | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching board posts for the current user with real-time updates
 */
export function useBoard(): UseBoardReturn {
  const { user, loading: authLoading } = useUser();
  const { tier, status, loading: subLoading } = useSubscription();
  const { profile, loading: profileLoading } = useUserProfile();

  const [bundle, setBundle] = useState<BoardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Refresh function for manual refresh (still uses one-time fetch)
  const fetchBundle = async () => {
    // Wait for all dependencies to finish loading before fetching
    if (authLoading || subLoading || profileLoading) {
      // Keep loading state true while dependencies are loading
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context = {
        userId: user?.uid || null,
        subscription: user
          ? {
              tier: tier || "free",
              status: status,
            }
          : null,
        profile: profile || null,
      };

      const result = await BoardService.getBoardBundleForUser(context);
      if (isMountedRef.current) {
        setBundle(result);
      }
    } catch (err) {
      logger.error("Error fetching board bundle", err, {
        userId: user?.uid || null,
        hasSubscription: !!user,
      });
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch board posts"
        );
        setBundle(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Wait for all dependencies to finish loading before setting up listener
    if (authLoading || subLoading || profileLoading) {
      setLoading(true);
      return;
    }

    // Clean up previous listener if it exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for candidate posts
    const unsubscribe = BoardService.subscribeToCandidatePosts(
      async (candidatePosts: BoardPost[]) => {
        if (!isMountedRef.current) return;

        try {
          const context = {
            userId: user?.uid || null,
            subscription: user
              ? {
                  tier: tier || "free",
                  status: status,
                }
              : null,
            profile: profile || null,
          };

          // Process candidate posts into bundle (applies targeting and frequency filters)
          const result = await BoardService.processBoardBundle(
            candidatePosts,
            context
          );

          if (isMountedRef.current) {
            setBundle(result);
            setLoading(false);
            setError(null);
          }
        } catch (err) {
          logger.error(
            "Error processing board bundle from real-time update",
            err,
            {
              userId: user?.uid || null,
              hasSubscription: !!user,
            }
          );
          if (isMountedRef.current) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to process board posts"
            );
            setLoading(false);
          }
        }
      },
      (err) => {
        if (isMountedRef.current) {
          logger.error("Error in board posts real-time listener", err, {
            userId: user?.uid || null,
          });
          setError(err.message || "Failed to load board posts");
          setLoading(false);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, tier, status, profile, authLoading, subLoading, profileLoading]);

  return {
    bundle,
    loading,
    error,
    refresh: fetchBundle,
  };
}
