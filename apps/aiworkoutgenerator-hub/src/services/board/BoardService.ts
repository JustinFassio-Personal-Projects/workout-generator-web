import {
  collection,
  query,
  getDocs,
  onSnapshot,
  orderBy,
  where,
  limit,
  doc,
  getDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import type { BoardPost, BoardUserState } from "@/types/board";
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from "@/lib/subscription-constants";
import type { UserProfile } from "@/types/firestore";

// ============================================
// Types
// ============================================

export interface BoardBundle {
  banner: BoardPost | null;
  posts: BoardPost[];
}

export interface BoardContext {
  userId: string | null;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
  } | null;
  profile: UserProfile | null;
}

// Supported schema version
const SUPPORTED_SCHEMA_VERSION = 1;

// Priority order mapping for sorting board posts
// Higher numbers = higher priority
const PRIORITY_ORDER: Record<BoardPost["priority"], number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// ============================================
// BoardService
// ============================================

export class BoardService {
  /**
   * Check if a post is actually pinned (must be both pinned AND active)
   * Only active posts can display as pinned
   */
  static isPinned(post: BoardPost): boolean {
    return post.pin_to_top === true && post.status === "active";
  }

  /**
   * Get board user state document reference
   */
  static userStateDoc(userId: string) {
    return doc(getDbInstance(), "board_user_state", userId);
  }

  /**
   * Get board user state for a user
   */
  static async getUserState(userId: string): Promise<BoardUserState | null> {
    const snap = await getDoc(BoardService.userStateDoc(userId));
    return snap.exists() ? (snap.data() as BoardUserState) : null;
  }

