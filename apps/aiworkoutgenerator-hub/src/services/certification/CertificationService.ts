import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { maskIdentifier } from "@/lib/utils";
import type {
  TrainerWorkout,
  CertificationStatus,
  CertificationQuestionnaire,
} from "@/types/firestore";
import type {
  CertificationMessage,
  CertificationMessagesResult,
  CertificationMessageCursor,
  CertificationQueueItem,
  CertificationSummary,
} from "@/types/certification";

// ============================================
// Constants
// ============================================

const MESSAGES_PAGE_SIZE = 50;

// ============================================
// Error Handling Helpers
// ============================================

/**
 * Sanitizes error messages to avoid logging sensitive data such as
 * email addresses, document IDs, or authentication tokens.
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;

  // Email addresses (common in validation errors)
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  sanitized = sanitized.replace(emailPattern, "[EMAIL_REDACTED]");

  // Long alphanumeric identifiers (likely document IDs, tokens, or UUIDs)
  // Match strings of 20+ alphanumeric/underscore/hyphen characters
  // This is conservative to avoid false positives on short IDs
  const documentIdPattern = /\b[a-zA-Z0-9_-]{20,}\b/g;
  sanitized = sanitized.replace(documentIdPattern, "[ID_REDACTED]");

  // Hex tokens (32+ hex characters, likely access tokens or hashes)
  const hexTokenPattern = /\b[a-fA-F0-9]{32,}\b/g;
  sanitized = sanitized.replace(hexTokenPattern, "[TOKEN_REDACTED]");

  return sanitized;
}

/**
 * Safely extracts error message for logging without exposing sensitive data.
 * Only returns the error message, not the full error object.
 * Sanitizes the message to remove potential sensitive information.
 */
function getErrorLogMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message || error.toString();
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    // Try to extract message from error-like objects
    if ("message" in error && typeof error.message === "string") {
      message = error.message;
    } else if ("error" in error && typeof error.error === "string") {
      message = error.error;
    } else {
      // Fallback: try to stringify the error object
      try {
        message = JSON.stringify(error);
      } catch {
        message = String(error);
      }
    }
  } else {
    return String(error) || "Unknown error";
  }

  return sanitizeErrorMessage(message);
}

/**
 * Logs structured error information for production monitoring.
 * Includes context (workoutId, userId, operation) for debugging.
 *
 * @param operation - The operation that failed (e.g., "submitForCertification")
 * @param error - The error that occurred
 * @param context - Additional context (workoutId, userId, etc.)
 */
function logStructuredError(
  operation: string,
  error: unknown,
  context?: { workoutId?: string; userId?: string; [key: string]: unknown }
): void {
  const errorMessage = getErrorLogMessage(error);

  // Extract error code from various error formats
  let errorCode: string | undefined;
  if (error instanceof Error && "code" in error) {
    errorCode = (error as { code?: string }).code;
  } else if (error && typeof error === "object" && "code" in error) {
    errorCode = String((error as { code?: unknown }).code);
  }

  const timestamp = new Date().toISOString();

  // Sanitize sensitive identifiers in context
  // Using explicit list of known sensitive ID fields to avoid false positives
  // (e.g., 'slideId', 'videoId' would match pattern but aren't sensitive in this context)
  const SENSITIVE_ID_FIELDS = new Set([
    "workoutId",
    "userId",
    "workoutOwnerId",
    "senderId",
    "messageId",
  ]);

  const sanitizedContext = context
    ? Object.fromEntries(
        Object.entries(context).map(([key, value]) => {
          // Sanitize known sensitive ID fields
          if (SENSITIVE_ID_FIELDS.has(key) && typeof value === "string") {
            return [key, maskIdentifier(value)];
          }
          // Truncate long strings
          if (typeof value === "string" && value.length > 50) {
            return [key, `${value.substring(0, 50)}...`];
          }
          // Ensure all values are serializable
          try {
            JSON.stringify(value);
            return [key, value];
          } catch {
            return [key, String(value)];
          }
        })
      )
    : undefined;

  // Structured log format for production monitoring
  // Ensure all values are serializable
  const logData: Record<string, unknown> = {
    operation,
    error: errorMessage || "Unknown error",
    timestamp,
  };

  if (errorCode) {
    logData.errorCode = errorCode;
  }

  if (sanitizedContext) {
    logData.context = sanitizedContext;
  }

  // Add error type and additional error details for debugging
  if (error) {
    logData.errorType =
      error instanceof Error ? error.constructor.name : typeof error;

    // Try to extract additional error properties
    if (error instanceof Error) {
      logData.errorName = error.name;
      if (error.stack) {
        logData.errorStack = error.stack.substring(0, 500); // Limit stack trace length
      }
    }

    // Try to extract Firebase error code if it exists
    if (error && typeof error === "object") {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code) {
        logData.firebaseErrorCode = firebaseError.code;
      }
      if (firebaseError.message && firebaseError.message !== errorMessage) {
        logData.firebaseErrorMessage = firebaseError.message;
      }
    }
  }

  // Log to console with structured format
  // In production, consider integrating with error reporting service (e.g., Sentry, LogRocket)
  // For now, console logging is sufficient for monitoring
  try {
    // Log each piece separately to avoid serialization issues
    console.error(`[CertificationService] ${operation} failed`);
    console.error("Operation:", operation);
    console.error("Error message:", errorMessage || "Unknown error");
    console.error("Error type:", logData.errorType || "Unknown");
    if (errorCode) console.error("Error code:", errorCode);
    if (logData.errorName) console.error("Error name:", logData.errorName);
    if (logData.firebaseErrorCode)
      console.error("Firebase error code:", logData.firebaseErrorCode);
    if (logData.errorStack) console.error("Error stack:", logData.errorStack);
    if (sanitizedContext) console.error("Context:", sanitizedContext);
    console.error("Timestamp:", timestamp);
    console.error("Original error object:", error);

    // Also try structured format for tools that parse JSON
    try {
      console.error("Structured log:", JSON.stringify(logData, null, 2));
    } catch (jsonError) {
      console.error("Could not serialize structured log:", jsonError);
    }
  } catch (logError) {
    // Fallback if structured logging fails
    console.error(
      `[CertificationService] ${operation} failed:`,
      errorMessage || "Unknown error",
      errorCode ? `(code: ${errorCode})` : "",
      context ? `Context: ${JSON.stringify(context)}` : "",
      error instanceof Error ? error.stack : "",
      "Logging error:",
      logError
    );
  }
}

