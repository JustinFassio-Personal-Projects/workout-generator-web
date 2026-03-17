"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getAuthInstance } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { ensureUserDocument } from "@/lib/user-service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Note: updateLastLogin removed - now handled by /api/users/ensure route

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Track which user we've updated last_login for to avoid redundant updates
  const lastLoginUpdatedForRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      // Use setTimeout to avoid synchronous state update in effect body
      const timeoutId = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timeoutId);
    }

    let unsubscribe: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const auth = getAuthInstance();
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          setUser(user);
          setLoading(false);

          // Ensure user document exists and update last_login when user signs in (not on every re-render)
          if (user && lastLoginUpdatedForRef.current !== user.uid) {
            lastLoginUpdatedForRef.current = user.uid;
            // Fire and forget - don't block auth state
            // Wait for ID token to be available before making Firestore calls
            // This ensures the auth token is propagated to Firestore in the emulator
            void (async () => {
              // Retry logic for emulator timing issues
              const maxRetries = 3;
              let retryCount = 0;

              while (retryCount < maxRetries) {
                try {
                  // Force token refresh to ensure it's available for Firestore
                  await user.getIdToken(true);
                  // Longer delay to allow token propagation in emulator (increases with retries)
                  await new Promise((resolve) =>
                    setTimeout(resolve, 200 * (retryCount + 1))
                  );

                  // Ensure user document exists and update last_login
                  // The API route handles both operations
                  await ensureUserDocument(user);

                  // Success - break out of retry loop
                  break;
                } catch (error) {
                  retryCount++;
                  if (retryCount >= maxRetries) {
                    // Final attempt failed - log but don't throw
                    console.warn(
                      `Failed to ensure user document after ${maxRetries} attempts (non-critical):`,
                      error
                    );
                  } else {
                    // Wait before retrying
                    await new Promise((resolve) => setTimeout(resolve, 500));
                  }
                }
              }
            })();
          } else if (!user) {
            // Reset when user signs out
            lastLoginUpdatedForRef.current = null;
          }
        },
        (error) => {
          // Handle auth state change errors gracefully
          // The emulator may return 400 errors for account lookups when no user is signed in
          // This is expected behavior and can be safely ignored, but only in the emulator
          const isUsingEmulator =
            typeof window !== "undefined" &&
            !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

          // Extract error code if available
          const errorCode =
            error && typeof error === "object" && "code" in error
              ? (error as { code?: string }).code
              : null;

          // Only suppress known emulator-specific errors when actually using the emulator
          // Check for specific error codes rather than string matching on messages
          const isEmulatorLookupError =
            isUsingEmulator &&
            (errorCode === "auth/network-request-failed" ||
              errorCode === "auth/internal-error");

          // Additionally check if it's a 400 error from the emulator endpoint
          // by checking if the error is a network error pointing to localhost
          // This is more specific than just checking for "400" in the message
          const isEmulatorNetworkError =
            isUsingEmulator &&
            errorCode === "auth/network-request-failed" &&
            error instanceof Error &&
            (error.message.includes("localhost") ||
              error.message.includes("127.0.0.1"));

          if (isEmulatorLookupError || isEmulatorNetworkError) {
            // Silently handle emulator lookup errors when no user is signed in
            setUser(null);
            setLoading(false);
            return;
          }

          // Log and handle all other errors
          console.error("Auth state change error:", error);
          setUser(null);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Auth initialization error:", error);
      // Use setTimeout to avoid synchronous state update in effect body
      timeoutId = setTimeout(() => setLoading(false), 0);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
