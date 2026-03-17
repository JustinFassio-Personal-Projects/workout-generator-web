// ============================================
// Support Request Types
// ============================================

export type SupportRequestType =
  | "workout_feedback"
  | "bug"
  | "billing"
  | "feature"
  | "coaching"
  | "question";

export type SupportImpact = "blocked" | "major" | "minor";

export type DeviceType = "mobile" | "desktop" | "tablet";

// ============================================
// Flow-Specific Data Types
// ============================================

export interface WorkoutFeedbackData {
  workoutId?: string;
  intensity?: "too_easy" | "right" | "too_hard" | "unsure";
  timeFit?: "too_short" | "right" | "too_long";
  mismatchTags?: string[];
  goal?: string;
  winConditions?: string[];
  freeText?: string;
  followUpOk?: boolean;
}

export interface BugReportData {
  whatHappened: string;
  stepsToReproduce: string;
  expectedVsActual: string;
}

export interface BillingData {
  issueType: "upgrade_downgrade" | "charges" | "cancellations" | "receipts";
  description: string;
}

export interface FeatureIdeaData {
  featureName: string;
  whyHelpful: string;
}

export interface CoachingData {
  whatNeedHelpWith: string;
  currentChallenges: string;
}

export interface QuestionData {
  topic: string;
  question: string;
}

// ============================================
// Context Types
// ============================================

export interface SupportRequestContext {
  app: string;
  route?: string;
  url?: string;
  userAgent?: string;
  locale?: string;
  timezone?: string;
  timestampClient?: string;
  workoutId?: string;
  workoutCreatedAt?: string;
  generatorInputs?: {
    goal?: string;
    equipment?: string[];
    duration?: number;
    split?: string;
    constraints?: string[];
  };
  workoutSummary?: Record<string, unknown>;
}

// ============================================
// Discriminated Union for Support Requests
// ============================================

export interface BaseSupportRequest {
  type: SupportRequestType;
  impact: SupportImpact;
  user_id: string;
  subject?: string; // Optional: can be derived from type selection
  context?: SupportRequestContext;
  metadata?: {
    source?: "website";
    source_url?: string;
    device_type?: DeviceType;
    subscription_tier?: string;
    utm_params?: Record<string, string>;
  };
  website?: string; // Honeypot
}

export interface WorkoutFeedbackRequest extends BaseSupportRequest {
  type: "workout_feedback";
  workoutFeedback: WorkoutFeedbackData;
}

export interface BugReportRequest extends BaseSupportRequest {
  type: "bug";
  bugReport: BugReportData;
}

export interface BillingRequest extends BaseSupportRequest {
  type: "billing";
  billing: BillingData;
}

export interface FeatureIdeaRequest extends BaseSupportRequest {
  type: "feature";
  feature: FeatureIdeaData;
}

export interface CoachingRequest extends BaseSupportRequest {
  type: "coaching";
  coaching: CoachingData;
}

export interface QuestionRequest extends BaseSupportRequest {
  type: "question";
  question: QuestionData;
}

export type CreateSupportTicketRequest =
  | WorkoutFeedbackRequest
  | BugReportRequest
  | BillingRequest
  | FeatureIdeaRequest
  | CoachingRequest
  | QuestionRequest;

// ============================================
// Response Types
// ============================================

export interface CreateSupportTicketResponse {
  success: boolean;
  ticketId?: string;
  error?: string;
  retryAfter?: number; // For rate limiting (in seconds)
}

// ============================================
// Legacy Types (for backward compatibility during migration)
// ============================================

export type SupportTicketCategory =
  | "billing"
  | "technical"
  | "feature_request"
  | "bug"
  | "other";

export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";

// Legacy request interface (for backward compatibility)
export interface LegacyCreateSupportTicketRequest {
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  user_id: string;
  metadata?: {
    source?: "website";
    source_url?: string;
    device_type?: DeviceType;
    subscription_tier?: string;
    utm_params?: Record<string, string>;
  };
  website?: string; // Honeypot
}