  /**
   * Set up a real-time listener for candidate posts
   * Returns an unsubscribe function to stop listening
   * Note: Posts are filtered and sorted client-side after fetching
   */
  static subscribeToCandidatePosts(
    callback: (posts: BoardPost[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const db = getDbInstance();
    const postsRef = collection(db, "board_posts");
    const now = Timestamp.now();

    try {
      // Query active posts that are published
      // Filter by status and publish_at in Firestore
      // Note: This requires a Firestore index on status + publish_at
      const q = query(
        postsRef,
        where("status", "==", "active"),
        where("publish_at", "<=", now),
        orderBy("publish_at", "desc"),
        limit(100)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const posts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as BoardPost[];

          // Filter expires_at client-side (handles null/undefined)
          const activePosts = posts.filter((post) => {
            if (!post.expires_at) return true; // No expiration
            const expiresTime =
              post.expires_at.toMillis?.() ||
              (post.expires_at.seconds || 0) * 1000;
            return expiresTime > now.toMillis();
          });

          // Sort by pin_to_top and priority client-side
          // (Firestore can't sort enum strings meaningfully, and we want pinned first)
          const sorted = activePosts.sort((a, b) => {
            // First: validated pinned status (pinned posts first)
            const aPinned = BoardService.isPinned(a);
            const bPinned = BoardService.isPinned(b);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;

            // Second: priority (urgent > high > normal > low)
            const priorityDiff =
              PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Third: publish_at (newest first - already sorted by Firestore, but maintain order)
            const aTime =
              a.publish_at?.toMillis?.() ||
              (a.publish_at?.seconds || 0) * 1000 ||
              0;
            const bTime =
              b.publish_at?.toMillis?.() ||
              (b.publish_at?.seconds || 0) * 1000 ||
              0;
            return bTime - aTime;
          });

          // Log for debugging (only in development)
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[BoardService] Real-time update: ${posts.length} candidate posts from Firestore, ${activePosts.length} after expires_at filter, ${sorted.length} after sorting`
            );
          }

          callback(sorted);
        },
        (error) => {
          console.error("[BoardService] Error in real-time listener:", error);
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      );
    } catch (error) {
      // If query fails (e.g., missing index), try fallback
      console.error(
        "[BoardService] Error setting up real-time listener, trying fallback:",
        error
      );

      // Fallback: query without filters, filter client-side
      try {
        const fallbackQuery = query(
          postsRef,
          orderBy("publish_at", "desc"),
          limit(100)
        );

        return onSnapshot(
          fallbackQuery,
          (snapshot) => {
            const posts = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as BoardPost[];

            // Filter client-side
            const now = Timestamp.now();
            const filtered = posts.filter((post) => {
              if (post.status !== "active") return false;
              if (post.publish_at && post.publish_at > now) return false;
              if (post.expires_at) {
                const expiresTime =
                  post.expires_at.toMillis?.() ||
                  (post.expires_at.seconds || 0) * 1000;
                if (expiresTime <= now.toMillis()) return false;
              }
              return true;
            });

            // Sort client-side
            const sorted = filtered.sort((a, b) => {
              // First: validated pinned status (pinned posts first)
              const aPinned = BoardService.isPinned(a);
              const bPinned = BoardService.isPinned(b);
              if (aPinned && !bPinned) return -1;
              if (!aPinned && bPinned) return 1;

              // Second: priority (urgent > high > normal > low)
              const priorityDiff =
                PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
              if (priorityDiff !== 0) return priorityDiff;
              // Third: publish_at (newest first)
              const aTime =
                a.publish_at?.toMillis?.() ||
                (a.publish_at?.seconds || 0) * 1000 ||
                0;
              const bTime =
                b.publish_at?.toMillis?.() ||
                (b.publish_at?.seconds || 0) * 1000 ||
                0;
              return bTime - aTime;
            });

            if (process.env.NODE_ENV === "development") {
              console.log(
                `[BoardService] Real-time update (fallback): ${posts.length} posts fetched, ${filtered.length} after client-side filter, ${sorted.length} after client-side sort`
              );
            }

            callback(sorted);
          },
          (error) => {
            console.error(
              "[BoardService] Error in fallback real-time listener:",
              error
            );
            if (onError) {
              onError(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          }
        );
      } catch (fallbackError) {
        console.error(
          "[BoardService] Fallback listener setup also failed:",
          fallbackError
        );
        if (onError) {
          onError(
            fallbackError instanceof Error
              ? fallbackError
              : new Error(String(fallbackError))
          );
        }
        // Return a no-op unsubscribe function
        return () => {};
      }
    }
  }

  /**
   * Fetch candidate posts from Firestore
   * Returns recent posts ordered by publish_at desc (limited to 50-100)
   * Note: Posts without publish_at will be included but may be filtered out later
   */
  static async fetchCandidatePosts(): Promise<BoardPost[]> {
    const db = getDbInstance();
    const postsRef = collection(db, "board_posts");
    const now = Timestamp.now();

    try {
      // Query active posts that are published
      // Filter by status and publish_at in Firestore
      // Note: This requires a Firestore index on status + publish_at
      const q = query(
        postsRef,
        where("status", "==", "active"),
        where("publish_at", "<=", now),
        orderBy("publish_at", "desc"),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BoardPost[];

      // Filter expires_at client-side (handles null/undefined)
      const activePosts = posts.filter((post) => {
        if (!post.expires_at) return true; // No expiration
        const expiresTime =
          post.expires_at.toMillis?.() || (post.expires_at.seconds || 0) * 1000;
        return expiresTime > now.toMillis();
      });

      // Sort by pin_to_top and priority client-side
      // (Firestore can't sort enum strings meaningfully, and we want pinned first)
      const sorted = activePosts.sort((a, b) => {
        // First: validated pinned status (pinned active posts first)
        const aPinned = BoardService.isPinned(a);
        const bPinned = BoardService.isPinned(b);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        // Second: priority (urgent > high > normal > low)
        const priorityDiff =
          PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Third: publish_at (newest first - already sorted by Firestore, but maintain order)
        const aTime =
          a.publish_at?.toMillis?.() ||
          (a.publish_at?.seconds || 0) * 1000 ||
          0;
        const bTime =
          b.publish_at?.toMillis?.() ||
          (b.publish_at?.seconds || 0) * 1000 ||
          0;
        return bTime - aTime;
      });

      // Log for debugging (only in development)
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[BoardService] Fetched ${posts.length} candidate posts from Firestore, ${activePosts.length} after expires_at filter, ${sorted.length} after sorting`
        );
      }

      return sorted;
    } catch (error) {
      // If query fails (e.g., missing index), try fallback without filters
      console.error(
        "[BoardService] Error with optimized query, trying fallback:",
        error
      );
      try {
        // Fallback: query without filters, filter client-side
        const fallbackQuery = query(
          postsRef,
          orderBy("publish_at", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(fallbackQuery);
        const posts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as BoardPost[];

        // Filter client-side
        const now = Timestamp.now();
        const filtered = posts.filter((post) => {
          if (post.status !== "active") return false;
          if (post.publish_at && post.publish_at > now) return false;
          if (post.expires_at) {
            const expiresTime =
              post.expires_at.toMillis?.() ||
              (post.expires_at.seconds || 0) * 1000;
            if (expiresTime <= now.toMillis()) return false;
          }
          return true;
        });

        // Sort client-side
        filtered.sort((a, b) => {
          // First: validated pinned status (pinned active posts first)
          const aPinned = BoardService.isPinned(a);
          const bPinned = BoardService.isPinned(b);
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          // Second: priority
          const priorityDiff =
            PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          // Third: publish_at
          const aTime =
            a.publish_at?.toMillis?.() ||
            (a.publish_at?.seconds || 0) * 1000 ||
            0;
          const bTime =
            b.publish_at?.toMillis?.() ||
            (b.publish_at?.seconds || 0) * 1000 ||
            0;
          return bTime - aTime;
        });

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[BoardService] Fetched ${posts.length} posts using fallback query, ${filtered.length} after filtering`
          );
        }

        return filtered;
      } catch (fallbackError) {
        console.error(
          "[BoardService] Fallback query also failed:",
          fallbackError
        );
        throw fallbackError;
      }
    }
  }

  /**
   * Fetch a single post by ID (for detail pages)
   * Bypasses frequency filters - allows access to posts even if filtered from bundle
   */
  static async getPostById(postId: string): Promise<BoardPost | null> {
    // Validate postId parameter
    if (!postId || typeof postId !== "string" || postId.trim().length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[BoardService] getPostById: Invalid postId parameter:`,
          postId
        );
      }
      throw new Error("Invalid post ID parameter");
    }

    const db = getDbInstance();
    const postRef = doc(db, "board_posts", postId);

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[BoardService] getPostById: Querying Firestore for post ID "${postId}"`
        );
      }

      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[BoardService] getPostById: Document does not exist with ID "${postId}"`
          );
        }
        return null;
      }

