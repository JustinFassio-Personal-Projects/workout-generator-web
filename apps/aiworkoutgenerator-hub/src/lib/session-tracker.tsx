"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface SessionContextType {
  sessionId: string | null;
  startSession: () => string;
  endSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * Session Provider component that manages session ID state
 * Wrap your app with this provider to enable session tracking
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startSession = useCallback((): string => {
    const newSessionId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    setSessionId(newSessionId);
    return newSessionId;
  }, []);

  const endSession = useCallback(() => {
    setSessionId(null);
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId, startSession, endSession }}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session tracking functionality
 * Must be used within a SessionProvider
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
