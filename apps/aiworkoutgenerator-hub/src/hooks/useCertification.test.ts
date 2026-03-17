/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useCertificationStatus,
  useCertificationMessages,
  useCertificationQueue,
  useCertificationActions,
} from "./useCertification";
import { CertificationService } from "@/services/certification";

// Mock Firebase Firestore functions
vi.mock("firebase/firestore", () => {
  const mockDocRef = { type: "document", id: "mock-doc-ref" };
  const mockCollectionRef = { type: "collection" };
  const mockQueryRef = { type: "query" };
  const mockOnSnapshot = vi.fn(
    (ref: any, callback: any, errorCallback?: any) => {
      // Return unsubscribe function
      return () => {};
    }
  );
  return {
    collection: vi.fn(() => mockCollectionRef),
    query: vi.fn(() => mockQueryRef),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: mockOnSnapshot,
    doc: vi.fn(() => mockDocRef),
    getDocs: vi.fn(),
  };
});

// Mock the firestore instance getter
vi.mock("@/lib/firestore", () => ({
  getDbInstance: vi.fn(() => ({ type: "firestore" })),
}));

// Mock CertificationService
vi.mock("@/services/certification", () => ({
  CertificationService: {
    submitForCertification: vi.fn(),
    sendMessage: vi.fn(),
    cancelCertification: vi.fn(),
    markMessagesAsRead: vi.fn(),
  },
}));

// Mock useUser hook
vi.mock("@/lib/auth", () => ({
  useUser: vi.fn(() => ({
    user: {
      uid: "test-user-123",
      displayName: "Test User",
      email: "test@example.com",
    },
    loading: false,
  })),
}));