      const postData = postSnap.data();
      const post = {
        id: postSnap.id,
        ...postData,
      } as BoardPost;

      if (process.env.NODE_ENV === "development") {
        console.log(`[BoardService] getPostById: Document found`, {
          id: post.id,
          title: post.title,
          status: post.status,
          schema_version: post.schema_version,
          hasBody: !!post.body,
          bodyLength: post.body?.length || 0,
          publish_at: post.publish_at?.toDate?.()?.toISOString() || "not set",
          expires_at: post.expires_at?.toDate?.()?.toISOString() || "not set",
        });
      }

      // Validate schema version
      if (post.schema_version !== SUPPORTED_SCHEMA_VERSION) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[BoardService] getPostById: Post has unsupported schema version ${post.schema_version} (expected ${SUPPORTED_SCHEMA_VERSION})`
          );
        }
        return null;
      }

      // Only return active posts (but don't check frequency - allow access to filtered posts)
      if (post.status !== "active") {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[BoardService] getPostById: Post status is "${post.status}", not "active"`
          );
        }
        return null;
      }

      // Check publish_at and expires_at
      const now = Timestamp.now();
      if (post.publish_at) {
        const publishTime =
          post.publish_at.toMillis?.() || (post.publish_at.seconds || 0) * 1000;
        if (publishTime > now.toMillis()) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[BoardService] getPostById: Post not published yet (publish_at: ${new Date(publishTime).toISOString()}, now: ${new Date(now.toMillis()).toISOString()})`
            );
          }
          return null; // Not published yet
        }
      }

      if (post.expires_at) {
        const expiresTime =
          post.expires_at.toMillis?.() || (post.expires_at.seconds || 0) * 1000;
        if (expiresTime <= now.toMillis()) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[BoardService] getPostById: Post has expired (expires_at: ${new Date(expiresTime).toISOString()}, now: ${new Date(now.toMillis()).toISOString()})`
            );
          }
          return null; // Expired
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[BoardService] getPostById: Post passed all validation checks`
        );
      }

      return post;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[BoardService] Error fetching post by ID:", error);

      if (process.env.NODE_ENV === "development") {
        console.error("[BoardService] Error details:", {
          postId,
          error: errorMessage,
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      // Re-throw to allow caller to handle different error types
      throw error;
    }
  }

  /**
   * Fetch a single post by slug (for detail pages)
   * Bypasses frequency filters - allows access to posts even if filtered from bundle
   */
  static async getPostBySlug(slug: string): Promise<BoardPost | null> {
    const db = getDbInstance();
    const postsRef = collection(db, "board_posts");

    try {
      // Query for post by slug
      const q = query(postsRef, where("slug", "==", slug), limit(1));

      const snapshot = await getDocs(q);

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[BoardService] getPostBySlug: Query for slug "${slug}" returned ${snapshot.size} documents`
        );
      }

      if (snapshot.empty) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[BoardService] getPostBySlug: No post found with slug "${slug}"`
          );
        }
        return null;
      }

      const post = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as BoardPost;

      if (process.env.NODE_ENV === "development") {
        console.log(`[BoardService] getPostBySlug: Found post`, {
          id: post.id,
          slug: post.slug,
          title: post.title,
          status: post.status,
          schema_version: post.schema_version,
          hasBody: !!post.body,
          bodyLength: post.body?.length || 0,
        });
      }

      // Validate schema version
      if (post.schema_version !== SUPPORTED_SCHEMA_VERSION) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[BoardService] getPostBySlug: Post has unsupported schema version ${post.schema_version}`
          );
        }
        return null;
      }

      // Only return active posts (but don't check frequency - allow access to filtered posts)
      if (post.status !== "active") {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[BoardService] getPostBySlug: Post status is "${post.status}", not "active"`
          );
        }
        return null;
      }

      // Check publish_at and expires_at
      const now = Timestamp.now();
      if (post.publish_at && post.publish_at > now) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[BoardService] getPostBySlug: Post not published yet`);
        }
        return null; // Not published yet
      }
      if (post.expires_at) {
        const expiresTime =
          post.expires_at.toMillis?.() || (post.expires_at.seconds || 0) * 1000;
        if (expiresTime <= now.toMillis()) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[BoardService] getPostBySlug: Post has expired`);
          }
          return null; // Expired
        }
      }

      return post;
    } catch (error) {
      console.error("[BoardService] Error fetching post by slug:", error);
      if (process.env.NODE_ENV === "development") {
        console.error("[BoardService] Error details:", {
          slug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }

  /**
   * Filter posts by lifecycle (schema version and status validation)
   * Note: publish_at and expires_at filtering is now done in fetchCandidatePosts()
   */
  static filterByLifecycle(posts: BoardPost[]): BoardPost[] {
    return posts.filter((post) => {
      // Schema version check
      if (post.schema_version !== SUPPORTED_SCHEMA_VERSION) {
        return false;
      }

      // Status check (redundant with query, but safe for data integrity)
      if (post.status !== "active") {
        return false;
      }

      // Note: publish_at and expires_at are now filtered in fetchCandidatePosts()
      // This method now only validates schema and status for safety
      return true;
    });
  }

  /**
   * Check if a post matches targeting criteria
   */
  static matchesTargeting(post: BoardPost, context: BoardContext): boolean {
    const { userId, subscription, profile } = context;
    const { targeting } = post;

    // Schema version check (already done in lifecycle, but double-check)
    if (post.schema_version !== SUPPORTED_SCHEMA_VERSION) {
      return false;
    }

    // Mode: "all" means no filtering
    if (targeting.mode === "all") {
      return true;
    }

    // Anonymous users
    if (!userId) {
      return post.show_to_anonymous === true;
    }

    // Explicit include/exclude user IDs (highest priority)
    if (targeting.include_user_ids && targeting.include_user_ids.length > 0) {
      return targeting.include_user_ids.includes(userId);
    }
    if (targeting.exclude_user_ids && targeting.exclude_user_ids.length > 0) {
      if (targeting.exclude_user_ids.includes(userId)) {
        return false;
      }
    }

    // Subscription targeting
    if (
      targeting.subscription_tiers &&
      targeting.subscription_tiers.length > 0
    ) {
      if (!subscription) {
        return false; // Required subscription but user has none
      }
      if (!targeting.subscription_tiers.includes(subscription.tier)) {
        return false; // User's tier not in allowed list
      }
    }
    if (
      targeting.subscription_status &&
      targeting.subscription_status.length > 0
    ) {
      if (!subscription) {
        return false; // Required status but user has none
      }
      if (!targeting.subscription_status.includes(subscription.status)) {
        return false; // User's status not in allowed list
      }
    }

    // Profile targeting
    if (targeting.fitness_levels && targeting.fitness_levels.length > 0) {
      if (!profile) {
        return false; // Required fitness level but user has no profile
      }
      if (!targeting.fitness_levels.includes(profile.fitness_level)) {
        return false; // User's fitness level not in allowed list
      }
    }
    if (targeting.equipment_access && targeting.equipment_access.length > 0) {
      if (!profile) {
        return false; // Required equipment access but user has no profile
      }
      // equipment_access is now string[] - check if any category matches
      const profileCategories = Array.isArray(profile.equipment_access)
        ? profile.equipment_access
        : [];
      const hasMatchingCategory = profileCategories.some((cat) =>
        targeting.equipment_access?.includes(cat)
      );
      if (!hasMatchingCategory) {
        return false; // User's equipment categories don't match targeting
      }
    }

    return true;
  }

  /**
   * Get default frequency settings based on post type
   *
   * @param isBanner - Whether this is a banner post
   * @returns Frequency settings with cooldown_hours and max_impressions_per_user
   *
   * @remarks
   * The `cooldown_hours` parameter uses fractional hours to represent time periods:
   * - 1/60 = 1 minute
   * - 1 = 1 hour
   * - 24 = 24 hours
   *
   * This naming convention is maintained for backward compatibility with existing
   * database schema and API contracts. The parameter name may be misleading when
   * using fractional values, but the behavior is well-documented.
   */
  static getDefaultFrequency(isBanner: boolean): {
    cooldown_hours: number;
    max_impressions_per_user: number;
  } {
    // New approach: Activity-based frequency
    // - Max impressions: 5 views
    // - Minimal cooldown: 1 minute (prevents rapid-fire impressions, not a real limit)
    // - Activity (click) resets the limit
    // Note: cooldown_hours uses fractional hours (1/60 = 1 minute, 1 = 1 hour, 24 = 24 hours)
    if (isBanner) {
      return {
        cooldown_hours: 1 / 60, // 1 minute (fractional hours: 1/60)
        max_impressions_per_user: 5,
      };
    }
    return {
      cooldown_hours: 1 / 60, // 1 minute (fractional hours: 1/60)
      max_impressions_per_user: 5,
    };
  }

  /**
   * Check if a post passes frequency and dismissal checks
   * SIMPLIFIED: Only filter if explicitly dismissed. Frequency checks are lenient.
   */
  static async passesFrequency(
    post: BoardPost,
    userId: string | null,
    userState: BoardUserState | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _isBanner: boolean = false // Kept for API consistency, not currently used
  ): Promise<boolean> {
    if (!userId) {
      // Anonymous users: always show
      return true;
    }

    const postState = userState?.posts[post.id];

    // Check dismissed - ONLY filter if explicitly dismissed
    if (post.dismissible && postState?.dismissed) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[BoardService] Post ${post.id}: Filtered - dismissed`);
      }
      return false;
    }

    // Activity-based frequency: Only hide if user has seen it 5+ times with NO activity (click)
    // If user clicked, always allow showing (activity resets)
    if (postState) {
      // If user has clicked, always show (activity resets the limit)
      if (postState.clicked) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[BoardService] Post ${post.id}: Passes - user has activity (clicked)`
          );
        }
        return true;
      }

      // Only check max impressions if no activity
      const maxImpressions = post.frequency?.max_impressions_per_user ?? 5;
      const currentImpressions = postState.impressions || 0;

      if (currentImpressions >= maxImpressions) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[BoardService] Post ${post.id}: Filtered - max impressions (${currentImpressions}/${maxImpressions}) with no activity`
          );
        }
        return false; // Max impressions reached with no activity
      }
    }

    // Default: show the post
    if (process.env.NODE_ENV === "development") {
      console.log(`[BoardService] Post ${post.id}: Passes frequency check`);
    }
    return true;
  }

  /**
   * Select banner post from eligible posts
   * Priority: pinned active posts > priority (urgent > high > normal > low) > newest
   */
  static selectBanner(posts: BoardPost[]): BoardPost | null {
    if (posts.length === 0) {
      return null;
    }

    // Find validated pinned posts (must be both pinned AND active)
    const pinnedPosts = posts.filter((post) => BoardService.isPinned(post));
    if (pinnedPosts.length > 0) {
      // If multiple pinned, pick newest
      pinnedPosts.sort((a, b) => {
        const aTime =
          a.publish_at?.toMillis?.() ||
          (a.publish_at?.seconds || 0) * 1000 ||
          0;
        const bTime =
          b.publish_at?.toMillis?.() ||
          (b.publish_at?.seconds || 0) * 1000 ||
          0;
        return bTime - aTime;
      });
      return pinnedPosts[0] || null;
    }

    // Priority order: urgent > high > normal > low
    // Sort by priority desc, then by publish_at desc
    const sorted = [...posts].sort((a, b) => {
      const priorityDiff =
        PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // Same priority: newest first
      const aTime =
        a.publish_at?.toMillis?.() || (a.publish_at?.seconds || 0) * 1000 || 0;
      const bTime =
        b.publish_at?.toMillis?.() || (b.publish_at?.seconds || 0) * 1000 || 0;
      return bTime - aTime;
    });

    return sorted[0] || null;
  }

  /**
   * Process candidate posts for the board page (no targeting/frequency filters)
   */
  static processAllPostsForBoard(candidatePosts: BoardPost[]): BoardPost[] {
    // Filter by lifecycle (schema version and status validation)
    const lifecyclePosts = BoardService.filterByLifecycle(candidatePosts);

    // NO targeting filter - show all posts regardless of subscription, user IDs, etc.
    // NO frequency filter - show all posts regardless of impressions/cooldown
    // Only expiration is checked (already done in fetchCandidatePosts)

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[BoardService] getAllPostsForBoard: Returning ${lifecyclePosts.length} posts (no targeting/frequency filters)`
      );
    }

    // Sort by pin_to_top, priority, and publish_at
    const sorted = lifecyclePosts.sort((a, b) => {
      // First: validated pinned status (pinned active posts first)
      const aPinned = BoardService.isPinned(a);
      const bPinned = BoardService.isPinned(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      // Second: priority (urgent > high > normal > low)
      const priorityDiff =
        PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Third: publish_at (newest first)
      const aTime =
        a.publish_at?.toMillis?.() || (a.publish_at?.seconds || 0) * 1000 || 0;
      const bTime =
        b.publish_at?.toMillis?.() || (b.publish_at?.seconds || 0) * 1000 || 0;
      return bTime - aTime;
    });

    return sorted;
  }

  /**
   * Get all posts for the board page (bypasses targeting and frequency filters)
   */
  static async getAllPostsForBoard(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: BoardContext // Kept for API consistency, not currently used
  ): Promise<BoardPost[]> {
    // Fetch candidate posts (already filters by status="active", publish_at, expires_at)
    const candidatePosts = await BoardService.fetchCandidatePosts();

    // Process posts (no targeting/frequency filters)
    return BoardService.processAllPostsForBoard(candidatePosts);
  }

  /**
   * Process candidate posts into a board bundle for a user
   * This method applies targeting and frequency filters
   */
  static async processBoardBundle(
    candidatePosts: BoardPost[],
    context: BoardContext
  ): Promise<BoardBundle> {
    const { userId } = context;

    // Debug logging (development only)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[BoardService] Fetched ${candidatePosts.length} candidate posts`
      );
    }

    // Filter by lifecycle
    const lifecyclePosts = BoardService.filterByLifecycle(candidatePosts);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[BoardService] After lifecycle filter: ${lifecyclePosts.length} posts`,
        lifecyclePosts.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          schema_version: p.schema_version,
        }))
      );
    }

    // Filter by targeting
    const targetedPosts = lifecyclePosts.filter((post) =>
      BoardService.matchesTargeting(post, context)
    );

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[BoardService] After targeting filter: ${targetedPosts.length} posts`
      );
    }

    // Filter by frequency/dismissal (requires user state)
    let eligiblePosts: BoardPost[] = [];
    if (userId) {
      const userState = await BoardService.getUserState(userId);
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[BoardService] Checking frequency for ${targetedPosts.length} posts`,
          userState
            ? `(user state exists with ${Object.keys(userState.posts || {}).length} post states)`
            : "(no user state)"
        );
      }
      const frequencyChecks = await Promise.all(
        targetedPosts.map((post) =>
          BoardService.passesFrequency(post, userId, userState, false).then(
            (passes) => ({ post, passes })
          )
        )
      );
      eligiblePosts = frequencyChecks
        .filter(({ passes }) => passes)
        .map(({ post }) => post);
    } else {
      // Anonymous: no frequency checks
      eligiblePosts = targetedPosts;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[BoardService] After frequency filter: ${eligiblePosts.length} eligible posts`
      );
    }

    // Ensure minimum of 2 posts (override frequency if needed)
    const MIN_POSTS_REQUIRED = 2;
    if (
      eligiblePosts.length < MIN_POSTS_REQUIRED &&
      targetedPosts.length > eligiblePosts.length
    ) {
      // Get posts that passed targeting but failed frequency
      const frequencyFilteredPosts = targetedPosts.filter(
        (post) => !eligiblePosts.some((ep) => ep.id === post.id)
      );

      // Still respect dismissal - don't force show dismissed posts
      let availablePosts: BoardPost[];
      if (userId) {
        const userState = await BoardService.getUserState(userId);
        availablePosts = frequencyFilteredPosts.filter((post) => {
          const postState = userState?.posts[post.id];
          // Don't include dismissed posts
          return !(post.dismissible && postState?.dismissed);
        });
      } else {
        // Anonymous: all available (no dismissal state)
        availablePosts = frequencyFilteredPosts;
      }

      // Sort available posts by priority (same logic as selectBanner)
      const sortedAvailable = availablePosts.sort((a, b) => {
        // First: validated pinned status (pinned active posts first)
        const aPinned = BoardService.isPinned(a);
        const bPinned = BoardService.isPinned(b);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        // Second: priority
        const priorityDiff =
          PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Third: newest
        const aTime =
          a.publish_at?.toMillis?.() ||
          (a.publish_at?.seconds || 0) * 1000 ||
          0;
        const bTime =
          b.publish_at?.toMillis?.() ||
          (b.publish_at?.seconds || 0) * 1000 ||
          0;
        return bTime - aTime;
      });

      // Take enough to reach minimum (but don't exceed available)
      const needed = MIN_POSTS_REQUIRED - eligiblePosts.length;
      const additionalPosts = sortedAvailable.slice(0, needed);

      if (
        additionalPosts.length > 0 &&
        process.env.NODE_ENV === "development"
      ) {
        console.log(
          `[BoardService] Minimum posts override: Adding ${additionalPosts.length} post(s) to reach minimum of ${MIN_POSTS_REQUIRED}`,
          additionalPosts.map((p) => ({ id: p.id, title: p.title }))
        );
      }

      eligiblePosts = [...eligiblePosts, ...additionalPosts];
    }

    // Select banner (exclude from posts)
    // Check frequency for banner separately (with isBanner=true for defaults)
    let banner: BoardPost | null = null;
    if (userId && eligiblePosts.length > 0) {
      const userState = await BoardService.getUserState(userId);
      const bannerCandidates = BoardService.selectBanner(eligiblePosts);
      if (bannerCandidates) {
        const bannerPasses = await BoardService.passesFrequency(
          bannerCandidates,
          userId,
          userState,
          true // isBanner=true for banner defaults
        );
        if (bannerPasses) {
          banner = bannerCandidates;
        }
      }
    } else {
      banner = BoardService.selectBanner(eligiblePosts);
    }

    const posts = eligiblePosts.filter((post) => post.id !== banner?.id);

    return { banner, posts };
  }

  /**
   * Get board bundle for a user (fetches posts and processes them)
   * This is the main entry point for getting board data
   */
  static async getBoardBundleForUser(
    context: BoardContext
  ): Promise<BoardBundle> {
    // Fetch candidate posts
    const candidatePosts = await BoardService.fetchCandidatePosts();

    // Debug logging (development only)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[BoardService] Fetched ${candidatePosts.length} candidate posts`
      );
    }

    // Process into bundle
    return BoardService.processBoardBundle(candidatePosts, context);
  }
}