/**
 * Categorizes errors and returns user-friendly messages.
 * Handles both Firebase error codes and common error message patterns.
 */
function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorMessage = error.message.toLowerCase();
  const firebaseError = error as Error & { code?: string };

  // Check for Firebase error codes first
  if (firebaseError.code) {
    switch (firebaseError.code) {
      case "permission-denied":
        return "You don't have permission to perform this action. Please ensure you're signed in and own this workout.";
      case "unauthenticated":
        return "Authentication required. Please sign in again.";
      case "unavailable":
        return "Service temporarily unavailable. Please check your connection and try again.";
      case "failed-precondition":
        return "The operation cannot be completed in the current state. Please refresh and try again.";
      case "deadline-exceeded":
        return "The request took too long. Please check your connection and try again.";
      case "resource-exhausted":
        return "Service is temporarily overloaded. Please try again in a moment.";
      case "aborted":
        return "The operation was cancelled. Please try again.";
      case "out-of-range":
        return "Invalid data provided. Please check your input and try again.";
      case "unimplemented":
        return "This feature is not yet available.";
      case "internal":
        return "An internal error occurred. Please try again later.";
      case "data-loss":
        return "Data integrity error. Please refresh and try again.";
      case "already-exists":
        return "This resource already exists. Please refresh and try again.";
      case "not-found":
        return "The requested resource was not found. Please refresh and try again.";
      case "invalid-argument":
        return "Invalid data provided. Please check your input and try again.";
      default:
        // For other Firebase errors, use the error message if available
        return error.message || "A database error occurred. Please try again.";
    }
  }

  // Check for Firestore-specific error patterns
  if (
    errorMessage.includes("internal assertion failed") ||
    errorMessage.includes("unexpected state") ||
    errorMessage.includes("internal unhandled error")
  ) {
    return "A data consistency error occurred. Please refresh the page and try again.";
  }

  // Check for undefined value errors (Firestore rejects undefined values)
  if (
    errorMessage.includes("undefined") &&
    errorMessage.includes("firestore")
  ) {
    return "Invalid data format. Please refresh and try again, or contact support if this persists.";
  }

  // Check for network-related errors
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (errorMessage.includes("timeout")) {
    return "Request timed out. Please check your connection and try again.";
  }

  // Check for transaction-related errors
  if (errorMessage.includes("transaction")) {
    return "The operation could not be completed. Please refresh and try again.";
  }

  // Check for security rules violations (not caught by code)
  if (
    errorMessage.includes("missing or insufficient permissions") ||
    errorMessage.includes("security rules")
  ) {
    return "Permission denied. Please ensure you're signed in and have access to this workout.";
  }

  // Default: return the error message if it's user-friendly, otherwise generic message
  return error.message || "An unexpected error occurred. Please try again.";
}

// ============================================
// Submit for Certification
// ============================================

/**
 * Submit a workout for trainer certification.
 *
 * @param workoutId - The workout to submit
 * @param userId - The user submitting the workout
 * @param questionnaire - User's questionnaire responses
 * @returns Success status
 */
