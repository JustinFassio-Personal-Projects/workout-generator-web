import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureUserDocument } from "@/lib/user-service";
import type { User } from "firebase/auth";

// Mock fetch API
global.fetch = vi.fn();

// Mock maskIdentifier
vi.mock("@/lib/utils", () => ({
  maskIdentifier: vi.fn((id: string) => id),
}));

describe("ensureUserDocument", () => {
  const mockUser: User = {
    uid: "test-uid",
    email: "test@example.com",
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    getIdToken: vi.fn().mockResolvedValue("mocked-token"),
  } as unknown as User;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, action: "created" }),
    } as unknown as Response);
  });

  it("should create user document when it does not exist", async () => {
    await ensureUserDocument(mockUser);

    // Verify getIdToken was called
    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith("/api/users/ensure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mocked-token",
      },
    });
  });

  it("should call API route with correct token", async () => {
    const userWithoutDisplayName: User = {
      uid: "test-uid-2",
      email: "john.doe@example.com",
      displayName: null,
      photoURL: null,
      getIdToken: vi.fn().mockResolvedValue("test-token-2"),
    } as unknown as User;

    await ensureUserDocument(userWithoutDisplayName);

    expect(userWithoutDisplayName.getIdToken).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalledWith("/api/users/ensure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token-2",
      },
    });
  });

  it("should handle users without email or displayName", async () => {
    const userWithoutEmail: User = {
      uid: "test-uid-3",
      email: null,
      displayName: null,
      photoURL: null,
      getIdToken: vi.fn().mockResolvedValue("test-token-3"),
    } as unknown as User;

    await ensureUserDocument(userWithoutEmail);

    expect(userWithoutEmail.getIdToken).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  it("should handle existing documents (API returns updated action)", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, action: "updated" }),
    } as unknown as Response);

    await ensureUserDocument(mockUser);

    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  it("should handle getIdToken errors gracefully without throwing", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const userWithTokenError: User = {
      ...mockUser,
      getIdToken: vi.fn().mockResolvedValue(null),
    } as unknown as User;

    // Should not throw
    await expect(
      ensureUserDocument(userWithTokenError)
    ).resolves.toBeUndefined();

    // Verify warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not get ID token")
    );

    // Verify fetch was NOT called when token is null
    expect(global.fetch).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle API errors gracefully without throwing", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    // Mock fetch to return error response
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: "Internal server error" }),
    } as unknown as Response);

    // Should not throw
    await expect(ensureUserDocument(mockUser)).resolves.toBeUndefined();

    // Verify error was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to ensure users document"),
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it("should handle network errors gracefully", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    // Mock fetch to throw a network error
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    // Should not throw
    await expect(ensureUserDocument(mockUser)).resolves.toBeUndefined();

    // Verify error was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to ensure users document"),
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });
});
