"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";

import { useUser } from "@/lib/auth";
import type { UserProfile } from "@/types/firestore";
import { ProfileService } from "@/services/profile/ProfileService";

export function useUserProfile() {
  const { user, loading: authLoading } = useUser();
  const [state, setState] = useState<{
    uid: string | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
  }>({ uid: null, profile: null, loading: true, error: null });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const ref = ProfileService.profileDoc(user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // TODO: Add runtime validation (e.g., Zod schema) to ensure document data
        // conforms to UserProfile interface. Type assertion bypasses TypeScript's
        // type safety and could lead to runtime errors if Firestore document has
        // missing or incorrect fields.
        if (!snap.exists()) {
          setState({
            uid: user.uid,
            profile: null,
            loading: false,
            error: null,
          });
          return;
        }
        const raw = snap.data() as UserProfile;
        const profile: UserProfile = {
          ...raw,
          equipment_access: ProfileService.normalizeEquipmentAccess(
            raw.equipment_access,
            raw.fitness_level
          ),
        };
        setState({
          uid: user.uid,
          profile,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({
          uid: user.uid,
          profile: null,
          loading: false,
          error: err?.message ?? "Failed to load profile",
        });
      }
    );

    return () => unsub();
  }, [user, authLoading]);

  const updateProfile = async (patch: Partial<UserProfile>) => {
    if (!user) throw new Error("Not authenticated");
    await ProfileService.updateUserProfile(user.uid, patch);
  };

  // Calculate profile, loading, and error states with clear conditional logic
  let profile: UserProfile | null = null;
  let loading: boolean;
  let error: string | null = null;

  if (authLoading) {
    // Still loading authentication state
    loading = true;
  } else if (!user) {
    // No user authenticated
    loading = false;
  } else {
    // User is authenticated - check if state matches current user
    const isCurrentUserState = state.uid === user.uid;
    profile = isCurrentUserState ? state.profile : null;
    loading = isCurrentUserState ? state.loading : true;
    error = isCurrentUserState ? state.error : null;
  }

  return { profile, loading, error, updateProfile };
}

export function useOnboardingStatus() {
  const { profile, loading, error } = useUserProfile();
  const completed = useMemo(
    () => ProfileService.hasCompletedOnboarding(profile),
    [profile]
  );
  return { completed, profile, loading, error };
}
