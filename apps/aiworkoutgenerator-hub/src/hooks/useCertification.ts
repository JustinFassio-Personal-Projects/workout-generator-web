"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  limit,
  getDocs,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { useUser } from "@/lib/auth";
import { maskIdentifier } from "@/lib/utils";
import type {
  TrainerWorkout,
  CertificationStatus,
  CertificationQuestionnaire,
} from "@/types/firestore";
import type {
  CertificationMessage,
  CertificationSummary,
  CertificationQueueItem,
} from "@/types/certification";
import { CertificationService } from "@/services/certification";

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
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    return "Unknown error";
  }

  return sanitizeErrorMessage(message);
}

// ============================================
// useCertificationStatus - Real-time status updates
// ============================================

interface UseCertificationStatusReturn {
  status: CertificationStatus;
  summary: CertificationSummary | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get real-time certification status for a workout.
 */
export function useCertificationStatus(
  workoutId: string | null
): UseCertificationStatusReturn {
  const [status, setStatus] = useState<CertificationStatus>("none");
  const [summary, setSummary] = useState<CertificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workoutId) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const db = getDbInstance();
    const workoutRef = doc(db, "trainer_workouts", workoutId);

    const unsubscribe = onSnapshot(
      workoutRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as TrainerWorkout;
          const certStatus = data.certification_status || "none";

          setStatus(certStatus);
          setSummary({
            status: certStatus,
            requestedAt: data.certification_requested_at?.toDate(),
            assignedTrainerName: data.assigned_trainer_name,
            assignedAt: data.assigned_at?.toDate(),
            certifiedAt: data.certified_at?.toDate(),
            certificationNotes: data.certification_notes,
          });
        } else {
          setStatus("none");
          setSummary(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(
          "Error fetching certification status:",
          getErrorLogMessage(err)
        );
        setError("Failed to load certification status");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [workoutId]);

  return { status, summary, loading, error };
}

// ============================================
// useCertificationMessages - Real-time message updates
// ============================================

interface UseCertificationMessagesReturn {
  messages: CertificationMessage[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
}

/**
 * Hook to get real-time certification messages for a workout.
 */
export function useCertificationMessages(
  workoutId: string | null
): UseCertificationMessagesReturn {
  const { user } = useUser();
  const [messages, setMessages] = useState<CertificationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!workoutId) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Wrap entire effect setup in try-catch for resilience
    // CRITICAL: If security rules cause internal assertion failures, we need to
    // completely reset the Firestore connection. The SDK's internal state can become
    // corrupted when rules evaluate incorrectly during list queries.
    try {
      // Don't query if user is not authenticated
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      const db = getDbInstance();
      const messagesRef = collection(db, "certification_messages");

      // Query MUST filter by workout_owner_id to match security rules
      // Security rules allow: workout_owner_id == request.auth.uid OR trainer/admin
      // By filtering by workout_owner_id, we ensure the query matches the rules exactly
      const q = query(
        messagesRef,
        where("workout_id", "==", workoutId),
        where("workout_owner_id", "==", user.uid),
        orderBy("created_at", "asc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const msgs: CertificationMessage[] = [];
            let unread = 0;

            // Wrap forEach in try-catch to prevent one malformed doc from breaking all messages
            try {
              snapshot.docs.forEach((docSnap) => {
                try {
                  const data = docSnap.data();

                  // Defensive check: Skip documents that are missing required fields
                  // This can happen temporarily during security rules updates or with legacy data
                  // workout_owner_id is required by security rules and queries, so skip if missing
                  if (
                    !data.workout_id ||
                    !data.workout_owner_id ||
                    !data.sender_id ||
                    !data.sender_type
                  ) {
                    console.warn(
                      "Skipping malformed message document: missing required fields"
                    );
                    return;
                  }

                  const msg: CertificationMessage = {
                    id: docSnap.id,
                    workout_id: data.workout_id,
                    workout_owner_id: data.workout_owner_id, // Required field - already validated above
                    sender_id: data.sender_id,
                    sender_type: data.sender_type,
                    // Use fallback "Unknown" if missing (should not happen, but defensive)
                    // This ensures type safety and prevents empty display in UI
                    sender_name: data.sender_name || "Unknown",
                    sender_avatar: data.sender_avatar || null,
                    message: data.message || "",
                    attachments: data.attachments || null,
                    // Use fallback timestamp if missing (should not happen, but defensive)
                    // This ensures type safety and prevents sorting issues
                    created_at: data.created_at ?? new Date(),
                    updated_at: data.updated_at || null,
                    read_at: data.read_at || null,
                    is_edited: data.is_edited || false,
                  };
                  msgs.push(msg);

                  // Count unread messages not from the current user
                  if (user && data.sender_id !== user.uid && !data.read_at) {
                    unread++;
                  }
                } catch (docError) {
                  // Skip individual documents that cause errors
                  // Log error but continue processing other documents
                  console.error(
                    "Error processing message document:",
                    getErrorLogMessage(docError)
                  );
                }
              });
            } catch (forEachError) {
              // Catch errors in forEach loop itself
              console.error(
                "Error iterating over message documents:",
                getErrorLogMessage(forEachError)
              );
              // Continue with empty array if we can't process any docs
            }

            setMessages(msgs);
            setUnreadCount(unread);
            setLoading(false);
            setError(null);
          } catch (snapshotError) {
            // Catch any errors during snapshot processing
            // This handles Firestore internal assertion failures and other unexpected errors
            console.error(
              "Error processing certification messages snapshot:",
              getErrorLogMessage(snapshotError)
            );

            // Check if it's a Firestore internal error
            const errorMessage =
              snapshotError instanceof Error
                ? snapshotError.message
                : String(snapshotError);

            if (
              errorMessage.includes("INTERNAL ASSERTION FAILED") ||
              errorMessage.includes("Unexpected state") ||
              errorMessage.includes("INTERNAL UNHANDLED ERROR")
            ) {
              // Firestore internal errors - clear state and show recovery message
              setMessages([]);
              setUnreadCount(0);
              setError(
                "Unable to load messages due to a data consistency issue. Please refresh the page to reconnect."
              );
            } else {
              // Other errors - show generic message
              setError(
                "Error processing messages. Some data may be missing. Please refresh the page."
              );
            }

            setLoading(false);
          }
        },
        (err) => {
          // Handle listener errors (permission denied, network issues, etc.)
          const errorMessage = getErrorLogMessage(err);
          console.error("Error fetching certification messages:", errorMessage);

          // Handle security rule violations specifically
          const firebaseError = err as { code?: string; message?: string };
          const errorMessageLower = errorMessage.toLowerCase();

          // Check for missing index error - CRITICAL for production monitoring
          // Firestore missing index errors typically use the "failed-precondition" code,
          // but we also allow cases where the code is unavailable while still relying
          // on specific, well-known message patterns.
          const isMissingIndexError =
            (firebaseError.code === "failed-precondition" ||
              firebaseError.code === "permission-denied" ||
              !firebaseError.code) &&
            // Standard Firestore text for missing index errors
            (errorMessageLower.includes("requires an index") ||
              // Guidance text pointing to the console to create an index
              errorMessageLower.includes("create index at") ||
              errorMessageLower.includes("use the create index") ||
              // More specific variants involving create_composite in the index URL or message
              errorMessageLower.includes("create_composite index") ||
              errorMessageLower.includes("indexes?create_composite"));
          if (isMissingIndexError) {
            console.error(
              "[CRITICAL] Missing Firestore index detected in useCertificationMessages. " +
                "Index may not be deployed or is still building. " +
                `WorkoutId: ${workoutId ? maskIdentifier(workoutId) : "unknown"}, ` +
                `UserId: ${user?.uid ? maskIdentifier(user.uid) : "unknown"}`
            );
            setError(
              "Messages are temporarily unavailable. The system is updating. Please refresh the page in a moment."
            );
            setLoading(false);
            return;
          }

          // Check for internal assertion errors (cascading from security rules)
          // These occur when Firestore SDK's internal state becomes inconsistent
          // Usually caused by security rule evaluation failures during list queries
          if (
            errorMessageLower.includes("internal assertion failed") ||
            errorMessageLower.includes("unexpected state") ||
            errorMessageLower.includes("internal unhandled error")
          ) {
            console.warn(
              "Firestore internal error detected. This may be due to security rules or data issues. Clearing state and attempting recovery."
            );
            // Clear state immediately to prevent further corruption
            setMessages([]);
            setUnreadCount(0);
            setError(
              "Unable to load messages due to a data consistency issue. Please refresh the page to reconnect."
            );
            setLoading(false);

            // Force cleanup of the subscription to prevent further errors
            // The effect cleanup will handle the unsubscribe
            return;
          }

          // Handle specific Firestore error codes
          if (firebaseError.code === "permission-denied") {
            setError(
              "Permission denied. Some messages may be missing required fields. Please contact support if this persists."
            );
          } else if (firebaseError.code === "unavailable") {
            setError(
              "Service temporarily unavailable. Please check your connection and try again."
            );
          } else if (firebaseError.code === "deadline-exceeded") {
            setError(
              "Request timed out. Please check your connection and try again."
            );
          } else {
            setError("Failed to load messages. Please refresh the page.");
          }

          setLoading(false);
        }
      );

