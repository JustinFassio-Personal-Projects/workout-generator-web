/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserImagePreference } from "./UserImagePreferenceService";

// Mock Firebase Firestore functions
vi.mock("firebase/firestore", () => {
  const mockDocRef = { type: "doc" };
  return {
    doc: vi.fn(() => mockDocRef),
    getDoc: vi.fn(),
  };
});

// Mock the firestore instance getter
vi.mock("@/lib/firestore", () => ({
  getDbInstance: vi.fn(() => ({ type: "firestore" })),
}));

// Mock getPreferenceDocId
vi.mock("@/lib/image-generation-config", () => ({
  getPreferenceDocId: vi.fn(
    (userId: string, exerciseName: string) =>
      `${userId}_${exerciseName.replace(/[^a-zA-Z0-9]/g, "_")}`
  ),
}));

describe("UserImagePreferenceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserImagePreference", () => {
    it("should return image URL when preference exists", async () => {
      const { getDoc, doc } = await import("firebase/firestore");
      const { getPreferenceDocId } =
        await import("@/lib/image-generation-config");

      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          userId: "user123",
          exerciseName: "Arm Circles",
          selectedImageUrl: "https://example.com/image.jpg",
          selectedImageId: "img123",
        }),
      };

      (getDoc as any).mockResolvedValue(mockSnapshot);

      const result = await getUserImagePreference("user123", "Arm Circles");

      expect(getPreferenceDocId).toHaveBeenCalledWith("user123", "Arm Circles");
      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      expect(result).toBe("https://example.com/image.jpg");
    });

    it("should return null when preference does not exist", async () => {
      const { getDoc } = await import("firebase/firestore");

      const mockSnapshot = {
        exists: () => false,
        data: () => null,
      };

      (getDoc as any).mockResolvedValue(mockSnapshot);

      const result = await getUserImagePreference("user123", "Arm Circles");

      expect(result).toBeNull();
    });

    it("should return null when selectedImageUrl is missing", async () => {
      const { getDoc } = await import("firebase/firestore");

      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          userId: "user123",
          exerciseName: "Arm Circles",
          selectedImageId: "img123",
          // selectedImageUrl is missing
        }),
      };

      (getDoc as any).mockResolvedValue(mockSnapshot);

      const result = await getUserImagePreference("user123", "Arm Circles");

      expect(result).toBeNull();
    });

    it("should return null when selectedImageUrl is empty string", async () => {
      const { getDoc } = await import("firebase/firestore");

      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          userId: "user123",
          exerciseName: "Arm Circles",
          selectedImageUrl: "",
          selectedImageId: "img123",
        }),
      };

      (getDoc as any).mockResolvedValue(mockSnapshot);

      const result = await getUserImagePreference("user123", "Arm Circles");

      expect(result).toBeNull();
    });

    it("should handle Firestore errors gracefully and return null", async () => {
      const { getDoc } = await import("firebase/firestore");
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (getDoc as any).mockRejectedValue(new Error("Firestore error"));

      const result = await getUserImagePreference("user123", "Arm Circles");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching image preference for exercise "Arm Circles":',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle exercise names with special characters in document ID", async () => {
      const { getDoc, doc } = await import("firebase/firestore");
      const { getPreferenceDocId } =
        await import("@/lib/image-generation-config");

      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          userId: "user123",
          exerciseName: "Arm Circles",
          selectedImageUrl: "https://example.com/image.jpg",
          selectedImageId: "img123",
        }),
      };

      (getDoc as any).mockResolvedValue(mockSnapshot);

      await getUserImagePreference("user123", "Arm Circles (Forward)");

      expect(getPreferenceDocId).toHaveBeenCalledWith(
        "user123",
        "Arm Circles (Forward)"
      );
    });
  });
});
