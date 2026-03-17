import type { Timestamp } from "firebase/firestore";
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from "@/lib/subscription-constants";
import type { FitnessLevel } from "@/types/firestore";

// ============================================
// Enums
// ============================================

export type BoardPostType =
  | "product_update"
  | "how_to"
  | "event"
  | "offer"
  | "announcement"
  | "feature"
  | "warning"
  | "tip"
  | "wod";

export type BoardPriority = "low" | "normal" | "high" | "urgent";

export type BoardStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "expired"
  | "archived";

export type BoardAccent =
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "amber"
  | "orange"
  | "dark_orange"
  | "red_orange"
  | "red"
  | "blue_1"
  | "blue_2"
  | "blue_3"
  | "blue_4"
  | "blue_5";

export type BoardIconKey =
  | "bell"
  | "sparkles"
  | "calendar"
  | "tag"
  | "megaphone"
  | "info"
  | "check"
  | "alert";

export type BoardEventType = "impression" | "click" | "dismiss";

export type BoardSurface = "banner" | "section" | "feed" | "detail";

// ============================================
// Targeting & Frequency
// ============================================

export interface BoardTargeting {
  mode: "all" | "segment";

  // Subscription targeting
  subscription_tiers?: SubscriptionTier[];
  subscription_status?: SubscriptionStatus[];

  // Profile targeting (v1)
  fitness_levels?: FitnessLevel[];
  equipment_access?: string[]; // Changed from EquipmentAccess[] to string[] categories

  // Explicit allow/deny
  include_user_ids?: string[];
  exclude_user_ids?: string[];
}

export interface BoardFrequency {
  // Stop showing after N impressions per user
  max_impressions_per_user?: number; // e.g., 3

  // Cooldown between impressions in hours (supports fractional values, e.g., 1/60 for 1 minute, 24 for 24 hours)
  cooldown_hours?: number; // e.g., 24 (hours) or 1/60 (1 minute)
}

// ============================================
// Board Post
// ============================================

export interface BoardPost {
  id: string;

  // Schema versioning (prevent drift between repos)
  schema_version: number;

  // Content
  slug: string; // stable identifier for deep links
  title: string;
  summary: string; // short card copy (avoid truncating markdown)
  body: string; // Markdown supported
  post_type: BoardPostType;
  priority: BoardPriority;

  // Visual (semantic tokens only - no Tailwind classes)
  icon_key?: BoardIconKey;
  accent?: BoardAccent;

  // CTA
  cta_text?: string;
  cta_url?: string; // internal or external

  // Targeting
  targeting: BoardTargeting;

  // Scheduling / lifecycle
  status: BoardStatus;
  publish_at: Timestamp | null;
  expires_at: Timestamp | null;

  // Behavior
  dismissible: boolean;
  pin_to_top: boolean; // only one pinned active at a time for banner usage
  show_to_anonymous: boolean; // default false; mostly for marketing site

  // Frequency controls
  frequency?: BoardFrequency;

  // Metadata
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// User State (per-user interaction state)
// ============================================

export interface BoardPostUserState {
  dismissed?: boolean;
  dismissed_at?: Timestamp;

  impressions?: number;
  last_impression_at?: Timestamp;

  clicked?: boolean;
  last_click_at?: Timestamp;
}

export interface BoardUserState {
  user_id: string;

  // Per-post user state
  posts: Record<string, BoardPostUserState>;

  updated_at: Timestamp;
}

// ============================================
// Events (analytics)
// ============================================

export interface BoardEvent {
  post_id: string;
  user_id: string | null; // null for anonymous
  event_type: BoardEventType;
  surface: BoardSurface;
  created_at: Timestamp;

  // Optional useful metadata (attached server-side)
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  fitness_level?: FitnessLevel;
  equipment_access?: string[]; // Changed from EquipmentAccess to string[] categories
}
