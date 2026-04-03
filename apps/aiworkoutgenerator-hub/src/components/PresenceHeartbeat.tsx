"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { devLogError } from "@/lib/devLog";
import { useSession } from "@/lib/session-tracker";

/** Client-side minimum interval between successful presence POSTs (aligns with server throttle). */
const CLIENT_PRESENCE_MIN_MS = 60_000;

function isPresenceHeartbeatEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HUB_PRESENCE_HEARTBEAT === "true";
}

/**
 * Throttled POST /api/analytics/presence while the user has a session open.
 * Enable with NEXT_PUBLIC_HUB_PRESENCE_HEARTBEAT=true after verifying in staging.
 */
export function PresenceHeartbeat() {
  const { user, loading } = useUser();
  const { sessionId } = useSession();
  const lastSuccessMsRef = useRef(0);

  const postPresence = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    if (now - lastSuccessMsRef.current < CLIENT_PRESENCE_MIN_MS) return;
    try {
      const res = await authenticatedFetch("/api/analytics/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
        user,
      });
      if (res.ok) {
        lastSuccessMsRef.current = Date.now();
      }
    } catch (e) {
      devLogError("PresenceHeartbeat.post", e);
    }
  }, [user, sessionId]);

  useEffect(() => {
    lastSuccessMsRef.current = 0;
  }, [user?.uid]);

  useEffect(() => {
    if (!isPresenceHeartbeatEnabled() || loading) return;
    if (!user) return;

    void postPresence();

    const onVis = () => {
      if (document.visibilityState === "visible") void postPresence();
    };
    const onFocus = () => {
      void postPresence();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      void postPresence();
    }, CLIENT_PRESENCE_MIN_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [user, loading, postPresence]);

  return null;
}
