/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitForCertification,
  getCertificationStatus,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getCertifiedVersion,
  getUserCertificationQueue,
  cancelCertification,
} from "./CertificationService";
import type { CertificationQuestionnaire } from "@/types/firestore";

// Mock Firebase Firestore functions
vi.mock("firebase/firestore", () => {
  const mockDocRef = { type: "document", id: "mock-doc-ref" };
  const mockCollectionRef = { type: "collection" };
  const mockQueryRef = { type: "query" };
  return {
    collection: vi.fn(() => mockCollectionRef),
    query: vi.fn(() => mockQueryRef),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    getDocs: vi.fn(),
    doc: vi.fn(() => mockDocRef),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    addDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({
      _seconds: 1234567890,
      _nanoseconds: 0,
    })),
    runTransaction: vi.fn(),
  };
});

// Mock the firestore instance getter
vi.mock("@/lib/firestore", () => ({
  getDbInstance: vi.fn(() => ({ type: "firestore" })),
}));

describe("CertificationService", () => {
  const mockUserId = "test-user-123";
  const mockWorkoutId = "workout-123";
  const mockQuestionnaire: CertificationQuestionnaire = {
    primary_hesitation: "sanity_check",
    ai_hallucination_report: "The AI suggested a weird exercise variation",
    logic_errors: [
      "No Logic Errors: The logistics look accurate to my profile",
    ],
    pacing_assessment: "feasible",
    visual_flags: ["Visuals look accurate"],
    visual_correction_request: "None needed",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitForCertification", () => {
    it("should submit workout for certification with valid data", async () => {
      const { getDoc, updateDoc, setDoc, doc, collection } =
        await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "none",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      // Mock getDoc twice: once for submitForCertification, once for createSystemMessageIdempotent
      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockSnapshot as any) // Workout check in submitForCertification
        .mockResolvedValueOnce(mockSnapshot as any); // Workout validation in createSystemMessageIdempotent
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      // Mock setDoc for system message creation
      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(doc).mockReturnValue({
        id: "sys-msg-123",
        type: "document",
      } as any);

      const result = await submitForCertification(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );

      expect(result.success).toBe(true);
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "trainer_workouts",
        mockWorkoutId
      );
      expect(updateDoc).toHaveBeenCalled();
      expect(collection).toHaveBeenCalled();
      // Verify workout was checked twice: once in submitForCertification, once in createSystemMessageIdempotent
      expect(getDoc).toHaveBeenCalledTimes(2);
      // Verify system message was created (no duplicate found)
      expect(setDoc).toHaveBeenCalled();
    });

    it("should not create duplicate system message if one already exists", async () => {
      const { getDoc, updateDoc, setDoc, doc, collection } =
        await import("firebase/firestore");

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "none",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      // Mock getDoc twice: once for submitForCertification, once for createSystemMessageIdempotent
      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockSnapshot as any) // Workout check in submitForCertification
        .mockResolvedValueOnce(mockSnapshot as any); // Workout validation in createSystemMessageIdempotent
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      // Mock setDoc to throw "already exists" error (duplicate found)
      // This simulates the idempotency check - document already exists
      const alreadyExistsError = new Error(
        "Document already exists: projects/test/databases/(default)/documents/certification_messages/sys-abc123"
      );
      (alreadyExistsError as any).code = "already-exists";
      vi.mocked(setDoc).mockRejectedValue(alreadyExistsError);

      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(doc).mockReturnValue({
        id: "sys-msg-123",
        type: "document",
      } as any);

      const result = await submitForCertification(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );

      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
      // Verify workout was checked twice: once in submitForCertification, once in createSystemMessageIdempotent
      expect(getDoc).toHaveBeenCalledTimes(2);
      // Verify setDoc was attempted (duplicate detected via "already exists" error)
      expect(setDoc).toHaveBeenCalled();
    });

    it("should handle race condition where setDoc throws 'already exists' error", async () => {
      const { getDoc, updateDoc, setDoc, doc, collection } =
        await import("firebase/firestore");

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "none",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      // Mock getDoc twice: once for submitForCertification, once for createSystemMessageIdempotent
      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockSnapshot as any) // Workout check in submitForCertification
        .mockResolvedValueOnce(mockSnapshot as any); // Workout validation in createSystemMessageIdempotent
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      // Mock setDoc to throw "already exists" error (race condition scenario)
      // This happens when another request creates the document between getDoc and setDoc
      const alreadyExistsError = new Error(
        "Document already exists: projects/test/databases/(default)/documents/certification_messages/sys-abc123"
      );
      vi.mocked(setDoc).mockRejectedValue(alreadyExistsError);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(doc).mockReturnValue({
        id: "sys-msg-123",
        type: "document",
      } as any);

      const result = await submitForCertification(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );

      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
      // Verify workout was checked twice: once in submitForCertification, once in createSystemMessageIdempotent
      expect(getDoc).toHaveBeenCalledTimes(2);
      // Verify setDoc was attempted (race condition occurred)
      expect(setDoc).toHaveBeenCalled();
      // Verify the error was handled gracefully (no exception thrown, submission succeeded)
    });

    it("should reject if workout does not exist", async () => {
      const { getDoc } = await import("firebase/firestore");
      // Clear any previous mocks
      vi.mocked(getDoc).mockClear();
      const mockSnapshot = {
        exists: () => false,
        data: () => null,
      };
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await submitForCertification(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Workout not found");
    });

    it("should reject if user does not own the workout", async () => {
      const { getDoc } = await import("firebase/firestore");
      // Clear any previous mocks
      vi.mocked(getDoc).mockClear();
      const mockWorkoutData = {
        user_id: "different-user",
        certification_status: "none",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await submitForCertification(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("You do not own this workout");
    });

    it("should reject if workout already submitted", async () => {
      const { getDoc } = await import("firebase/firestore");
      // Clear any previous mocks
      vi.mocked(getDoc).mockClear();
      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "pending",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await submitForCertification(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Workout already submitted for certification");
    });
  });

  describe("getCertificationStatus", () => {
    it("should return certification status when workout exists", async () => {
      const { getDoc, doc } = await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      // Clear any previous mocks
      vi.mocked(getDoc).mockClear();

      const mockWorkoutData = {
        certification_status: "pending",
        certification_requested_at: {
          toDate: () => new Date("2025-01-01"),
        },
        assigned_trainer_name: "Trainer Name",
        assigned_at: {
          toDate: () => new Date("2025-01-02"),
        },
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      vi.mocked(getDoc).mockResolvedValueOnce(mockSnapshot as any);

      const result = await getCertificationStatus(mockWorkoutId);

      expect(result).not.toBeNull();
      expect(result?.status).toBe("pending");
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "trainer_workouts",
        mockWorkoutId
      );
    });

    it("should return null when workout does not exist", async () => {
      const { getDoc } = await import("firebase/firestore");
      // Clear any previous mocks
      vi.mocked(getDoc).mockClear();
      const mockSnapshot = {
        exists: () => false,
      };
      vi.mocked(getDoc).mockResolvedValueOnce(mockSnapshot as any);

      const result = await getCertificationStatus(mockWorkoutId);

      expect(result).toBeNull();
    });
  });

  describe("sendMessage", () => {
    it("should send message successfully", async () => {
      const { runTransaction, doc, collection } =
        await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "pending",
      };

      const mockMessageRef = { id: "message-123" };
      // Mock doc to return message ref when called with collection ref
      vi.mocked(doc).mockImplementation((...args: unknown[]) => {
        // If called with collection (2nd call), return message ref
        if (
          args.length === 1 &&
          typeof args[0] === "object" &&
          args[0] !== null &&
          "type" in args[0] &&
          args[0].type === "collection"
        ) {
          return mockMessageRef as any;
        }
        // Otherwise return workout doc ref (1st call)
        return { type: "document", id: mockWorkoutId } as any;
      });

      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockWorkoutData,
          }),
          set: vi.fn(),
        };
        return callback(transaction as any);
      });

      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "Test message"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("message-123");
      expect(runTransaction).toHaveBeenCalled();
      expect(collection).toHaveBeenCalledWith(
        getDbInstance(),
        "certification_messages"
      );
    });

    it("should reject empty message", async () => {
      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "   "
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Message cannot be empty");
    });

    it("should reject message that is too long", async () => {
      const longMessage = "a".repeat(5001);
      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        longMessage
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Message is too long (max 5000 characters)");
    });

    it("should reject message when certification is not active", async () => {
      const { runTransaction, getDoc } = await import("firebase/firestore");

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "certified",
      };

      // Mock user profile fetch (returns no photo_url)
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockWorkoutData,
          }),
          set: vi.fn(),
        };
        try {
          return await callback(transaction as any);
        } catch (error) {
          throw error;
        }
      });

      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "Test message"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Cannot send messages. This workout is not in an active certification process."
      );
    });

    it("should include sender_avatar when user has photo_url", async () => {
      const { runTransaction, getDoc, doc } =
        await import("firebase/firestore");

      const mockUserProfile = {
        photo_url: "https://example.com/photo.jpg",
        display_name: "Test User",
      };

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "pending",
      };

      const mockMessageRef = { id: "message-123" };
      vi.mocked(doc).mockImplementation((...args: unknown[]) => {
        if (
          args.length === 1 &&
          typeof args[0] === "object" &&
          args[0] !== null &&
          "type" in args[0] &&
          args[0].type === "collection"
        ) {
          return mockMessageRef as any;
        }
        return { type: "document", id: mockWorkoutId } as any;
      });

      // Mock user profile fetch
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
      } as any);

      let capturedMessageData: any;
      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockWorkoutData,
          }),
          set: vi.fn((ref, data) => {
            capturedMessageData = data;
          }),
        };
        return callback(transaction as any);
      });

      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "Test message"
      );

      expect(result.success).toBe(true);
      expect(capturedMessageData).toBeDefined();
      expect(capturedMessageData.sender_avatar).toBe(
        "https://example.com/photo.jpg"
      );
      expect(capturedMessageData.workout_id).toBe(mockWorkoutId);
      expect(capturedMessageData.sender_name).toBe("Test User");
      expect(getDoc).toHaveBeenCalled(); // Verify user profile was fetched
    });

    it("should not include sender_avatar when user has no photo_url", async () => {
      const { runTransaction, getDoc, doc } =
        await import("firebase/firestore");

      const mockUserProfile = {
        display_name: "Test User",
        // No photo_url field
      };

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "pending",
      };

      const mockMessageRef = { id: "message-123" };
      vi.mocked(doc).mockImplementation((...args: unknown[]) => {
        if (
          args.length === 1 &&
          typeof args[0] === "object" &&
          args[0] !== null &&
          "type" in args[0] &&
          args[0].type === "collection"
        ) {
          return mockMessageRef as any;
        }
        return { type: "document", id: mockWorkoutId } as any;
      });

      // Mock user profile fetch (no photo_url)
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
      } as any);

      let capturedMessageData: any;
      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockWorkoutData,
          }),
          set: vi.fn((ref, data) => {
            capturedMessageData = data;
          }),
        };
        return callback(transaction as any);
      });

      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "Test message"
      );

      expect(result.success).toBe(true);
      expect(capturedMessageData).toBeDefined();
      expect(capturedMessageData.sender_avatar).toBeUndefined();
      expect(capturedMessageData.workout_id).toBe(mockWorkoutId);
      expect(getDoc).toHaveBeenCalled(); // Verify user profile was fetched
    });

    it("should not include sender_avatar when user has empty photo_url", async () => {
      const { runTransaction, getDoc, doc } =
        await import("firebase/firestore");

      const mockUserProfile = {
        photo_url: "   ", // Empty string with whitespace
        display_name: "Test User",
      };

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "pending",
      };

      const mockMessageRef = { id: "message-123" };
      vi.mocked(doc).mockImplementation((...args: unknown[]) => {
        if (
          args.length === 1 &&
          typeof args[0] === "object" &&
          args[0] !== null &&
          "type" in args[0] &&
          args[0].type === "collection"
        ) {
          return mockMessageRef as any;
        }
        return { type: "document", id: mockWorkoutId } as any;
      });

      // Mock user profile fetch (empty photo_url)
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
      } as any);

      let capturedMessageData: any;
      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockWorkoutData,
          }),
          set: vi.fn((ref, data) => {
            capturedMessageData = data;
          }),
        };
        return callback(transaction as any);
      });

      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "Test message"
      );

      expect(result.success).toBe(true);
      expect(capturedMessageData).toBeDefined();
      expect(capturedMessageData.sender_avatar).toBeUndefined();
      expect(capturedMessageData.workout_id).toBe(mockWorkoutId);
    });

    it("should not include sender_avatar when user profile does not exist", async () => {
      const { runTransaction, getDoc, doc } =
        await import("firebase/firestore");

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "pending",
      };

      const mockMessageRef = { id: "message-123" };
      vi.mocked(doc).mockImplementation((...args: unknown[]) => {
        if (
          args.length === 1 &&
          typeof args[0] === "object" &&
          args[0] !== null &&
          "type" in args[0] &&
          args[0].type === "collection"
        ) {
          return mockMessageRef as any;
        }
        return { type: "document", id: mockWorkoutId } as any;
      });

      // Mock user profile fetch (profile doesn't exist)
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      let capturedMessageData: any;
      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockWorkoutData,
          }),
          set: vi.fn((ref, data) => {
            capturedMessageData = data;
          }),
        };
        return callback(transaction as any);
      });

      const result = await sendMessage(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "Test message"
      );

      expect(result.success).toBe(true);
      expect(capturedMessageData).toBeDefined();
      expect(capturedMessageData.sender_avatar).toBeUndefined();
      expect(capturedMessageData.workout_id).toBe(mockWorkoutId);
    });
  });

  describe("markMessagesAsRead", () => {
    it("should mark unread messages as read", async () => {
      const { getDocs, updateDoc, doc, collection, query, where } =
        await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      const mockUnreadMessage = {
        id: "msg-1",
        data: () => ({
          workout_id: mockWorkoutId,
          sender_id: "trainer-123",
          read_at: null,
        }),
      };

      const mockSnapshot = {
        docs: [mockUnreadMessage],
      };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await markMessagesAsRead(mockWorkoutId, mockUserId);

      expect(collection).toHaveBeenCalledWith(
        getDbInstance(),
        "certification_messages"
      );
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith("workout_id", "==", mockWorkoutId);
      expect(where).toHaveBeenCalledWith("sender_id", "!=", mockUserId);
      expect(updateDoc).toHaveBeenCalled();
    });

    it("should handle empty unread messages", async () => {
      const { getDocs } = await import("firebase/firestore");

      const mockSnapshot = {
        docs: [],
      };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await expect(
        markMessagesAsRead(mockWorkoutId, mockUserId)
      ).resolves.not.toThrow();
    });

    it("should filter messages without read_at field", async () => {
      const { getDocs, updateDoc } = await import("firebase/firestore");

      const mockUnreadMessage = {
        id: "msg-1",
        data: () => ({
          workout_id: mockWorkoutId,
          sender_id: "trainer-123",
          // read_at is undefined (not set)
        }),
      };

      const mockReadMessage = {
        id: "msg-2",
        data: () => ({
          workout_id: mockWorkoutId,
          sender_id: "trainer-123",
          read_at: { _seconds: 1234567890 },
        }),
      };

      const mockSnapshot = {
        docs: [mockUnreadMessage, mockReadMessage],
      };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await markMessagesAsRead(mockWorkoutId, mockUserId);

      // Should only update the unread message
      expect(updateDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe("getMessages", () => {
    it("should fetch messages with pagination", async () => {
      const { getDocs, query, where, orderBy, limit } =
        await import("firebase/firestore");

      const mockMessage = {
        id: "msg-1",
        data: () => ({
          workout_id: mockWorkoutId,
          workout_owner_id: mockUserId,
          sender_id: mockUserId,
          sender_type: "user",
          sender_name: "Test User",
          message: "Test message",
          created_at: { _seconds: 1234567890 },
          read_at: null,
        }),
      };

      const mockSnapshot = {
        docs: [mockMessage],
      };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await getMessages(mockWorkoutId);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe("msg-1");
      expect(result.hasMore).toBe(false);
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith("workout_id", "==", mockWorkoutId);
      expect(orderBy).toHaveBeenCalledWith("created_at", "desc");
      expect(limit).toHaveBeenCalled();
    });

    it("should handle empty messages", async () => {
      const { getDocs } = await import("firebase/firestore");

      const mockSnapshot = {
        docs: [],
      };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await getMessages(mockWorkoutId);

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("getCertifiedVersion", () => {
    it("should return certified version when it exists", async () => {
      const { getDoc, doc } = await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      const mockOriginalData = {
        user_id: mockUserId,
        certified_version_id: "certified-workout-123",
      };
      const mockCertifiedData = {
        id: "certified-workout-123",
        title: "Certified Workout",
        user_id: mockUserId,
      };

      vi.mocked(getDoc)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockOriginalData,
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockCertifiedData,
        } as any);

      const result = await getCertifiedVersion(mockWorkoutId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe("certified-workout-123");
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "trainer_workouts",
        mockWorkoutId
      );
    });

    it("should return null when no certified version exists", async () => {
      const { getDoc } = await import("firebase/firestore");

      const mockOriginalData = {
        user_id: mockUserId,
        certified_version_id: null,
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockOriginalData,
      } as any);

      const result = await getCertifiedVersion(mockWorkoutId);

      expect(result).toBeNull();
    });
  });

  describe("getUserCertificationQueue", () => {
    it("should return user's certification queue", async () => {
      const { getDocs, query, where, orderBy } =
        await import("firebase/firestore");

      const mockWorkout = {
        id: "workout-1",
        data: () => ({
          title: "Test Workout",
          certification_status: "pending",
          certification_requested_at: {
            toDate: () => new Date("2025-01-01"),
          },
          assigned_trainer_name: "Trainer Name",
        }),
      };

      const mockSnapshot = {
        docs: [mockWorkout],
      };
      vi.mocked(getDocs)
        .mockResolvedValueOnce(mockSnapshot as any) // Workout query
        .mockResolvedValueOnce({ docs: [] } as any); // Unread messages query

      const result = await getUserCertificationQueue(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].workoutId).toBe("workout-1");
      expect(result[0].status).toBe("pending");
      expect(result[0].hasUnreadMessages).toBe(false);
    });

    it("should filter out workouts with 'none' status", async () => {
      const { getDocs } = await import("firebase/firestore");

      const mockWorkoutNone = {
        id: "workout-1",
        data: () => ({
          title: "Test Workout",
          certification_status: "none",
        }),
      };

      const mockSnapshot = {
        docs: [mockWorkoutNone],
      };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await getUserCertificationQueue(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should detect unread messages correctly", async () => {
      const { getDocs } = await import("firebase/firestore");

      const mockWorkout = {
        id: "workout-1",
        data: () => ({
          title: "Test Workout",
          certification_status: "pending",
          certification_requested_at: {
            toDate: () => new Date("2025-01-01"),
          },
        }),
      };

      const mockUnreadMessage = {
        id: "msg-1",
        data: () => ({
          workout_id: "workout-1",
          sender_type: "trainer",
          read_at: null, // Explicitly null
        }),
      };

      const mockReadMessage = {
        id: "msg-2",
        data: () => ({
          workout_id: "workout-1",
          sender_type: "trainer",
          read_at: { _seconds: 1234567890 }, // Already read
        }),
      };

      vi.mocked(getDocs)
        .mockResolvedValueOnce({ docs: [mockWorkout] } as any) // Workout query
        .mockResolvedValueOnce({
          docs: [mockUnreadMessage, mockReadMessage],
        } as any); // Messages query (filtered in memory)

      const result = await getUserCertificationQueue(mockUserId);

      expect(result[0].hasUnreadMessages).toBe(true);
    });
  });

  describe("cancelCertification", () => {
    it("should cancel certification successfully", async () => {
      const { getDoc, updateDoc, setDoc, doc, collection } =
        await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "pending",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      // Mock getDoc twice: once for cancelCertification, once for createSystemMessageIdempotent
      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockSnapshot as any) // Workout check in cancelCertification
        .mockResolvedValueOnce(mockSnapshot as any); // Workout validation in createSystemMessageIdempotent

      // Mock setDoc to resolve successfully (fire-and-forget system message)
      vi.mocked(setDoc).mockResolvedValue(undefined);
      // Mock collection to return a valid reference
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(doc).mockReturnValue({
        id: "sys-msg-123",
        type: "document",
      } as any);

      const result = await cancelCertification(mockWorkoutId, mockUserId);

      expect(result.success).toBe(true);
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "trainer_workouts",
        mockWorkoutId
      );
      expect(updateDoc).toHaveBeenCalled();
      expect(collection).toHaveBeenCalled();
      // Verify workout was checked twice: once in cancelCertification, once in createSystemMessageIdempotent
      expect(getDoc).toHaveBeenCalledTimes(2);
      // Verify system message was created (no duplicate found)
      expect(setDoc).toHaveBeenCalled();
    });

    it("should reject if workout does not exist", async () => {
      const { getDoc } = await import("firebase/firestore");
      const mockSnapshot = {
        exists: () => false,
      };
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await cancelCertification(mockWorkoutId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Workout not found");
    });

    it("should reject if user does not own the workout", async () => {
      const { getDoc } = await import("firebase/firestore");
      const mockWorkoutData = {
        user_id: "different-user",
        certification_status: "pending",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await cancelCertification(mockWorkoutId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("You do not own this workout");
    });

    it("should reject cancellation when status is certified", async () => {
      const { getDoc } = await import("firebase/firestore");
      const mockWorkoutData = {
        user_id: mockUserId,
        certification_status: "certified",
      };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockWorkoutData,
      };
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await cancelCertification(mockWorkoutId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot cancel certification at this stage");
    });

    it("should allow cancellation for pending, in_review, and changes_requested", async () => {
      const { getDoc, updateDoc, addDoc, collection } =
        await import("firebase/firestore");

      const statuses: Array<"pending" | "in_review" | "changes_requested"> = [
        "pending",
        "in_review",
        "changes_requested",
      ];

      for (const status of statuses) {
        vi.clearAllMocks();
        const mockWorkoutData = {
          user_id: mockUserId,
          certification_status: status,
        };
        const mockSnapshot = {
          exists: () => true,
          data: () => mockWorkoutData,
        };
        vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);
        // Mock addDoc to resolve successfully (fire-and-forget system message)
        vi.mocked(addDoc).mockResolvedValue({ id: "system-msg-123" } as any);
        // Mock collection to return a valid reference
        vi.mocked(collection).mockReturnValue({ type: "collection" } as any);

        const result = await cancelCertification(mockWorkoutId, mockUserId);

        expect(result.success).toBe(true);
        expect(updateDoc).toHaveBeenCalled();
      }
    });
  });
});