export async function submitForCertification(
  workoutId: string,
  userId: string,
  questionnaire: CertificationQuestionnaire
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDbInstance();
    const workoutRef = doc(db, "trainer_workouts", workoutId);

    // Verify ownership
    const workoutSnap = await getDoc(workoutRef);
    if (!workoutSnap.exists()) {
      return { success: false, error: "Workout not found" };
    }

    const workoutData = workoutSnap.data();
    if (workoutData.user_id !== userId) {
      return { success: false, error: "You do not own this workout" };
    }

    // Check if already submitted
    if (
      workoutData.certification_status &&
      workoutData.certification_status !== "none"
    ) {
      return {
        success: false,
        error: "Workout already submitted for certification",
      };
    }

    // Update workout with certification data (critical operation)
    await updateDoc(workoutRef, {
      certification_status: "pending" as CertificationStatus,
      certification_requested_at: serverTimestamp(),
      certification_questionnaire: questionnaire,
      updated_at: serverTimestamp(),
    });

    // Add system message - this is important for:
    // 1. User notification in the message thread
    // 2. Unread count tracking (system messages are included)
    // 3. Message thread history
    // 4. UI display confirmation
    // Fire and forget - don't block submission return
    // This prevents the form from hanging if the message write takes too long or fails
    // Uses idempotent creation to prevent duplicates
    createSystemMessageIdempotent(
      workoutId,
      userId,
      "Workout submitted for certification. A trainer will be assigned shortly."
    ).catch((error) => {
      // Additional error handling (shouldn't happen due to internal handling, but defensive)
      // Extract error details manually to avoid serialization issues
      let errorMessage = "Unknown error";
      let errorCode: string | undefined;
      let errorName: string | undefined;
      let errorStack: string | undefined;

      if (error instanceof Error) {
        errorMessage = error.message || "Error without message";
        errorName = error.name;
        errorStack = error.stack;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        // Try to extract properties manually
        const err = error as Record<string, unknown>;
        errorMessage = String(
          err.message || err.error || err.toString?.() || "Unknown error object"
        );
        errorCode = err.code ? String(err.code) : undefined;
        errorName = err.name ? String(err.name) : undefined;
      } else {
        errorMessage = String(error || "Unknown error");
      }

      // Log each piece separately to avoid serialization issues
      console.error(
        "[CertificationService] Unexpected error in system message creation (from submitForCertification)"
      );
      console.error("Error message:", errorMessage);
      console.error("Error name:", errorName || "N/A");
      console.error("Error code:", errorCode || "N/A");
      console.error("Error stack:", errorStack || "N/A");
      console.error(
        "Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      );
      console.error("Context:", { workoutId, userId });
      console.error("Full error object:", error);
    });

    return { success: true };
  } catch (error) {
    logStructuredError("submitForCertification", error, {
      workoutId,
      userId,
    });
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

// ============================================
// Get Certification Status
// ============================================

/**
 * Get the certification summary for a workout.
 *
 * @param workoutId - The workout ID
 * @returns Certification summary or null if not found
 */
export async function getCertificationStatus(
  workoutId: string
): Promise<CertificationSummary | null> {
  try {
    const db = getDbInstance();
    const workoutRef = doc(db, "trainer_workouts", workoutId);
    const workoutSnap = await getDoc(workoutRef);

    if (!workoutSnap.exists()) {
      return null;
    }

    const data = workoutSnap.data() as TrainerWorkout;

    return {
      status: data.certification_status || "none",
      requestedAt: data.certification_requested_at?.toDate(),
      assignedTrainerName: data.assigned_trainer_name,
      assignedAt: data.assigned_at?.toDate(),
      certifiedAt: data.certified_at?.toDate(),
      certificationNotes: data.certification_notes,
    };
  } catch (error) {
    console.error(
      "Failed to get certification status:",
      getErrorLogMessage(error)
    );
    return null;
  }
}

// ============================================
// Certification Messages
// ============================================

/**
 * Get certification messages for a workout with pagination.
 *
 * @param workoutId - The workout ID
 * @param pageSize - Number of messages to fetch (default 50)
 * @param cursor - Pagination cursor for fetching more messages
 * @returns Messages result with pagination info
 */
export async function getMessages(
  workoutId: string,
  pageSize: number = MESSAGES_PAGE_SIZE,
  cursor?: CertificationMessageCursor
): Promise<CertificationMessagesResult> {
  try {
    const db = getDbInstance();
    const messagesRef = collection(db, "certification_messages");

    let q = query(
      messagesRef,
      where("workout_id", "==", workoutId),
      orderBy("created_at", "desc"),
      limit(pageSize + 1)
    );

    if (cursor) {
      q = query(
        messagesRef,
        where("workout_id", "==", workoutId),
        orderBy("created_at", "desc"),
        startAfter(cursor.lastCreatedAt),
        limit(pageSize + 1)
      );
    }

    const snapshot = await getDocs(q);
    const messages: CertificationMessage[] = [];

    snapshot.docs.slice(0, pageSize).forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        workout_id: data.workout_id,
        workout_owner_id: data.workout_owner_id,
        sender_id: data.sender_id,
        sender_type: data.sender_type,
        sender_name: data.sender_name,
        sender_avatar: data.sender_avatar,
        message: data.message,
        attachments: data.attachments,
        created_at: data.created_at,
        updated_at: data.updated_at,
        read_at: data.read_at,
        is_edited: data.is_edited,
      });
    });

    const hasMore = snapshot.docs.length > pageSize;
    const lastDoc = messages[messages.length - 1];

    return {
      messages,
      hasMore,
      nextCursor:
        hasMore && lastDoc && lastDoc.created_at
          ? {
              lastMessageId: lastDoc.id,
              lastCreatedAt:
                lastDoc.created_at instanceof Date
                  ? Timestamp.fromDate(lastDoc.created_at)
                  : lastDoc.created_at,
            }
          : undefined,
    };
  } catch (error) {
    logStructuredError("getMessages", error, {
      workoutId,
      pageSize,
    });

    // Handle security rule violations
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === "permission-denied") {
      console.warn(
        "Permission denied when fetching messages. Some messages may be missing workout_owner_id field."
      );
    }

    // Check for missing index error specifically
    // Firestore missing index errors typically use the "failed-precondition" code,
    // but we also allow cases where the code is unavailable while still relying
    // on specific, well-known message patterns.
    const errorMessage = getErrorLogMessage(error).toLowerCase();
    const isMissingIndexError =
      (firebaseError.code === "failed-precondition" ||
        firebaseError.code === "permission-denied" ||
        !firebaseError.code) &&
      // Standard Firestore text for missing index errors
      (errorMessage.includes("requires an index") ||
        // Guidance text pointing to the console to create an index
        errorMessage.includes("create index at") ||
        errorMessage.includes("use the create index") ||
        // More specific variants involving create_composite in the index URL or message
        errorMessage.includes("create_composite index") ||
        errorMessage.includes("indexes?create_composite"));
    if (isMissingIndexError) {
      console.error(
        "[CRITICAL] Missing Firestore index for certification_messages query. " +
          "This indicates the index deployment may have failed or is still building."
      );
    }

    return { messages: [], hasMore: false };
  }
}

