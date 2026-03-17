/**
 * Helper function to safely extract error code from Firebase errors
 */
export function getErrorCode(error: unknown): string {
  // Check if it's an Error instance with a code property (FirebaseError pattern)
  if (error instanceof Error && "code" in error) {
    const code = (error as Error & { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  // Check if it's an object with a code property (for compatibility with various error formats)
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  // Fallback for non-Firebase errors - use error message if available
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown";
}

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
export function getErrorMessage(errorCode: string): string {
  // Handle Firebase Auth error codes
  if (errorCode.startsWith("auth/")) {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is disabled. Please contact support.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 8 characters.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      case "auth/popup-blocked":
        return "Popup was blocked. Please allow popups or use email/password sign-in.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      default:
        return `Authentication error: ${errorCode.replace("auth/", "")}. Please try again.`;
    }
  }

  // Handle non-Firebase errors (e.g., Error messages, network issues)
  if (errorCode === "unknown") {
    return "An unexpected error occurred. Please try again.";
  }

  // If errorCode is an Error message, return it with context
  return `An error occurred: ${errorCode}. Please try again.`;
}
