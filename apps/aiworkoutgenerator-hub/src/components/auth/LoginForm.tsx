"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthInstance } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { getErrorCode, getErrorMessage } from "@/lib/auth-helpers";
import { ProfileService } from "@/services/profile/ProfileService";
import { hasPhaseAData } from "@/lib/phaseAStorage";

/**
 * Login form component for email/password authentication
 */
export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const auth = getAuthInstance();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Check if user has completed onboarding
      const profile = await ProfileService.getUserProfile(
        userCredential.user.uid
      );
      const hasCompletedOnboarding =
        ProfileService.hasCompletedOnboarding(profile);

      // Determine redirect path:
      // 1. If completed onboarding -> dashboard
      // 2. If has Phase A data in localStorage -> Phase B wizard
      // 3. Otherwise -> standard onboarding
      //
      // Note: Phase A data is intentionally session-specific (localStorage) and not
      // persisted to Firestore. If a user abandons Phase B and later logs in from
      // a different device/browser, they'll be directed to standard onboarding.
      // This is correct because:
      // - Phase A data isn't available to show in Phase B wizard
      // - Standard onboarding collects the same information
      // - Profile data from any previous partial completion will be preserved
      let redirectPath = "/";
      if (!hasCompletedOnboarding) {
        redirectPath = hasPhaseAData() ? "/onboarding/continue" : "/onboarding";
      }

      router.push(redirectPath);
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      const errorCode = getErrorCode(err);
      setError(getErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          name="password"
          type="password"
          required
          disabled={isLoading}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
}
