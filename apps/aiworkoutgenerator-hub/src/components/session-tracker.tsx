"use client";

import { useEffect, useRef } from "react";
import { beforeAuthStateChanged } from "firebase/auth";
import { useUser } from "@/lib/auth";
import { devLogError } from "@/lib/devLog";
import { getAuthInstance } from "@/lib/firebase";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";

/**
 * Component that tracks app-level session events
 * Logs app:open, app:session_start, and app:session_end
 *
 * Session end on logout/account switch uses `beforeAuthStateChanged` so
 * `logUserActivity` still sees the outgoing user (matches userId + token).
 */
export function SessionTracker() {
  const { user } = useUser();
  const { startSession, endSession } = useSession();
  const loggedUserIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = beforeAuthStateChanged(auth, async (nextUser) => {
      const outgoing = auth.currentUser;
      if (!outgoing) return;
      if (nextUser && nextUser.uid === outgoing.uid) return;

      if (
        loggedUserIdRef.current !== outgoing.uid ||
        !sessionIdRef.current
      ) {
        return;
      }

      try {
        await logUserActivity(
          outgoing.uid,
          "app:session_end",
          "app",
          null,
          {},
          sessionIdRef.current,
          outgoing
        );
      } catch (err) {
        devLogError(
          "SessionTracker.beforeAuthStateChanged.logUserActivity",
          err
        );
      }
      endSession();
      loggedUserIdRef.current = null;
      sessionIdRef.current = null;
    });

    return () => unsubscribe();
  }, [endSession]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (loggedUserIdRef.current !== user.uid) {
      const newSessionId = startSession();
      loggedUserIdRef.current = user.uid;
      sessionIdRef.current = newSessionId;

      logUserActivity(
        user.uid,
        "app:open",
        "app",
        null,
        {},
        newSessionId
      ).catch((err) => devLogError("SessionTracker.logUserActivity", err));

      logUserActivity(
        user.uid,
        "app:session_start",
        "app",
        null,
        {},
        newSessionId
      ).catch((err) => devLogError("SessionTracker.logUserActivity", err));
    }

    return () => {
      if (loggedUserIdRef.current && sessionIdRef.current) {
        logUserActivity(
          loggedUserIdRef.current,
          "app:session_end",
          "app",
          null,
          {},
          sessionIdRef.current
        ).catch((err) => devLogError("SessionTracker.logUserActivity", err));
        endSession();
        loggedUserIdRef.current = null;
        sessionIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run on user change. startSession/endSession are stable; including them would not change behavior.
  }, [user?.uid]);

  return null;
}
