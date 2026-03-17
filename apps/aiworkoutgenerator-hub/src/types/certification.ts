import type { Timestamp } from "firebase/firestore";

// Re-export certification types from firestore for convenience
export type {
  CertificationStatus,
  CertificationQuestionnaire,
} from "./firestore";

/**
 * Message sender type for certification communication.
 */
export type CertificationMessageSenderType = "user" | "trainer" | "system";

/**
 * Attachment in a certification message.
 */
export interface CertificationAttachment {
  type: "image" | "file" | "link";
  url: string;
  name?: string;
  size?: number;
}

/**
 * Message in the certification conversation between user and trainer.
 * Stored in certification_messages collection.
 */
export interface CertificationMessage {
  id: string;
  workout_id: string;
  workout_owner_id: string; // User who owns the workout (for security rules)
  sender_id: string;
  sender_type: CertificationMessageSenderType;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  attachments?: CertificationAttachment[];
  created_at: Timestamp | Date | null; // Always present in new messages; fallback to new Date() if missing (defensive)
  updated_at?: Timestamp | Date;
  read_at?: Timestamp;
  is_edited?: boolean;
}

/**
 * Summary of certification status for display in UI.
 */
export interface CertificationSummary {
  status: import("./firestore").CertificationStatus;
  requestedAt?: Date;
  assignedTrainerName?: string;
  assignedAt?: Date;
  certifiedAt?: Date;
  certificationNotes?: string;
  hasUnreadMessages?: boolean;
  messageCount?: number;
}

/**
 * Pagination cursor for certification messages.
 */
export interface CertificationMessageCursor {
  lastMessageId: string;
  lastCreatedAt: Timestamp;
}

/**
 * Result of fetching certification messages with pagination.
 */
export interface CertificationMessagesResult {
  messages: CertificationMessage[];
  hasMore: boolean;
  nextCursor?: CertificationMessageCursor;
}

/**
 * Workout item in certification queue display.
 */
export interface CertificationQueueItem {
  workoutId: string;
  workoutTitle: string;
  status: import("./firestore").CertificationStatus;
  requestedAt: Date;
  assignedTrainerName?: string;
  hasUnreadMessages: boolean;
}

/**
 * Data structure for edited workout information.
 * Used when trainers request changes to a workout.
 */
export interface EditedWorkoutData {
  description?: string;
  trainerNotes?: string;
  sections?: import("./firestore").TrainerWorkoutSection[];
}