/**
 * Creates a deterministic document ID for system messages to ensure idempotency.
 * Uses a hash of workoutId + message content to create a unique, reproducible ID.
 *
 * @param workoutId - The workout ID
 * @param message - The message content
 * @returns Deterministic document ID
 */
function createSystemMessageId(workoutId: string, message: string): string {
  // Create a simple hash from workoutId + message for deterministic ID
  // This ensures the same workoutId + message always produces the same document ID
  // Firestore document IDs: max 1500 bytes, alphanumeric + underscore/hyphen
  const combined = `${workoutId}:${message}`;

  // Simple hash function (djb2-like) for deterministic ID
  // Convert to base36 to ensure valid Firestore document ID characters
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) + hash + combined.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and convert to base36, prefix with 'sys-' for clarity
  // Base36 ensures only alphanumeric characters (valid for Firestore IDs)
  const hashStr = Math.abs(hash).toString(36);

  // Firestore IDs can be up to 1500 bytes, but we'll keep it reasonable
  // Prefix with 'sys-' to indicate system message, then workoutId (truncated if needed) + hash
  const workoutIdPrefix =
    workoutId.length > 20 ? workoutId.substring(0, 20) : workoutId;
  return `sys-${workoutIdPrefix}-${hashStr}`;
}

/**
 * Create a system message with atomic idempotency using deterministic document ID.
 * Uses setDoc with a deterministic ID based on workoutId + message content,
 * ensuring true atomicity and eliminating race conditions.
 *
 * @param workoutId - The workout ID
 * @param workoutOwnerId - The workout owner ID
 * @param message - The system message content
 * @returns Promise that resolves when message is created or already exists
 */
