"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";

import { useUser } from "@/lib/auth";
import type { UserDailyState } from "@/types/firestore";
import { DailyStateService } from "@/services/daily-state/DailyStateService";
import {
  toISODateString,
  type DailyStatePatchInput,
} from "@/lib/validation/dailyStateSchemas";

export function useUserDailyState(dateISO?: string) {
  const { user, loading: authLoading } = useUser();
  const resolvedDate = useMemo(() => dateISO ?? toISODateString(), [dateISO]);

  const [state, setState] = useState<{
    uid: string | null;
    dateISO: string;
    data: UserDailyState | null;
    loading: boolean;
    error: string | null;
  }>({
    uid: null,
    dateISO: resolvedDate,
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const ref = DailyStateService.dailyStateDoc(user.uid, resolvedDate);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setState({
          uid: user.uid,
          dateISO: resolvedDate,
          data: snap.exists() ? (snap.data() as UserDailyState) : null,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({
          uid: user.uid,
          dateISO: resolvedDate,
          data: null,
          loading: false,
          error: err?.message ?? "Failed to load daily state",
        });
      }
    );

    return () => unsub();
  }, [user, authLoading, resolvedDate]);

  const upsert = async (patch: DailyStatePatchInput) => {
    if (!user) throw new Error("Not authenticated");
    await DailyStateService.upsertUserDailyState(user.uid, resolvedDate, patch);
  };

  // Stable derived return values
  let data: UserDailyState | null = null;
  let loading: boolean;
  let error: string | null = null;

  if (authLoading) {
    loading = true;
  } else if (!user) {
    loading = false;
  } else {
    const isCurrentUserState = state.uid === user.uid;
    data = isCurrentUserState ? state.data : null;
    loading = isCurrentUserState ? state.loading : true;
    error = isCurrentUserState ? state.error : null;
  }

  return { dateISO: resolvedDate, data, loading, error, upsert };
}
