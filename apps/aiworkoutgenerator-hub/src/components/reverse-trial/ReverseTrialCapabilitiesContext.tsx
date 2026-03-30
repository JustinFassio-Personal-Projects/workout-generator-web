"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useUser } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import type { UserCapabilitiesResponse } from "@/lib/reverse-trial/user-capabilities-types";

type ReverseTrialCapabilitiesContextValue = {
  capabilities: UserCapabilitiesResponse | null;
  /** True while auth or capabilities request is in flight. */
  loading: boolean;
  refetch: () => Promise<void>;
};

const ReverseTrialCapabilitiesContext =
  createContext<ReverseTrialCapabilitiesContextValue | null>(null);

export function ReverseTrialCapabilitiesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useUser();
  const [capabilities, setCapabilities] =
    useState<UserCapabilitiesResponse | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;

  const fetchCapabilities = useCallback(async (signal?: AbortSignal) => {
    const u = userRef.current;
    if (!u) {
      setCapabilities(null);
      return;
    }
    setFetchLoading(true);
    try {
      const res = await authenticatedFetch("/api/users/capabilities", {
        user: u,
        signal,
      });
      if (signal?.aborted) return;
      if (!res.ok) {
        setCapabilities(null);
        return;
      }
      const data = (await res.json()) as UserCapabilitiesResponse;
      if (!signal?.aborted) setCapabilities(data);
    } catch {
      if (!signal?.aborted) setCapabilities(null);
    } finally {
      if (!signal?.aborted) setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCapabilities(null);
      setFetchLoading(false);
      return;
    }
    const ac = new AbortController();
    void fetchCapabilities(ac.signal);
    return () => ac.abort();
  }, [user, authLoading, fetchCapabilities]);

  const refetch = useCallback(async () => {
    await fetchCapabilities();
  }, [fetchCapabilities]);

  const loading = authLoading || (Boolean(user) && fetchLoading);

  return (
    <ReverseTrialCapabilitiesContext.Provider
      value={{ capabilities, loading, refetch }}
    >
      {children}
    </ReverseTrialCapabilitiesContext.Provider>
  );
}

export function useReverseTrialCapabilities(): ReverseTrialCapabilitiesContextValue {
  const ctx = useContext(ReverseTrialCapabilitiesContext);
  if (!ctx) {
    throw new Error(
      "useReverseTrialCapabilities must be used within ReverseTrialCapabilitiesProvider"
    );
  }
  return ctx;
}
