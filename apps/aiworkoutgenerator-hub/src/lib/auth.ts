import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
} from "firebase/auth";
import { getAuthInstance } from "./firebase";
import { useAuth } from "@/components/auth/AuthProvider";

// Cache auth instance at module level to avoid repeated getAuthInstance() calls
// This is safe because the auth instance doesn't change during runtime
let cachedAuth: Auth | null = null;

const getCachedAuth = (): Auth => {
  if (!cachedAuth) {
    cachedAuth = getAuthInstance();
  }
  return cachedAuth;
};

/**
 * Sign in with Google using popup authentication
 * @returns Promise that resolves with UserCredential
 */
export const signInWithGoogle = () => {
  const auth = getCachedAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export const signOut = () => {
  const auth = getCachedAuth();
  return firebaseSignOut(auth);
};

/**
 * Hook to get the current authenticated user and loading state
 * Must be used in a client component
 * @returns Object containing user and loading state
 */
export const useUser = () => {
  const { user, loading } = useAuth();
  return { user, loading };
};

/**
 * Get the current user's Firebase ID token for API authentication.
 * Use this when calling API routes that require authentication.
 *
 * @param forceRefresh - Force refresh the token even if it hasn't expired
 * @returns The ID token string, or null if no user is signed in
 */
export const getIdToken = async (
  forceRefresh: boolean = false
): Promise<string | null> => {
  const auth = getCachedAuth();
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return user.getIdToken(forceRefresh);
};
