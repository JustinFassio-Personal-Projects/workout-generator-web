"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthInstance } from "@/lib/firebase";
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getErrorCode, getErrorMessage } from "@/lib/auth-helpers";
import { ProfileService } from "@/services/profile/ProfileService";
import { hasPhaseAData } from "@/lib/phaseAStorage";
import { trackAccountSignupComplete } from "@/lib/websiteAnalyticsSession";

/**
 * Google Sign-In button component with redirect flow
 */
export function GoogleSignInButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingEmulator, setIsUsingEmulator] = useState(false);

  // Check if we're using the emulator (client-side only to avoid hydration mismatch)
  useEffect(() => {
    setIsUsingEmulator(!!process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST);
  }, []);

  // Handle Google sign-in redirect result
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const auth = getAuthInstance();
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully signed in via redirect
          // Attribute new OAuth signups to website builder session (Option A)
          if (result.additionalUserInfo?.isNewUser) {
            trackAccountSignupComplete({ method: "oauth" });
          }
          // Check if user has completed onboarding
          const profile = await ProfileService.getUserProfile(result.user.uid);
          const hasCompletedOnboarding =
            ProfileService.hasCompletedOnboarding(profile);

          // Determine redirect path:
          // 1. If completed onboarding -> dashboard
          // 2. If has Phase A data in localStorage -> Phase B wizard
          // 3. Otherwise -> standard onboarding
          //
          // Note: Phase A data is intentionally session-specific (localStorage) and
          // not persisted to Firestore. Cross-device login falls back to standard
          // onboarding, which collects the same information.
          let redirectPath = "/";
          if (!hasCompletedOnboarding) {
            redirectPath = hasPhaseAData()
              ? "/onboarding/continue"
              : "/onboarding";
          }

          router.push(redirectPath);
        }
      } catch (err: unknown) {
        console.error("Redirect result error:", err);
        const errorCode = getErrorCode(err);
        setError(getErrorMessage(errorCode));
      }
    };

    handleRedirectResult();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const auth = getAuthInstance();
      const provider = new GoogleAuthProvider();
      // Use redirect instead of popup for better emulator compatibility
      await signInWithRedirect(auth, provider);
      // Note: The redirect will navigate away, so we don't need to handle the result here
      // The result will be handled when the user returns to the app
    } catch (err: unknown) {
      console.error("Google sign in error:", err);
      const errorCode = getErrorCode(err);
      setError(getErrorMessage(errorCode));
    } finally {
      // Always reset loading state, even if redirect fails before navigation
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Emulator Warning */}
      {isUsingEmulator && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          <p className="font-medium">Note: Google Sign-In</p>
          <p className="mt-1">
            Google Sign-In may have limitations in the emulator environment. For
            testing, please use email/password authentication or create test
            users in the{" "}
            <a
              href="http://localhost:4000/auth"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Firebase Emulator UI
            </a>
            .
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      {/* Google Sign-In Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        title={
          isUsingEmulator
            ? "Google Sign-In may not work in the emulator. Use email/password for testing."
            : "Sign in with Google"
        }
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Sign in with Google
      </Button>
    </>
  );
}
