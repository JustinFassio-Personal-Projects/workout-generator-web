import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileService } from "./ProfileService";
import type { Phase1ProfileInput } from "./ProfileService";

// Mock Firebase Firestore functions
vi.mock("firebase/firestore", () => {
  const mockDocRef = { type: "document", id: "mock-doc-ref" };
  return {
    doc: vi.fn(() => mockDocRef),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _seconds: 1234567890, _nanoseconds: 0 })),
  };
});

// Mock the firestore instance getter
vi.mock("@/lib/firestore", () => ({
  getDbInstance: vi.fn(() => ({ type: "firestore" })),
}));

describe("ProfileService", () => {
  const mockUserId = "test-user-123";
  const mockProfileData: Phase1ProfileInput = {
    first_name: "John",
    last_name: "Doe",
    age: 30,
    gender: "male",
    weight: 180,
    height: 72,
    preferred_units: {
      weight: "lb",
      height: "in",
      distance: "mi",
      temperature: "f",
    },
    fitness_level: "intermediate",
    current_activity_level: "moderately_active",
    fitness_goals: ["lose_weight", "build_muscle"],
    injuries: [],
    medical_conditions: [],
    injury_details: null,
    medical_notes: null,
    equipment_access: ["general", "strength", "functional"],
    available_equipment: ["dumbbells", "bench"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUserProfile", () => {
    it("should create a user profile with valid data", async () => {
      const { setDoc, doc } = await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");

      await ProfileService.createUserProfile(mockUserId, mockProfileData);

      // Verify the document path is correct
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "user_profiles",
        mockUserId
      );

      const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
      expect(setDoc).toHaveBeenCalledWith(
        docCallArgs,
        expect.objectContaining({
          id: mockUserId,
          user_id: mockUserId,
          display_name: "John Doe",
          onboarding_completed: true,
          profile_completeness: 70,
          first_name: "John",
          last_name: "Doe",
        }),
        { merge: true }
      );
    });
  });

  describe("getUserProfile", () => {
    it("should retrieve a user profile", async () => {
      const { getDoc, doc } = await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");
      const mockSnapshot = {
        exists: () => true,
        data: () => mockProfileData,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await ProfileService.getUserProfile(mockUserId);

      // Verify the document path is correct
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "user_profiles",
        mockUserId
      );
      expect(getDoc).toHaveBeenCalled();
      expect(result).toEqual(mockProfileData);
    });

    it("should return null if profile does not exist", async () => {
      const { getDoc, doc } = await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");
      const mockSnapshot = {
        exists: () => false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      const result = await ProfileService.getUserProfile(mockUserId);

      // Verify the document path is correct
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "user_profiles",
        mockUserId
      );
      expect(result).toBeNull();
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile with partial data", async () => {
      const { updateDoc, doc } = await import("firebase/firestore");
      const { getDbInstance } = await import("@/lib/firestore");
      const updates = { weight: 175, fitness_level: "advanced" as const };

      await ProfileService.updateUserProfile(mockUserId, updates);

      // Verify the document path is correct
      expect(doc).toHaveBeenCalledWith(
        getDbInstance(),
        "user_profiles",
        mockUserId
      );

      const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
      expect(updateDoc).toHaveBeenCalledWith(
        docCallArgs,
        expect.objectContaining({
          weight: 175,
          fitness_level: "advanced",
          updated_at: expect.any(Object),
        })
      );
    });

    it("should update Phase 2 fields", async () => {
      const { updateDoc, doc } = await import("firebase/firestore");
      const phase2Updates = {
        preferred_workout_duration: 45,
        workout_frequency_per_week: 4,
        training_experience_years: 5,
        current_bench_press_max: 225,
      };

      await ProfileService.updateUserProfile(mockUserId, phase2Updates);

      const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
      expect(updateDoc).toHaveBeenCalledWith(
        docCallArgs,
        expect.objectContaining({
          preferred_workout_duration: 45,
          workout_frequency_per_week: 4,
          training_experience_years: 5,
          current_bench_press_max: 225,
          updated_at: expect.any(Object),
        })
      );
    });

    it("should handle null Phase 2 fields", async () => {
      const { updateDoc, doc } = await import("firebase/firestore");
      const phase2Updates = {
        preferred_workout_duration: null,
        workout_frequency_per_week: null,
        favorite_exercises: null,
      };

      await ProfileService.updateUserProfile(mockUserId, phase2Updates);

      const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
      expect(updateDoc).toHaveBeenCalledWith(
        docCallArgs,
        expect.objectContaining({
          preferred_workout_duration: null,
          workout_frequency_per_week: null,
          favorite_exercises: null,
          updated_at: expect.any(Object),
        })
      );
    });
  });

  describe("createUserProfile with Phase 2 fields", () => {
    it("should include Phase 2 fields from onboarding steps 7-8", async () => {
      const { setDoc, doc } = await import("firebase/firestore");

      const profileWithPhase2: Phase1ProfileInput = {
        ...mockProfileData,
        preferred_workout_duration: 45,
        workout_frequency_per_week: 4,
        preferred_workout_times: ["morning", "evening"],
        training_experience_years: 5,
        sports_background: ["basketball", "running"],
      };

      await ProfileService.createUserProfile(mockUserId, profileWithPhase2);

      const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
      expect(setDoc).toHaveBeenCalledWith(
        docCallArgs,
        expect.objectContaining({
          preferred_workout_duration: 45,
          workout_frequency_per_week: 4,
          preferred_workout_times: ["morning", "evening"],
          training_experience_years: 5,
          sports_background: ["basketball", "running"],
        }),
        { merge: true }
      );
    });

    it("should set Phase 2 fields to null when not provided", async () => {
      const { setDoc, doc } = await import("firebase/firestore");

      await ProfileService.createUserProfile(mockUserId, mockProfileData);

      const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
      expect(setDoc).toHaveBeenCalledWith(
        docCallArgs,
        expect.objectContaining({
          preferred_workout_duration: null,
          workout_frequency_per_week: null,
          preferred_workout_times: null,
          training_experience_years: null,
          sports_background: null,
          previous_training_programs: null,
          favorite_exercises: null,
          disliked_exercises: null,
          exercise_restrictions: null,
        }),
        { merge: true }
      );
    });
  });
});