async function createSystemMessageIdempotent(
  workoutId: string,
  workoutOwnerId: string,
  message: string
): Promise<void> {
  try {
    const db = getDbInstance();

    // Validate workout exists and is owned by the user before creating message
    // This prevents errors when workout doesn't exist or user doesn't have access
    const workoutRef = doc(db, "trainer_workouts", workoutId);
    const workoutSnap = await getDoc(workoutRef);

    // Defensive check: ensure workoutSnap is defined before calling exists()
    // This prevents TypeError if getDoc returns undefined (edge case)
    if (!workoutSnap || !workoutSnap.exists()) {
      // Workout doesn't exist - log warning but don't throw (non-critical)
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[CertificationService] Cannot create system message: workout not found",
          { workoutId, workoutOwnerId }
        );
      }
      return;
    }

    const workoutData = workoutSnap.data();
    if (workoutData.user_id !== workoutOwnerId) {
      // Workout ownership mismatch - log warning but don't throw (non-critical)
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[CertificationService] Cannot create system message: workout ownership mismatch",
          { workoutId, workoutOwnerId, workoutUserId: workoutData.user_id }
        );
      }
      return;
    }

    const messagesRef = collection(db, "certification_messages");

    // Create deterministic document ID for atomic idempotency
    // The ID is based on workoutId + message content, ensuring:
    // - Same workoutId + same message = same ID (idempotent)
    // - Different messages get different IDs (allows multiple system messages)
    // This approach eliminates race conditions and doesn't require queries with limit(1)
    // that could miss duplicates if multiple system messages exist
    const messageId = createSystemMessageId(workoutId, message);
    const messageRef = doc(messagesRef, messageId);

    // Skip getDoc check to avoid read rule evaluation on non-existent documents
    // Use setDoc with merge: false for atomic idempotency
    // If document exists, setDoc will throw "already exists" error which we handle below

    // Create the system message with deterministic ID
    const systemMessageData = buildMessageData({
      workoutId,
      workoutOwnerId,
      senderId: "system",
      senderType: "system",
      senderName: "System",
      message,
      senderAvatar: null,
    });

    // Use setDoc with deterministic ID for atomic operation
    // If document already exists (race condition), this will throw "already exists" error
    await setDoc(messageRef, systemMessageData, { merge: false });

    // Log success for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[CertificationService] System message created successfully:",
        {
          messageId: createSystemMessageId(workoutId, message),
          workoutId,
          workoutOwnerId,
        }
      );
    }
  } catch (error) {
    // Extract error information manually to avoid serialization issues
    let errorMessage = "Unknown error";
    let errorCode: string | undefined;
    let errorName: string | undefined;
    let errorStack: string | undefined;
    let errorType: string;

    if (error instanceof Error) {
      errorMessage = error.message || "Error without message";
      errorName = error.name;
      errorStack = error.stack;
      errorType = error.constructor.name;
    } else if (typeof error === "string") {
      errorMessage = error;
      errorType = "string";
    } else if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      errorMessage = String(
        err.message || err.error || err.toString?.() || "Unknown error object"
      );
      errorCode = err.code ? String(err.code) : undefined;
      errorName = err.name ? String(err.name) : undefined;
      errorType = typeof error;
    } else {
      errorMessage = String(error || "Unknown error");
      errorType = typeof error;
    }

    // Try to extract Firebase error code
    if (!errorCode && error && typeof error === "object") {
      const err = error as { code?: string };
      errorCode = err.code;
    }

    const errorString = errorMessage.toLowerCase();

    // Handle "already exists" errors gracefully - treat as success (idempotent)
    // This can happen in race conditions where multiple attempts occur simultaneously
    // With deterministic IDs, this is now the only way duplicates can occur
    if (
      errorString.includes("already exists") ||
      errorString.includes("document already exists") ||
      errorCode === "already-exists"
    ) {
      // Log but don't throw - this is expected in race conditions
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[CertificationService] System message already exists (idempotent success):",
          errorMessage
        );
      }
      return;
    }

    // Handle permission errors gracefully - these are non-critical
    // Permission errors can occur if security rules block the write
    // This is expected in some edge cases and shouldn't block the main operation
    if (
      errorCode === "permission-denied" ||
      errorString.includes("permission") ||
      errorString.includes("permission-denied")
    ) {
      // Log as warning instead of error since this is non-critical
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[CertificationService] System message creation blocked by security rules (non-critical):",
          {
            workoutId,
            workoutOwnerId,
            errorCode,
            errorMessage,
          }
        );
      }
      return; // Don't throw - this is a non-critical operation
    }

    // For other errors, log with full details (fire-and-forget pattern)
    // The submission/cancellation operation already succeeded
    // Ensure we have a valid error to log
    const errorToLog = error || new Error("Unknown error occurred");

    // Log each piece separately to avoid serialization issues
    // Use warn instead of error since this is a non-critical fire-and-forget operation
    console.warn(
      "[CertificationService] System message creation failed (non-critical)"
    );
    console.error("Error message:", errorMessage);
    console.error("Error name:", errorName || "N/A");
    console.error("Error code:", errorCode || "N/A");
    console.error("Error type:", errorType);
    console.error("Error instanceof Error:", error instanceof Error);
    if (errorStack) console.error("Error stack:", errorStack);
    console.error("Context:", {
      workoutId,
      workoutOwnerId,
      messageId: createSystemMessageId(workoutId, message),
      senderType: "system",
    });
    console.error("Original error object:", error);

    // Also use structured logging (but it might fail, so we've already logged above)
    try {
      logStructuredError("createSystemMessageIdempotent", errorToLog, {
        workoutId,
        workoutOwnerId,
        messageContent: message.substring(0, 100), // Truncate for logging
        messageId: createSystemMessageId(workoutId, message),
      });
    } catch (logError) {
      console.error(
        "[CertificationService] Failed to log structured error:",
        logError
      );
    }
  }
}

