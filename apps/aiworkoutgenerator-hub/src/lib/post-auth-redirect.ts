import type { User } from "firebase/auth";
import { ProfileService } from "@/services/profile/ProfileService";
import { hasPhaseAData } from "@/lib/phaseAStorage";

/**
 * Where to send the user after Firebase sign-in succeeds.
 * Loads onboarding state from Firestore; if that fails, still redirects so login
 * is not blocked by a profile read error (auth already succeeded).
 */
export async function getPostSignInRedirectPath(user: User): Promise<string> {
  try {
    await user.getIdToken(true);
    await new Promise((r) => setTimeout(r, 150));
    const profile = await ProfileService.getUserProfile(user.uid);
    const hasCompletedOnboarding =
      ProfileService.hasCompletedOnboarding(profile);
    if (!hasCompletedOnboarding) {
      return hasPhaseAData() ? "/onboarding/continue" : "/onboarding";
    }
    return "/";
  } catch (e) {
    console.warn(
      "[auth] Profile load after sign-in failed; redirecting to home",
      e instanceof Error ? e.message : String(e)
    );
    return "/";
  }
}