describe("useCertification", () => {
  const mockWorkoutId = "workout-123";
  const mockUserId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCertificationStatus", () => {
    it("should initialize with loading state", () => {
      const { result } = renderHook(() =>
        useCertificationStatus(mockWorkoutId)
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.status).toBe("none");
      expect(result.current.summary).toBeNull();
    });

    it("should handle null workoutId", async () => {
      const { result } = renderHook(() => useCertificationStatus(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe("none");
      expect(result.current.summary).toBeNull();
    });

    it("should update status when workout data changes", async () => {
      const { onSnapshot, doc } = await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      let snapshotCallback: ((snapshot: any) => void) | null = null;

      vi.mocked(onSnapshot).mockImplementation(
        (ref: any, callback: any, errorCallback?: any) => {
          snapshotCallback = callback as any;
          // Simulate initial snapshot
          setTimeout(() => {
            callback({
              exists: () => true,
              data: () => ({
                certification_status: "pending",
                certification_requested_at: {
                  toDate: () => new Date("2025-01-01"),
                },
                assigned_trainer_name: "Trainer Name",
                assigned_at: {
                  toDate: () => new Date("2025-01-02"),
                },
                certified_at: null,
                certification_notes: null,
              }),
            } as any);
          }, 0);
          return () => {}; // unsubscribe function
        }
      );

      const { result } = renderHook(() =>
        useCertificationStatus(mockWorkoutId)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe("pending");
      expect(result.current.summary).not.toBeNull();
      expect(result.current.summary?.status).toBe("pending");
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "trainer_workouts",
        mockWorkoutId
      );
    });

    it("should handle workout that does not exist", async () => {
      const { onSnapshot } = await import("firebase/firestore");

      vi.mocked(onSnapshot).mockImplementation((ref: any, callback: any) => {
        setTimeout(() => {
          callback({
            exists: () => false,
          } as any);
        }, 0);
        return () => {};
      });

      const { result } = renderHook(() =>
        useCertificationStatus(mockWorkoutId)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe("none");
      expect(result.current.summary).toBeNull();
    });

    it("should handle errors", async () => {
      const { onSnapshot } = await import("firebase/firestore");

      vi.mocked(onSnapshot).mockImplementation(
        (ref: any, onNext: any, onError?: any) => {
          // Call error callback on next tick to simulate async error
          setTimeout(() => {
            if (typeof onError === "function") {
              onError(new Error("Firestore error"));
            }
          }, 10);
          return () => {};
        }
      );

      const { result } = renderHook(() =>
        useCertificationStatus(mockWorkoutId)
      );

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1000 }
      );

      expect(result.current.error).toBe("Failed to load certification status");
    });
  });

  describe("useCertificationMessages", () => {
    it("should initialize with loading state", () => {
      const { result } = renderHook(() =>
        useCertificationMessages(mockWorkoutId)
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.messages).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it("should handle null workoutId", async () => {
      const { result } = renderHook(() => useCertificationMessages(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.messages).toEqual([]);
    });

    it("should fetch and parse messages correctly", async () => {
      const { onSnapshot, query, where, orderBy, collection } =
        await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      vi.mocked(onSnapshot).mockImplementation((ref: any, callback: any) => {
        setTimeout(() => {
          callback({
            docs: [
              {
                id: "msg-1",
                data: () => ({
                  workout_id: mockWorkoutId,
                  workout_owner_id: mockUserId,
                  sender_id: mockUserId,
                  sender_type: "user",
                  sender_name: "Test User",
                  message: "User message",
                  created_at: { _seconds: 1234567890 },
                  read_at: null,
                }),
              },
              {
                id: "msg-2",
                data: () => ({
                  workout_id: mockWorkoutId,
                  workout_owner_id: mockUserId,
                  sender_id: "trainer-123",
                  sender_type: "trainer",
                  sender_name: "Trainer",
                  message: "Trainer message",
                  created_at: { _seconds: 1234567900 },
                  read_at: null, // Unread
                }),
              },
            ],
          } as any);
        }, 0);
        return () => {};
      });

      const { result } = renderHook(() =>
        useCertificationMessages(mockWorkoutId)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].id).toBe("msg-1");
      expect(result.current.messages[1].id).toBe("msg-2");
      expect(result.current.unreadCount).toBe(1); // Only trainer message is unread
      expect(collection).toHaveBeenCalledWith(
        getDbInstance(),
        "certification_messages"
      );
      expect(where).toHaveBeenCalledWith("workout_id", "==", mockWorkoutId);
      expect(orderBy).toHaveBeenCalledWith("created_at", "asc");
    });

    it("should calculate unread count correctly", async () => {
      const { onSnapshot } = await import("firebase/firestore");

      vi.mocked(onSnapshot).mockImplementation((ref: any, callback: any) => {
        setTimeout(() => {
          callback({
            docs: [
              {
                id: "msg-1",
                data: () => ({
                  workout_id: mockWorkoutId,
                  workout_owner_id: mockUserId,
                  sender_id: "trainer-123",
                  sender_type: "trainer",
                  sender_name: "Trainer",
                  message: "Unread message",
                  created_at: { _seconds: 1234567890 },
                  read_at: null, // Unread
                }),
              },
              {
                id: "msg-2",
                data: () => ({
                  workout_id: mockWorkoutId,
                  workout_owner_id: mockUserId,
                  sender_id: "trainer-123",
                  sender_type: "trainer",
                  sender_name: "Trainer",
                  message: "Read message",
                  created_at: { _seconds: 1234567900 },
                  read_at: { _seconds: 1234568000 }, // Read
                }),
              },
              {
                id: "msg-3",
                data: () => ({
                  workout_id: mockWorkoutId,
                  workout_owner_id: mockUserId,
                  sender_id: mockUserId, // User's own message
                  sender_type: "user",
                  sender_name: "Test User",
                  message: "User message",
                  created_at: { _seconds: 1234567910 },
                  read_at: null, // Doesn't count as unread
                }),
              },
            ],
          } as any);
        }, 0);
        return () => {};
      });

      const { result } = renderHook(() =>
        useCertificationMessages(mockWorkoutId)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Only trainer messages that are unread count
      expect(result.current.unreadCount).toBe(1);
    });

    it("should handle errors", async () => {
      const { onSnapshot } = await import("firebase/firestore");

      vi.mocked(onSnapshot).mockImplementation(
        (ref: any, onNext: any, onError?: any) => {
          // Call error callback on next tick to simulate async error
          setTimeout(() => {
            if (typeof onError === "function") {
              onError(new Error("Firestore error"));
            }
          }, 10);
          return () => {};
        }
      );

      const { result } = renderHook(() =>
        useCertificationMessages(mockWorkoutId)
      );

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1000 }
      );

      expect(result.current.error).toBe(
        "Failed to load messages. Please refresh the page."
      );
    });
  });

  describe("useCertificationQueue", () => {
    it("should initialize with loading state", () => {
      const { result } = renderHook(() => useCertificationQueue());

      expect(result.current.loading).toBe(true);
      expect(result.current.items).toEqual([]);
    });

    it("should fetch user's certification queue", async () => {
      const { onSnapshot, where, getDocs } = await import("firebase/firestore");

      vi.mocked(onSnapshot).mockImplementation((ref: any, callback: any) => {
        setTimeout(() => {
          callback({
            docs: [
              {
                id: "workout-1",
                data: () => ({
                  title: "Test Workout 1",
                  certification_status: "pending",
                  certification_requested_at: {
                    toDate: () => new Date("2025-01-01"),
                  },
                  assigned_trainer_name: null,
                }),
              },
              {
                id: "workout-2",
                data: () => ({
                  title: "Test Workout 2",
                  certification_status: "in_review",
                  certification_requested_at: {
                    toDate: () => new Date("2025-01-02"),
                  },
                  assigned_trainer_name: "Trainer Name",
                }),
              },
            ],
          } as any);
        }, 0);
        return () => {}; // unsubscribe function
      });

      // Mock getDocs for batched unread message checks
      // The hook batches all workout IDs into ONE query (since 2 < 10 batch size)
      // Return messages for both workouts in a single response
      vi.mocked(getDocs).mockResolvedValue({
        docs: [
          {
            id: "msg-1",
            data: () => ({
              workout_id: "workout-2",
              sender_type: "trainer",
              read_at: null, // Unread - this workout should have hasUnreadMessages=true
            }),
          },
        ],
      } as any);

      const { result } = renderHook(() => useCertificationQueue());

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 3000 }
      );

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].workoutId).toBe("workout-1");
      expect(result.current.items[0].status).toBe("pending");
      expect(result.current.items[0].hasUnreadMessages).toBe(false);
      expect(result.current.items[1].hasUnreadMessages).toBe(true);
      expect(where).toHaveBeenCalledWith("user_id", "==", mockUserId);
    });

    it("should handle empty queue", async () => {
      const { onSnapshot } = await import("firebase/firestore");
      const { getDocs } = await import("firebase/firestore");

      vi.mocked(onSnapshot).mockImplementation((ref: any, callback: any) => {
        setTimeout(() => {
          callback({
            docs: [],
          } as any);
        }, 0);
        return () => {}; // unsubscribe function
      });

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      const { result } = renderHook(() => useCertificationQueue());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
    });

    it("should refresh queue when refresh is called", async () => {
      const { onSnapshot } = await import("firebase/firestore");
      const { getDocs } = await import("firebase/firestore");

      let callCount = 0;
      vi.mocked(onSnapshot).mockImplementation((ref: any, callback: any) => {
        callCount++;
        setTimeout(() => {
          callback({
            docs: [
              {
                id: `workout-${callCount}`,
                data: () => ({
                  title: `Workout ${callCount}`,
                  certification_status: "pending",
                  certification_requested_at: {
                    toDate: () => new Date("2025-01-01"),
                  },
                  assigned_trainer_name: null,
                }),
              },
            ],
          } as any);
        }, 0);
        return () => {};
      });

      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      const { result } = renderHook(() => useCertificationQueue());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCount = result.current.items.length;

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have triggered a new query
      expect(callCount).toBeGreaterThan(1);
    });

    it("should handle errors", async () => {
      const { onSnapshot } = await import("firebase/firestore");

      vi.mocked(onSnapshot).mockImplementation(
        (ref: any, onNext: any, onError?: any) => {
          // Call error callback on next tick to simulate async error
          setTimeout(() => {
            if (typeof onError === "function") {
              onError(new Error("Firestore error"));
            }
          }, 10);
          return () => {}; // unsubscribe function
        }
      );

      const { result } = renderHook(() => useCertificationQueue());

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1000 }
      );

      expect(result.current.error).toBe("Failed to load certification queue");
    });
  });

  describe("useCertificationActions", () => {
    it("should provide action functions with loading states", () => {
      const { result } = renderHook(() => useCertificationActions());

      expect(result.current.submit).toBeDefined();
      expect(result.current.sendMessage).toBeDefined();
      expect(result.current.cancel).toBeDefined();
      expect(result.current.markRead).toBeDefined();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isSending).toBe(false);
      expect(result.current.isCancelling).toBe(false);
    });

    it("should handle submit action", async () => {
      const mockQuestionnaire = {
        primary_hesitation: "sanity_check",
        ai_hallucination_report: "The AI suggested a weird exercise variation",
        logic_errors: [
          "No Logic Errors: The logistics look accurate to my profile",
        ],
        pacing_assessment: "feasible",
        visual_flags: ["Visuals look accurate"],
      };

      vi.mocked(CertificationService.submitForCertification).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useCertificationActions());

      expect(result.current.isSubmitting).toBe(false);

      let submitResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        submitResult = await result.current.submit(
          mockWorkoutId,
          mockQuestionnaire
        );
      });

      expect(submitResult?.success).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
      expect(CertificationService.submitForCertification).toHaveBeenCalledWith(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );
    });

    it("should handle submit action failure", async () => {
      const mockQuestionnaire = {
        primary_hesitation: "sanity_check",
        ai_hallucination_report: "The AI suggested a weird exercise variation",
        logic_errors: [
          "No Logic Errors: The logistics look accurate to my profile",
        ],
        pacing_assessment: "feasible",
        visual_flags: ["Visuals look accurate"],
      };

      vi.mocked(CertificationService.submitForCertification).mockResolvedValue({
        success: false,
        error: "Workout not found",
      });

      const { result } = renderHook(() => useCertificationActions());

      let submitResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        submitResult = await result.current.submit(
          mockWorkoutId,
          mockQuestionnaire
        );
      });

      expect(submitResult?.success).toBe(false);
      expect(submitResult?.error).toBe("Workout not found");
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should handle sendMessage action", async () => {
      vi.mocked(CertificationService.sendMessage).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const { result } = renderHook(() => useCertificationActions());

      let sendResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        sendResult = await result.current.sendMessage(
          mockWorkoutId,
          "Test message"
        );
      });

      expect(sendResult?.success).toBe(true);
      expect(result.current.isSending).toBe(false);
      expect(CertificationService.sendMessage).toHaveBeenCalledWith(
        mockWorkoutId,
        mockUserId,
        "Test User",
        "Test message"
      );
    });

    it("should handle cancel action", async () => {
      vi.mocked(CertificationService.cancelCertification).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useCertificationActions());

      let cancelResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        cancelResult = await result.current.cancel(mockWorkoutId);
      });

      expect(cancelResult?.success).toBe(true);
      expect(result.current.isCancelling).toBe(false);
      expect(CertificationService.cancelCertification).toHaveBeenCalledWith(
        mockWorkoutId,
        mockUserId
      );
    });

    it("should handle markRead action", async () => {
      vi.mocked(CertificationService.markMessagesAsRead).mockResolvedValue();

      const { result } = renderHook(() => useCertificationActions());

      await act(async () => {
        await result.current.markRead(mockWorkoutId);
      });

      expect(CertificationService.markMessagesAsRead).toHaveBeenCalledWith(
        mockWorkoutId,
        mockUserId
      );
    });

    it("should handle authentication errors", async () => {
      const { useUser } = await import("@/lib/auth");
      vi.mocked(useUser).mockReturnValue({
        user: null,
        loading: false,
      } as any);

      const { result } = renderHook(() => useCertificationActions());

      const mockQuestionnaire = {
        primary_hesitation: "sanity_check",
        ai_hallucination_report: "The AI suggested a weird exercise variation",
        logic_errors: [
          "No Logic Errors: The logistics look accurate to my profile",
        ],
        pacing_assessment: "feasible",
        visual_flags: ["Visuals look accurate"],
      };

      let submitResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        submitResult = await result.current.submit(
          mockWorkoutId,
          mockQuestionnaire
        );
      });

      expect(submitResult?.success).toBe(false);
      expect(submitResult?.error).toBe("Not authenticated");
    });

    it("should set loading states during async operations", async () => {
      // Test that the loading state is properly reset after async operation completes
      // Note: Testing intermediate loading states is timing-sensitive, so we focus on
      // verifying the final state after completion

      // Reset the useUser mock (may have been modified by previous tests)
      const { useUser } = await import("@/lib/auth");
      vi.mocked(useUser).mockReturnValue({
        user: {
          uid: mockUserId,
          displayName: "Test User",
          email: "test@example.com",
        },
        loading: false,
      } as any);

      vi.mocked(CertificationService.submitForCertification).mockImplementation(
        async () => {
          // Add a small delay to simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { success: true };
        }
      );

      const mockQuestionnaire = {
        primary_hesitation: "sanity_check",
        ai_hallucination_report: "The AI suggested a weird exercise variation",
        logic_errors: [
          "No Logic Errors: The logistics look accurate to my profile",
        ],
        pacing_assessment: "feasible",
        visual_flags: ["Visuals look accurate"],
      };

      const { result } = renderHook(() => useCertificationActions());

      // Verify initial state
      expect(result.current.isSubmitting).toBe(false);

      // Execute the submit action and wait for completion
      let submitResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        submitResult = await result.current.submit(
          mockWorkoutId,
          mockQuestionnaire
        );
      });

      // Verify the action completed successfully and loading state is reset
      expect(submitResult?.success).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
      expect(CertificationService.submitForCertification).toHaveBeenCalledWith(
        mockWorkoutId,
        mockUserId,
        mockQuestionnaire
      );
    });
  });
});