      return () => {
        try {
          unsubscribe();
        } catch (cleanupError) {
          // Log cleanup errors but don't throw
          console.error(
            "Error unsubscribing from messages:",
            getErrorLogMessage(cleanupError)
          );
        }
      };
    } catch (setupError) {
      // Handle errors during effect setup (e.g., invalid query)
      console.error(
        "Failed to set up message listener:",
        getErrorLogMessage(setupError)
      );
      setError("Unable to connect to messages. Please refresh the page.");
      setLoading(false);

      // Return empty cleanup function
      return () => {};
    }
  }, [workoutId, user]);

  return { messages, loading, error, unreadCount };
}

// ============================================
// useCertificationQueue - User's certification submissions
// ============================================

interface UseCertificationQueueReturn {
  items: CertificationQueueItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to get user's certification queue with real-time updates.
 */
export function useCertificationQueue(): UseCertificationQueueReturn {
  const { user, loading: authLoading } = useUser();
  const [items, setItems] = useState<CertificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setItems([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const db = getDbInstance();
    const workoutsRef = collection(db, "trainer_workouts");

    // Query for workouts with active certification
    const q = query(
      workoutsRef,
      where("user_id", "==", user.uid),
      where("certification_status", "in", [
        "pending",
        "in_review",
        "changes_requested",
        "certified",
        "rejected",
      ]),
      orderBy("certification_requested_at", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const queueItems: CertificationQueueItem[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          queueItems.push({
            workoutId: docSnap.id,
            workoutTitle: data.title || "Untitled Workout",
            status: data.certification_status,
            requestedAt:
              data.certification_requested_at?.toDate() || new Date(),
            assignedTrainerName: data.assigned_trainer_name,
            hasUnreadMessages: false, // Will be updated below
          });
        }

        // Batch query unread messages for all workouts efficiently
        // Firestore 'in' queries are limited to 10 items, so we batch if needed
        if (queueItems.length > 0 && user) {
          try {
            const workoutIds = queueItems.map((item) => item.workoutId);
            const messagesRef = collection(db, "certification_messages");
            const unreadWorkoutIds = new Set<string>();

            // Process in batches of 10 (Firestore 'in' query limit)
            // CRITICAL: Must filter by workout_owner_id to match security rules
            // Security rules require workout_owner_id == request.auth.uid for read access
            // Note: Removed sender_type filter from query due to security rules constraints
            // Will filter client-side instead
            const batchSize = 10;
            for (let i = 0; i < workoutIds.length; i += batchSize) {
              const batch = workoutIds.slice(i, i + batchSize);
              const unreadQuery = query(
                messagesRef,
                where("workout_owner_id", "==", user.uid),
                where("workout_id", "in", batch)
              );

              const unreadSnap = await getDocs(unreadQuery);
              // Filter to only unread messages from trainers/system (no read_at set or read_at is null)
              // and collect workout IDs that have unread messages
              // Defensive check: ensure unreadSnap and docs exist before accessing
              if (unreadSnap && Array.isArray(unreadSnap.docs)) {
                unreadSnap.docs
                  .filter((doc) => {
                    const data = doc.data();
                    // Filter client-side: only trainer/system messages that are unread
                    const isTrainerOrSystem =
                      data.sender_type === "trainer" ||
                      data.sender_type === "system";
                    const isUnread = !data.read_at;
                    return isTrainerOrSystem && isUnread;
                  })
                  .forEach((doc) => {
                    const data = doc.data();
                    if (data.workout_id) {
                      unreadWorkoutIds.add(data.workout_id);
                    }
                  });
              }
            }

            // Update hasUnreadMessages for each item based on batched query results
            queueItems.forEach((item) => {
              item.hasUnreadMessages = unreadWorkoutIds.has(item.workoutId);
            });
          } catch (err) {
            // Ignore errors checking unread status, keep default false
            // This is non-critical - unread status is a nice-to-have feature
            // Log error but don't break the certification queue display
            const errorMsg = getErrorLogMessage(err);
            // Only log in development to avoid console spam in production
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "Error checking unread messages (non-critical, continuing):",
                errorMsg
              );
            }
          }
        }

        setItems(queueItems);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(
          "Error fetching certification queue:",
          getErrorLogMessage(err)
        );
        setError("Failed to load certification queue");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, refreshTrigger]);

  return { items, loading, error, refresh };
}

// ============================================
// useCertificationActions - Actions with loading states
// ============================================

interface UseCertificationActionsReturn {
  submit: (
    workoutId: string,
    questionnaire: CertificationQuestionnaire
  ) => Promise<{ success: boolean; error?: string }>;
  sendMessage: (
    workoutId: string,
    message: string
  ) => Promise<{ success: boolean; error?: string }>;
  cancel: (workoutId: string) => Promise<{ success: boolean; error?: string }>;
  markRead: (workoutId: string) => Promise<void>;
  isSubmitting: boolean;
  isSending: boolean;
  isCancelling: boolean;
}

/**
 * Hook providing certification actions with loading states.
 */
export function useCertificationActions(): UseCertificationActionsReturn {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const submit = useCallback(
    async (workoutId: string, questionnaire: CertificationQuestionnaire) => {
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      setIsSubmitting(true);
      try {
        const result = await CertificationService.submitForCertification(
          workoutId,
          user.uid,
          questionnaire
        );
        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  const sendMessage = useCallback(
    async (workoutId: string, message: string) => {
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      setIsSending(true);
      try {
        const result = await CertificationService.sendMessage(
          workoutId,
          user.uid,
          user.displayName || user.email || "User",
          message
        );
        return result;
      } finally {
        setIsSending(false);
      }
    },
    [user]
  );

  const cancel = useCallback(
    async (workoutId: string) => {
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      setIsCancelling(true);
      try {
        const result = await CertificationService.cancelCertification(
          workoutId,
          user.uid
        );
        return result;
      } finally {
        setIsCancelling(false);
      }
    },
    [user]
  );

  const markRead = useCallback(
    async (workoutId: string) => {
      if (!user) return;
      try {
        await CertificationService.markMessagesAsRead(workoutId, user.uid);
      } catch (error) {
        // Log error but don't throw - marking as read is non-critical
        console.error(
          "Failed to mark messages as read:",
          getErrorLogMessage(error)
        );
      }
    },
    [user]
  );

  return {
    submit,
    sendMessage,
    cancel,
    markRead,
    isSubmitting,
    isSending,
    isCancelling,
  };
}
