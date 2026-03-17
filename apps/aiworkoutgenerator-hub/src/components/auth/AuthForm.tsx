"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { GoogleSignInButton } from "./GoogleSignInButton";

/**
 * Authentication form with tabs for sign-in and sign-up
 * This component provides a unified auth experience with email/password and Google sign-in
 *
 * Supports `?mode=signup` query parameter to default to sign-up tab
 */
export function AuthForm() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  // Default to "signup" if mode=signup, otherwise default to "signin"
  const defaultTab = mode === "signup" ? "signup" : "signin";

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        {/* Sign In Tab */}
        <TabsContent value="signin" className="space-y-4 pt-4">
          <LoginForm />
        </TabsContent>

        {/* Sign Up Tab */}
        <TabsContent value="signup" className="space-y-4 pt-4">
          <SignUpForm />
        </TabsContent>
      </Tabs>

      {/* Google Sign-In with divider and emulator warning */}
      <GoogleSignInButton />
    </div>
  );
}
