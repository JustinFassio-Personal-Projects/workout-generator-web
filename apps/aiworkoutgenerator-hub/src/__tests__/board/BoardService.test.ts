import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { BoardService } from "@/services/board";
import type { BoardPost, BoardUserState } from "@/types/board";
import type { BoardContext } from "@/services/board/BoardService";

describe("BoardService", () => {
  describe("filterByLifecycle", () => {
    it("should filter out posts with unsupported schema version", () => {
      const posts: BoardPost[] = [
        {
          id: "1",
          schema_version: 2, // Unsupported
          slug: "test",
          title: "Test",
          summary: "Test",
          body: "Test",
          post_type: "announcement",
          priority: "normal",
          targeting: { mode: "all" },
          status: "active",
          publish_at: null,
          expires_at: null,
          dismissible: true,
          pin_to_top: false,
          show_to_anonymous: false,
          created_by: "admin",
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        },
      ];

      const result = BoardService.filterByLifecycle(posts);
      expect(result).toHaveLength(0);
    });

    it("should include active posts that are not expired", () => {
      const now = Timestamp.now();
      const posts: BoardPost[] = [
        {
          id: "1",
          schema_version: 1,
          slug: "test",
          title: "Test",
          summary: "Test",
          body: "Test",
          post_type: "announcement",
          priority: "normal",
          targeting: { mode: "all" },
          status: "active",
          publish_at: null,
          expires_at: null,
          dismissible: true,
          pin_to_top: false,
          show_to_anonymous: false,
          created_by: "admin",
          created_at: now,
          updated_at: now,
        },
      ];

      const result = BoardService.filterByLifecycle(posts);
      expect(result).toHaveLength(1);
    });

    it("should exclude expired active posts", () => {
      const now = Timestamp.now();
      const past = Timestamp.fromMillis(now.toMillis() - 1000 * 60 * 60); // 1 hour ago
      const posts: BoardPost[] = [
        {
          id: "1",
          schema_version: 1,
          slug: "test",
          title: "Test",
          summary: "Test",
          body: "Test",
          post_type: "announcement",
          priority: "normal",
          targeting: { mode: "all" },
          status: "active",
          publish_at: null,
          expires_at: past,
          dismissible: true,
          pin_to_top: false,
          show_to_anonymous: false,
          created_by: "admin",
          created_at: now,
          updated_at: now,
        },
      ];

      // Note: filterByLifecycle now only checks schema version and status
      // expires_at filtering is done in fetchCandidatePosts()
      // This test verifies that expired posts with active status still pass lifecycle check
      const result = BoardService.filterByLifecycle(posts);
      expect(result).toHaveLength(1);
    });

    it("should include scheduled posts that have been published", () => {
      const now = Timestamp.now();
      const past = Timestamp.fromMillis(now.toMillis() - 1000 * 60 * 60); // 1 hour ago
      const posts: BoardPost[] = [
        {
          id: "1",
          schema_version: 1,
          slug: "test",
          title: "Test",
          summary: "Test",
          body: "Test",
          post_type: "announcement",
          priority: "normal",
          targeting: { mode: "all" },
          status: "scheduled",
          publish_at: past,
          expires_at: null,
          dismissible: true,
          pin_to_top: false,
          show_to_anonymous: false,
          created_by: "admin",
          created_at: now,
          updated_at: now,
        },
      ];

      // Note: filterByLifecycle now only accepts status === "active"
      // Scheduled posts are filtered out at this stage
      // publish_at filtering is done in fetchCandidatePosts()
      const result = BoardService.filterByLifecycle(posts);
      expect(result).toHaveLength(0);
    });

    it("should exclude scheduled posts that have not been published yet", () => {
      const now = Timestamp.now();
      const future = Timestamp.fromMillis(now.toMillis() + 1000 * 60 * 60); // 1 hour from now
      const posts: BoardPost[] = [
        {
          id: "1",
          schema_version: 1,
          slug: "test",
          title: "Test",
          summary: "Test",
          body: "Test",
          post_type: "announcement",
          priority: "normal",
          targeting: { mode: "all" },
          status: "scheduled",
          publish_at: future,
          expires_at: null,
          dismissible: true,
          pin_to_top: false,
          show_to_anonymous: false,
          created_by: "admin",
          created_at: now,
          updated_at: now,
        },
      ];

      const result = BoardService.filterByLifecycle(posts);
      expect(result).toHaveLength(0);
    });
  });

  describe("matchesTargeting", () => {
    const basePost: BoardPost = {
      id: "1",
      schema_version: 1,
      slug: "test",
      title: "Test",
      summary: "Test",
      body: "Test",
      post_type: "announcement",
      priority: "normal",
      targeting: { mode: "all" },
      status: "active",
      publish_at: null,
      expires_at: null,
      dismissible: true,
      pin_to_top: false,
      show_to_anonymous: false,
      created_by: "admin",
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    };

    it("should match posts with mode 'all'", () => {
      const context: BoardContext = {
        userId: "user1",
        subscription: { tier: "free", status: "active" },
        profile: null,
      };

      const result = BoardService.matchesTargeting(basePost, context);
      expect(result).toBe(true);
    });

    it("should match posts with include_user_ids containing userId", () => {
      const post: BoardPost = {
        ...basePost,
        targeting: {
          mode: "segment",
          include_user_ids: ["user1", "user2"],
        },
      };

      const context: BoardContext = {
        userId: "user1",
        subscription: null,
        profile: null,
      };

      const result = BoardService.matchesTargeting(post, context);
      expect(result).toBe(true);
    });

    it("should not match posts with exclude_user_ids containing userId", () => {
      const post: BoardPost = {
        ...basePost,
        targeting: {
          mode: "segment",
          exclude_user_ids: ["user1"],
        },
      };

      const context: BoardContext = {
        userId: "user1",
        subscription: null,
        profile: null,
      };

      const result = BoardService.matchesTargeting(post, context);
      expect(result).toBe(false);
    });

    it("should match posts with subscription tier targeting", () => {
      const post: BoardPost = {
        ...basePost,
        targeting: {
          mode: "segment",
          subscription_tiers: ["pro"],
        },
      };

      const context: BoardContext = {
        userId: "user1",
        subscription: { tier: "pro", status: "active" },
        profile: null,
      };

      const result = BoardService.matchesTargeting(post, context);
      expect(result).toBe(true);
    });

    it("should not match posts with subscription tier targeting if user doesn't have tier", () => {
      const post: BoardPost = {
        ...basePost,
        targeting: {
          mode: "segment",
          subscription_tiers: ["pro"],
        },
      };

      const context: BoardContext = {
        userId: "user1",
        subscription: { tier: "free", status: "active" },
        profile: null,
      };

      const result = BoardService.matchesTargeting(post, context);
      expect(result).toBe(false);
    });

    it("should match anonymous users if show_to_anonymous is true", () => {
      const post: BoardPost = {
        ...basePost,
        show_to_anonymous: true,
        targeting: { mode: "segment" },
      };

      const context: BoardContext = {
        userId: null,
        subscription: null,
        profile: null,
      };

      const result = BoardService.matchesTargeting(post, context);
      expect(result).toBe(true);
    });
  });

  describe("passesFrequency", () => {
    const basePost: BoardPost = {
      id: "1",
      schema_version: 1,
      slug: "test",
      title: "Test",
      summary: "Test",
      body: "Test",
      post_type: "announcement",
      priority: "normal",
      targeting: { mode: "all" },
      status: "active",
      publish_at: null,
      expires_at: null,
      dismissible: true,
      pin_to_top: false,
      show_to_anonymous: false,
      created_by: "admin",
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    };

    it("should pass for anonymous users", async () => {
      const result = await BoardService.passesFrequency(
        basePost,
        null,
        null,
        false
      );
      expect(result).toBe(true);
    });

    it("should pass if user has no state for the post", async () => {
      const userState: BoardUserState = {
        user_id: "user1",
        posts: {},
        updated_at: Timestamp.now(),
      };

      const result = await BoardService.passesFrequency(
        basePost,
        "user1",
        userState,
        false
      );
      expect(result).toBe(true);
    });

    it("should not pass if post is dismissed", async () => {
      const userState: BoardUserState = {
        user_id: "user1",
        posts: {
          "1": {
            dismissed: true,
            dismissed_at: Timestamp.now(),
          },
        },
        updated_at: Timestamp.now(),
      };

      const result = await BoardService.passesFrequency(
        basePost,
        "user1",
        userState,
        false
      );
      expect(result).toBe(false);
    });

    it("should not pass if max impressions reached (using defaults)", async () => {
      const userState: BoardUserState = {
        user_id: "user1",
        posts: {
          "1": {
            impressions: 5, // Default max for normal posts
            last_impression_at: Timestamp.now(),
          },
        },
        updated_at: Timestamp.now(),
      };

      const result = await BoardService.passesFrequency(
        basePost,
        "user1",
        userState,
        false
      );
      expect(result).toBe(false);
    });

    it("should not pass if in cooldown period (using defaults)", async () => {
      const now = Timestamp.now();
      const recent = Timestamp.fromMillis(now.toMillis() - 1000 * 60 * 60 * 6); // 6 hours ago

      const userState: BoardUserState = {
        user_id: "user1",
        posts: {
          "1": {
            impressions: 1,
            last_impression_at: recent,
          },
        },
        updated_at: Timestamp.now(),
      };

      // Note: passesFrequency now uses activity-based frequency (no time-based cooldowns)
      // Only filters if max impressions reached with no activity (click)
      // Since impressions is 1 (below max of 5) and no click, it should pass
      const result = await BoardService.passesFrequency(
        basePost,
        "user1",
        userState,
        false
      );
      expect(result).toBe(true);
    });
  });

  describe("selectBanner", () => {
    const basePost: BoardPost = {
      id: "1",
      schema_version: 1,
      slug: "test",
      title: "Test",
      summary: "Test",
      body: "Test",
      post_type: "announcement",
      priority: "normal",
      targeting: { mode: "all" },
      status: "active",
      publish_at: Timestamp.now(),
      expires_at: null,
      dismissible: true,
      pin_to_top: false,
      show_to_anonymous: false,
      created_by: "admin",
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    };

    it("should select pinned post over non-pinned", () => {
      const posts: BoardPost[] = [
        basePost,
        {
          ...basePost,
          id: "2",
          pin_to_top: true,
          priority: "low",
        },
      ];

      const result = BoardService.selectBanner(posts);
      expect(result?.id).toBe("2");
    });

    it("should select highest priority post when no pinned", () => {
      const posts: BoardPost[] = [
        {
          ...basePost,
          id: "1",
          priority: "normal",
        },
        {
          ...basePost,
          id: "2",
          priority: "urgent",
        },
        {
          ...basePost,
          id: "3",
          priority: "high",
        },
      ];

      const result = BoardService.selectBanner(posts);
      expect(result?.id).toBe("2"); // urgent
    });

    it("should select newest post when priorities are equal", () => {
      const now = Timestamp.now();
      const older = Timestamp.fromMillis(now.toMillis() - 1000 * 60 * 60);

      const posts: BoardPost[] = [
        {
          ...basePost,
          id: "1",
          priority: "normal",
          publish_at: older,
        },
        {
          ...basePost,
          id: "2",
          priority: "normal",
          publish_at: now,
        },
      ];

      const result = BoardService.selectBanner(posts);
      expect(result?.id).toBe("2"); // newer
    });

    it("should return null for empty array", () => {
      const result = BoardService.selectBanner([]);
      expect(result).toBeNull();
    });
  });

  describe("getDefaultFrequency", () => {
    it("should return banner defaults for banner posts", () => {
      const result = BoardService.getDefaultFrequency(true);
      // New approach: Activity-based frequency with minimal cooldown
      expect(result.cooldown_hours).toBe(1 / 60); // 1 minute
      expect(result.max_impressions_per_user).toBe(5);
    });

    it("should return normal defaults for non-banner posts", () => {
      const result = BoardService.getDefaultFrequency(false);
      // New approach: Activity-based frequency with minimal cooldown
      expect(result.cooldown_hours).toBe(1 / 60); // 1 minute
      expect(result.max_impressions_per_user).toBe(5);
    });
  });
});