/**
 * Build message data for Firestore with type safety and validation.
 * Ensures no undefined values are included (Firestore rejects undefined).
 *
 * @param params - Message data parameters
 * @returns Message data object ready for Firestore
 */
function buildMessageData(params: {
  workoutId: string;
  workoutOwnerId: string;
  senderId: string;
  senderType: "user" | "trainer" | "system";
  senderName: string;
  message: string;
  senderAvatar?: string | null;
}): {
  workout_id: string;
  workout_owner_id: string;
  sender_id: string;
  sender_type: "user" | "trainer" | "system";
  sender_name: string;
  message: string;
  created_at: ReturnType<typeof serverTimestamp>;
  read_at: null;
  sender_avatar?: string;
} {
  const messageData: {
    workout_id: string;
    workout_owner_id: string;
    sender_id: string;
    sender_type: "user" | "trainer" | "system";
    sender_name: string;
    message: string;
    created_at: ReturnType<typeof serverTimestamp>;
    read_at: null;
    sender_avatar?: string;
  } = {
    workout_id: params.workoutId,
    workout_owner_id: params.workoutOwnerId,
    sender_id: params.senderId,
    sender_type: params.senderType,
    sender_name: params.senderName,
    message: params.message.trim(),
    created_at: serverTimestamp(),
    read_at: null,
  };

  // Conditionally include sender_avatar only if it exists and is non-empty
  // This prevents undefined values from being included in Firestore documents
  const avatar = params.senderAvatar?.trim();
  if (avatar) {
    messageData.sender_avatar = avatar;
  }

  return messageData;
}

/**
 * Send a message in the certification conversation.
 *
 * @param workoutId - The workout ID
 * @param userId - The sender's user ID
 * @param userName - The sender's display name
 * @param message - The message content
 * @returns The created message ID or null on failure
 */
