"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/auth";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";

/**
 * Component that tracks app-level session events
 * Logs app:open, app:session_start, and app:session_end
 */
export function SessionTracker() {
  const { user } = useUser();
  const { startSession, endSession } = useSession();
  const loggedUserIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      // If user logs out, end the session if one was active
      if (loggedUserIdRef.current && sessionIdRef.current) {
        logUserActivity(
          loggedUserIdRef.current,
          "app:session_end",
          "app",
          null,
          {},
          sessionIdRef.current
        ).catch(console.error);
        endSession();
        loggedUserIdRef.current = null;
        sessionIdRef.current = null;
      }
      return;
    }

    // Only start a new session if this is a different user or first time
    if (loggedUserIdRef.current !== user.uid) {
      // End previous session if switching users
      if (loggedUserIdRef.current && sessionIdRef.current) {
        logUserActivity(
          loggedUserIdRef.current,
          "app:session_end",
          "app",
          null,
          {},
          sessionIdRef.current
        ).catch(console.error);
        endSession();
      }

      // Start new session and log app open
      const newSessionId = startSession();
      loggedUserIdRef.current = user.uid;
      sessionIdRef.current = newSessionId;

      // Log app open (daily active user tracking)
      logUserActivity(
        user.uid,
        "app:open",
        "app",
        null,
        {},
        newSessionId
      ).catch(console.error);

      // Log session start
      logUserActivity(
        user.uid,
        "app:session_start",
        "app",
        null,
        {},
        newSessionId
      ).catch(console.error);
    }

    // Cleanup on unmount
    return () => {
      if (loggedUserIdRef.current && sessionIdRef.current) {
        logUserActivity(
          loggedUserIdRef.current,
          "app:session_end",
          "app",
          null,
          {},
          sessionIdRef.current
        ).catch(console.error);
        endSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run on user change. startSession/endSession are stable; including them would not change behavior.
  }, [user?.uid]);

  return null;
}
