import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { signInWithGoogle, signOut, useUser } from "@/lib/auth";
import { AuthProvider } from "@/components/auth/AuthProvider";
import * as firebaseAuth from "firebase/auth";
import type { User } from "firebase/auth";
import React from "react";

// Use real AuthProvider in this file so we can test auth state flow (setup mocks it globally).
vi.unmock("@/components/auth/AuthProvider");

// Mock Firebase Auth
const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();

const mockAuth = {} as unknown as ReturnType<typeof firebaseAuth.getAuth>;

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => mockAuth),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Firebase app
vi.mock("@/lib/firebase", () => ({
  app: {},
  getAuthInstance: vi.fn(() => mockAuth),
}));

describe("@critical Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(firebaseAuth.signInWithPopup).mockImplementation(
      mockSignInWithPopup
    );
    vi.mocked(firebaseAuth.signOut).mockImplementation(mockSignOut);
    // Reset onAuthStateChanged mock - will be configured per test
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(
      mockOnAuthStateChanged
    );
  });

  it("@critical should sign in with Google", async () => {
    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Test User",
    };

    mockSignInWithPopup.mockResolvedValue({
      user: mockUser,
    });

    const result = await signInWithGoogle();
    expect(result.user).toEqual(mockUser);
    expect(mockSignInWithPopup).toHaveBeenCalled();
  });

  it("@critical should sign out user", async () => {
    mockSignOut.mockResolvedValue(undefined);

    await signOut();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("@critical should track user state changes", async () => {
    const mockUnsubscribe = vi.fn();
    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Test User",
    } as User;

    let authStateCallback: ((user: User | null) => void) | null = null;

    // Mock onAuthStateChanged to capture the callback and return unsubscribe
    // Set up the mock before rendering
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      // Use setTimeout to call callback asynchronously, simulating real Firebase behavior
      setTimeout(() => {
        act(() => {
          callback(mockUser);
        });
      }, 0);
      return mockUnsubscribe;
    });

    // Render the hook wrapped in AuthProvider
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result, unmount } = renderHook(() => useUser(), { wrapper });

    // Verify onAuthStateChanged was called with auth and a callback
    await waitFor(() => {
      expect(mockOnAuthStateChanged).toHaveBeenCalled();
    });
    expect(authStateCallback).toBeDefined();

    // Wait for state update from initial callback
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });

    // Simulate auth state change to null (logout) - wrapped in act
    expect(authStateCallback).not.toBeNull();
    act(() => {
      authStateCallback!(null);
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    // Unmount and verify cleanup (unsubscribe is called)
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