export async function sendMessage(
  workoutId: string,
  userId: string,
  userName: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!message.trim()) {
      return { success: false, error: "Message cannot be empty" };
    }

    if (message.length > 5000) {
      return {
        success: false,
        error: "Message is too long (max 5000 characters)",
      };
    }

    const db = getDbInstance();

    // Fetch user profile before transaction to get photo_url (if available)
    // This is safe outside transaction since profile data is relatively stable,
    // and failures to fetch the profile should not block sending the message.
    let userProfile: Record<string, unknown> | null = null;
    try {
      const userProfileRef = doc(db, "user_profiles", userId);
      const userProfileSnap = await getDoc(userProfileRef);
      userProfile = userProfileSnap.exists() ? userProfileSnap.data() : null;
    } catch (profileError) {
      // Log and proceed with a null profile (no avatar) if the profile cannot be fetched
      // This ensures message sending isn't blocked by profile fetch failures
      console.error(
        "Failed to fetch user profile for certification message:",
        getErrorLogMessage(profileError)
      );
      userProfile = null;
    }

    // Use transaction to atomically check workout status and create message
    // This prevents race conditions where status changes between check and message creation
    const messageId = await runTransaction(db, async (transaction) => {
      // Read workout document within transaction
      const workoutRef = doc(db, "trainer_workouts", workoutId);
      const workoutSnap = await transaction.get(workoutRef);

      if (!workoutSnap.exists()) {
        throw new Error("Workout not found. Please refresh and try again.");
      }

      const workoutData = workoutSnap.data();
      if (workoutData.user_id !== userId) {
        throw new Error(
          "You don't have permission to send messages for this workout."
        );
      }

      // Check if certification is active (atomic check within transaction)
      const status = workoutData.certification_status as CertificationStatus;
      if (
        !status ||
        status === "none" ||
        status === "certified" ||
        status === "rejected"
      ) {
        throw new Error(
          "Cannot send messages. This workout is not in an active certification process."
        );
      }

      // Create message reference
      const messagesRef = collection(db, "certification_messages");
      const messageRef = doc(messagesRef);

      // Build message data using helper function for type safety
      // Only include sender_avatar if photo_url exists and is non-empty
      const photoUrl = (userProfile?.photo_url as string | undefined) || null;
      const messageData = buildMessageData({
        workoutId,
        workoutOwnerId: userId,
        senderId: userId,
        senderType: "user",
        senderName: userName,
        message,
        senderAvatar: photoUrl,
      });

      // Add message within transaction
      transaction.set(messageRef, messageData);

      return messageRef.id;
    });

    return { success: true, messageId };
  } catch (error) {
    logStructuredError("sendMessage", error, {
      workoutId,
      userId,
    });
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Mark messages as read for a user.
 *
 * @param workoutId - The workout ID
 * @param userId - The user marking messages as read
 */
export async function markMessagesAsRead(
  workoutId: string,
  userId: string
): Promise<void> {
  let unreadCount = 0;
  let totalMessages = 0;

  try {
    const db = getDbInstance();
    const messagesRef = collection(db, "certification_messages");

    // Get messages for this workout not sent by the user
    // Query MUST filter by workout_owner_id to match security rules
    // Security rules allow: workout_owner_id == request.auth.uid OR trainer/admin
    const q = query(
      messagesRef,
      where("workout_id", "==", workoutId),
      where("workout_owner_id", "==", userId),
      where("sender_id", "!=", userId)
    );
    const snapshot = await getDocs(q);
    totalMessages = snapshot.size;

    // Filter to only unread messages (no read_at set or read_at is null)
    const unreadDocs = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data();
      return !data.read_at;
    });
    unreadCount = unreadDocs.length;

    // Mark each unread message as read
    // Use updateDoc since we know these documents exist (we just queried them)
    // The security rule allows updating read_at field on existing documents
    const updates = unreadDocs.map((docSnap) => {
      const messageRef = doc(db, "certification_messages", docSnap.id);
      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/af84aa89-d682-4ef6-bdcf-f698f312b9b7",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "CertificationService.ts:986",
            message: "BEFORE updateDoc for markMessagesAsRead",
            data: {
              messageId: docSnap.id,
              workoutId,
              userId,
              hasReadAt: !!docSnap.data().read_at,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion
      return updateDoc(messageRef, { read_at: serverTimestamp() });
    });

    await Promise.all(updates);
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/af84aa89-d682-4ef6-bdcf-f698f312b9b7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "CertificationService.ts:993",
        message: "AFTER updateDoc - SUCCESS",
        data: { workoutId, userId, updatedCount: unreadDocs.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
  } catch (error) {
    // #region agent log
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : undefined;
    fetch("http://127.0.0.1:7244/ingest/af84aa89-d682-4ef6-bdcf-f698f312b9b7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "CertificationService.ts:994",
        message: "CATCH BLOCK in markMessagesAsRead",
        data: {
          workoutId,
          userId,
          unreadCount,
          totalMessages,
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
          errorMessage,
          errorCode,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    // Ensure we have a valid error to log
    const errorToLog = error || new Error("Unknown error occurred");
    logStructuredError("markMessagesAsRead", errorToLog, {
      workoutId,
      userId,
      unreadCount,
      totalMessages,
    });
    throw error;
  }
}

// ============================================
// Certified Workout Version
// ============================================

/**
 * Get the certified version of a workout if it exists.
 *
 * @param workoutId - The original workout ID
 * @returns The certified workout or null
 */
export async function getCertifiedVersion(
  workoutId: string
): Promise<TrainerWorkout | null> {
  try {
    const db = getDbInstance();

    // First check if the workout has a certified_version_id
    const originalRef = doc(db, "trainer_workouts", workoutId);
    const originalSnap = await getDoc(originalRef);

    if (!originalSnap.exists()) {
      return null;
    }

    const originalData = originalSnap.data();
    const certifiedVersionId = originalData.certified_version_id;

    if (!certifiedVersionId) {
      return null;
    }

    // Get the certified version
    const certifiedRef = doc(db, "trainer_workouts", certifiedVersionId);
    const certifiedSnap = await getDoc(certifiedRef);

    if (!certifiedSnap.exists()) {
      return null;
    }

    return {
      id: certifiedSnap.id,
      ...certifiedSnap.data(),
    } as TrainerWorkout;
  } catch (error) {
    console.error(
      "Failed to get certified version:",
      getErrorLogMessage(error)
    );
    return null;
  }
}

// ============================================
// User's Certification Queue
// ============================================

/**
 * Get user's workouts that are in the certification process.
 *
 * @param userId - The user's ID
 * @param statusFilter - Optional filter by status
 * @returns List of queue items
 */
export async function getUserCertificationQueue(
  userId: string,
  statusFilter?: CertificationStatus
): Promise<CertificationQueueItem[]> {
  try {
    const db = getDbInstance();
    const workoutsRef = collection(db, "trainer_workouts");

    // Base query: user's workouts with certification status
    let q = query(
      workoutsRef,
      where("user_id", "==", userId),
      where("certification_status", "!=", null),
      orderBy("certification_status"),
      orderBy("certification_requested_at", "desc")
    );

    // If status filter provided, adjust query
    if (statusFilter && statusFilter !== "none") {
      q = query(
        workoutsRef,
        where("user_id", "==", userId),
        where("certification_status", "==", statusFilter),
        orderBy("certification_requested_at", "desc")
      );
    }

    const snapshot = await getDocs(q);
    const items: CertificationQueueItem[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const status = data.certification_status as CertificationStatus;

      // Skip "none" status
      if (status === "none") continue;

      // Check for unread messages
      const messagesRef = collection(db, "certification_messages");
      const unreadQuery = query(
        messagesRef,
        where("workout_id", "==", docSnap.id),
        where("sender_type", "!=", "user")
      );
      const unreadSnap = await getDocs(unreadQuery);

      // Filter to only unread messages (no read_at set or read_at is null)
      const hasUnread = unreadSnap.docs.some((doc) => {
        const messageData = doc.data();
        return !messageData.read_at;
      });

      items.push({
        workoutId: docSnap.id,
        workoutTitle: data.title || "Untitled Workout",
        status,
        requestedAt: data.certification_requested_at?.toDate() || new Date(),
        assignedTrainerName: data.assigned_trainer_name,
        hasUnreadMessages: hasUnread,
      });
    }

    return items;
  } catch (error) {
    logStructuredError("getUserCertificationQueue", error, {
      userId,
      statusFilter,
    });
    return [];
  }
}

// ============================================
// Cancel Certification
// ============================================

/**
 * Cancel a pending certification request.
 *
 * @param workoutId - The workout ID
 * @param userId - The user requesting cancellation
 * @returns Success status
 */
export async function cancelCertification(
  workoutId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDbInstance();
    const workoutRef = doc(db, "trainer_workouts", workoutId);

    // Verify ownership
    const workoutSnap = await getDoc(workoutRef);
    if (!workoutSnap.exists()) {
      return { success: false, error: "Workout not found" };
    }

    const workoutData = workoutSnap.data();
    if (workoutData.user_id !== userId) {
      return { success: false, error: "You do not own this workout" };
    }

    // Check if can be cancelled (only pending or in_review)
    const status = workoutData.certification_status as CertificationStatus;
    if (
      status !== "pending" &&
      status !== "in_review" &&
      status !== "changes_requested"
    ) {
      return {
        success: false,
        error: "Cannot cancel certification at this stage",
      };
    }

    // Reset certification fields (critical operation)
    await updateDoc(workoutRef, {
      certification_status: "none",
      certification_requested_at: null,
      certification_questionnaire: null,
      assigned_trainer_id: null,
      assigned_trainer_name: null,
      assigned_at: null,
      updated_at: serverTimestamp(),
    });

    // Add system message
    // Fire and forget - don't block cancellation return
    // This prevents the form from hanging if the message write takes too long or fails
    // Uses idempotent creation to prevent duplicates
    createSystemMessageIdempotent(
      workoutId,
      userId,
      "Certification request cancelled by user."
    ).catch((error) => {
      // Additional error handling (shouldn't happen due to internal handling, but defensive)
      // Extract error details manually to avoid serialization issues
      let errorMessage = "Unknown error";
      let errorCode: string | undefined;
      let errorName: string | undefined;
      let errorStack: string | undefined;

      if (error instanceof Error) {
        errorMessage = error.message || "Error without message";
        errorName = error.name;
        errorStack = error.stack;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        // Try to extract properties manually
        const err = error as Record<string, unknown>;
        errorMessage = String(
          err.message || err.error || err.toString?.() || "Unknown error object"
        );
        errorCode = err.code ? String(err.code) : undefined;
        errorName = err.name ? String(err.name) : undefined;
      } else {
        errorMessage = String(error || "Unknown error");
      }

      // Log each piece separately to avoid serialization issues
      console.error(
        "[CertificationService] Unexpected error in system message creation (from cancelCertification)"
      );
      console.error("Error message:", errorMessage);
      console.error("Error name:", errorName || "N/A");
      console.error("Error code:", errorCode || "N/A");
      console.error("Error stack:", errorStack || "N/A");
      console.error(
        "Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      );
      console.error("Context:", { workoutId, userId });
      console.error("Full error object:", error);
    });

    return { success: true };
  } catch (error) {
    logStructuredError("cancelCertification", error, {
      workoutId,
      userId,
    });
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

// ============================================
// Export Service
// ============================================

export const CertificationService = {
  submitForCertification,
  getCertificationStatus,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getCertifiedVersion,
  getUserCertificationQueue,
  cancelCertification,
};
