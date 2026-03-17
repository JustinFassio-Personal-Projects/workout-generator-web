/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getExerciseImagesByPosition } from "./ImageMappingService";

// Mock Firebase Firestore functions
vi.mock("firebase/firestore", () => {
  const mockCollectionRef = { type: "collection" };
  const mockQueryRef = { type: "query" };
  return {
    collection: vi.fn(() => mockCollectionRef),
    query: vi.fn(() => mockQueryRef),
    where: vi.fn(),
    getDocs: vi.fn(),
  };
});

// Mock the firestore instance getter
vi.mock("@/lib/firestore", () => ({
  getDbInstance: vi.fn(() => ({ type: "firestore" })),
}));

// Mock trimExerciseName
vi.mock("@/lib/image-generation-config", () => ({
  trimExerciseName: vi.fn((name: string) => name.trim()),
}));

describe("ImageMappingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExerciseImagesByPosition", () => {
    it("should return images in correct position order for default positions", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            image_url: "https://example.com/image1.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc2",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 2,
            image_url: "https://example.com/image2.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc3",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 3,
            image_url: "https://example.com/image3.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc4",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 4,
            image_url: "https://example.com/image4.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Arm Circles");

      expect(result).toEqual([
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
        "https://example.com/image3.jpg",
        "https://example.com/image4.jpg",
      ]);
      expect(where).toHaveBeenCalledWith("exercise_name", "==", "Arm Circles");
      expect(where).toHaveBeenCalledWith("status", "==", "certified");
    });

    it("should return null for missing positions", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            image_url: "https://example.com/image1.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc3",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 3,
            image_url: "https://example.com/image3.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Arm Circles");

      expect(result).toEqual([
        "https://example.com/image1.jpg",
        null,
        "https://example.com/image3.jpg",
        null,
      ]);
    });

    it("should return all nulls when snapshot is empty", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockSnapshot = {
        empty: true,
        docs: [],
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Non-existent Exercise");

      expect(result).toEqual([null, null, null, null]);
    });

    it("should respect custom positions array", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc2",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 2,
            image_url: "https://example.com/image2.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc5",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 5,
            image_url: "https://example.com/image5.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc7",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 7,
            image_url: "https://example.com/image7.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition(
        "Arm Circles",
        [2, 5, 7]
      );

      expect(result).toEqual([
        "https://example.com/image2.jpg",
        "https://example.com/image5.jpg",
        "https://example.com/image7.jpg",
      ]);
    });

    it("should query with certified status filter", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            image_url: "https://example.com/image1.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc2",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 2,
            image_url: "https://example.com/image2.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      await getExerciseImagesByPosition("Arm Circles");

      // Verify that the query includes status filter for certified images
      // Note: Firestore filters by status before returning results, so the function
      // only receives certified images. This test verifies the query is set up correctly.
      expect(where).toHaveBeenCalledWith("exercise_name", "==", "Arm Circles");
      expect(where).toHaveBeenCalledWith("status", "==", "certified");
    });

    it("should filter out positions not in requested array", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            image_url: "https://example.com/image1.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc5",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 5,
            image_url: "https://example.com/image5.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc10",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 10,
            image_url: "https://example.com/image10.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition(
        "Arm Circles",
        [1, 2, 3, 4]
      );

      // Position 5 and 10 should be filtered out
      expect(result).toEqual([
        "https://example.com/image1.jpg",
        null,
        null,
        null,
      ]);
    });

    it("should handle missing position field by defaulting to 999", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            image_url: "https://example.com/image1.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc2",
          data: () => ({
            exercise_name: "Arm Circles",
            // Missing position field
            image_url: "https://example.com/image2.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Arm Circles");

      // Document with missing position should be sorted last (999) and not included
      expect(result).toEqual([
        "https://example.com/image1.jpg",
        null,
        null,
        null,
      ]);
    });

    it("should handle missing image_url field", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            // Missing image_url
            status: "certified",
          }),
        },
        {
          id: "doc2",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 2,
            image_url: "https://example.com/image2.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Arm Circles");

      // Missing image_url should result in undefined being set in map, which becomes null
      expect(result).toEqual([
        null, // position 1 has no image_url
        "https://example.com/image2.jpg",
        null,
        null,
      ]);
    });

    it("should handle non-number position values", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      const mockDocs = [
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            image_url: "https://example.com/image1.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc2",
          data: () => ({
            exercise_name: "Arm Circles",
            position: "2", // String instead of number
            image_url: "https://example.com/image2.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Arm Circles");

      // Non-number position should be filtered out by the type check
      expect(result).toEqual([
        "https://example.com/image1.jpg",
        null,
        null,
        null,
      ]);
    });

    it("should handle errors gracefully and return null array", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.mocked(getDocs).mockRejectedValue(new Error("Firestore error"));
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Arm Circles");

      expect(result).toEqual([null, null, null, null]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching images for exercise "Arm Circles":',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should normalize exercise name using trimExerciseName", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");
      const { trimExerciseName } =
        await import("@/lib/image-generation-config");

      const mockSnapshot = {
        empty: true,
        docs: [],
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      await getExerciseImagesByPosition("  Arm Circles  ");

      expect(trimExerciseName).toHaveBeenCalledWith("  Arm Circles  ");
      expect(where).toHaveBeenCalledWith("exercise_name", "==", "Arm Circles");
    });

    it("should sort documents by position before mapping", async () => {
      const { getDocs, collection, query, where } =
        await import("firebase/firestore");

      // Documents in unsorted order
      const mockDocs = [
        {
          id: "doc4",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 4,
            image_url: "https://example.com/image4.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc1",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 1,
            image_url: "https://example.com/image1.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc3",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 3,
            image_url: "https://example.com/image3.jpg",
            status: "certified",
          }),
        },
        {
          id: "doc2",
          data: () => ({
            exercise_name: "Arm Circles",
            position: 2,
            image_url: "https://example.com/image2.jpg",
            status: "certified",
          }),
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };

      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(collection).mockReturnValue({ type: "collection" } as any);
      vi.mocked(query).mockReturnValue({ type: "query" } as any);
      vi.mocked(where).mockReturnValue({} as any);

      const result = await getExerciseImagesByPosition("Arm Circles");

      // Should be sorted correctly despite unsorted input
      expect(result).toEqual([
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
        "https://example.com/image3.jpg",
        "https://example.com/image4.jpg",
      ]);
    });
  });
});
