"use client";

import { useCallback } from "react";
import { useUser } from "@/lib/auth";
import { getIdToken } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Hook for board actions (dismiss, log events)
 */
export function useBoardActions() {
  const { user } = useUser();

  const updateState = useCallback(
    async (postId: string, action: "dismiss" | "impression" | "click") => {
      if (!user) {
        logger.warn("Cannot update board state: user not authenticated");
        return;
      }

      try {
        const idToken = await getIdToken();
        if (!idToken) {
          throw new Error("Failed to get ID token");
        }

        const response = await fetch("/api/board/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            post_id: postId,
            action,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update state");
        }

        return await response.json();
      } catch (error) {
        logger.error("Error updating board state", error, { postId, action });
        throw error;
      }
    },
    [user]
  );

  const logEvent = useCallback(
    async (
      postId: string,
      eventType: "impression" | "click" | "dismiss",
      surface: "banner" | "section" | "feed" | "detail"
    ) => {
      try {
        const idToken = await getIdToken();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (idToken) {
          headers.Authorization = `Bearer ${idToken}`;
        }

        const response = await fetch("/api/board/event", {
          method: "POST",
          headers,
          body: JSON.stringify({
            post_id: postId,
            event_type: eventType,
            surface,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to log event");
        }

        return await response.json();
      } catch (error) {
        logger.error("Error logging board event", error, {
          postId,
          eventType,
          surface,
        });
        // Don't throw - event logging failures shouldn't break the UI
      }
    },
    []
  );

  return {
    updateState,
    logEvent,
  };
}
