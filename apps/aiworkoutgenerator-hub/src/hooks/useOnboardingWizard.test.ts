import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { useOnboardingWizard } from "./useOnboardingWizard";
import { ProfileService } from "@/services/profile/ProfileService";
import { SessionProvider } from "@/lib/session-tracker";
import type { ReactNode } from "react";

// Mock ProfileService
vi.mock("@/services/profile/ProfileService", () => ({
  ProfileService: {
    createUserProfile: vi.fn(),
  },
}));

describe("useOnboardingWizard", () => {
  const mockUserId = "test-user-123";

  // Wrapper component to provide SessionProvider context
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(SessionProvider, null, children);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    expect(result.current.step).toBe(1);
    expect(result.current.totalSteps).toBe(8);
    expect(result.current.progress).toBeCloseTo(100 / 8, 5);
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toMatchObject({
      gender: "prefer_not_to_say",
      fitness_level: "beginner",
      equipment_access: [],
    });
  });

  it("should navigate to next step", () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    act(() => {
      result.current.next();
    });

    expect(result.current.step).toBe(2);
    expect(result.current.progress).toBeCloseTo((2 / 8) * 100, 5);
  });

  it("should navigate to previous step", () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    act(() => {
      result.current.next();
      result.current.next();
    });

    expect(result.current.step).toBe(3);

    act(() => {
      result.current.back();
    });

    expect(result.current.step).toBe(2);
  });

  it("should not go below step 1", () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    act(() => {
      result.current.back();
    });

    expect(result.current.step).toBe(1);
  });

  it("should not go above total steps", () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.next();
      }
    });

    expect(result.current.step).toBe(8);
  });

  it("should update form data", () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    act(() => {
      result.current.setData({
        ...result.current.data,
        first_name: "John",
        last_name: "Doe",
      });
    });

    expect(result.current.data.first_name).toBe("John");
    expect(result.current.data.last_name).toBe("Doe");
  });

  it("should clear error when step changes", () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    // Simulate an error
    act(() => {
      result.current.handleComplete();
    });

    // Error should be set
    expect(result.current.error).toBeTruthy();

    // Navigate to next step
    act(() => {
      result.current.next();
    });

    // Error should be cleared
    expect(result.current.error).toBeNull();
  });

  it("should handle completion with valid data", async () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    // Set all required fields
    act(() => {
      result.current.setData({
        ...result.current.data,
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
        fitness_goals: ["lose_weight"],
        injuries: [],
        medical_conditions: [],
        equipment_access: ["general", "strength", "functional"],
        available_equipment: ["dumbbells"],
      });
    });

    vi.mocked(ProfileService.createUserProfile).mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleComplete();
    });

    await waitFor(() => {
      expect(ProfileService.createUserProfile).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          first_name: "John",
          last_name: "Doe",
        })
      );
    });

    expect(result.current.error).toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  it("should show error if user is not authenticated", async () => {
    const { result } = renderHook(() => useOnboardingWizard(undefined), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(result.current.error).toBe("Not authenticated");
  });

  it("should show error if equipment_access is missing", async () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    act(() => {
      result.current.setData({
        ...result.current.data,
        equipment_access: undefined,
      });
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(result.current.error).toContain("equipment categories");
  });

  it("should show error if required fields are missing", async () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    // Only set some fields, leaving others undefined
    act(() => {
      result.current.setData({
        ...result.current.data,
        first_name: "John",
        // Missing other required fields
      });
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(result.current.error).toContain("Missing required fields");
  });

  it("should handle service errors gracefully", async () => {
    const { result } = renderHook(() => useOnboardingWizard(mockUserId), {
      wrapper,
    });

    // Set all required fields
    act(() => {
      result.current.setData({
        ...result.current.data,
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
        fitness_goals: ["lose_weight"],
        injuries: [],
        medical_conditions: [],
        equipment_access: ["general", "strength", "functional"],
        available_equipment: ["dumbbells"],
      });
    });

    vi.mocked(ProfileService.createUserProfile).mockRejectedValue(
      new Error("Network error")
    );

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.submitting).toBe(false);
  });
});
