import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureUserDocument } from "@/lib/user-service";
import type { User } from "firebase/auth";

const { mockAuthenticatedFetch } = vi.hoisted(() => ({
  mockAuthenticatedFetch: vi.fn(),
}));
vi.mock("@/lib/authenticated-fetch", () => ({
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}));

// Mock maskIdentifier (partial mock - keep other utils exports)
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    maskIdentifier: vi.fn((id: string) => id),
  };
});

describe("ensureUserDocument", () => {
  const mockUser: User = {
    uid: "test-uid",
    email: "test@example.com",
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
  } as unknown as User;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, action: "created" }),
    } as unknown as Response);
  });

  it("should create user document when it does not exist", async () => {
    await ensureUserDocument(mockUser);

    expect(mockAuthenticatedFetch).toHaveBeenCalledWith("/api/users/ensure", {
      method: "POST",
      body: JSON.stringify({}),
    });
  });

  it("should call API route with correct parameters", async () => {
    const userWithoutDisplayName: User = {
      uid: "test-uid-2",
      email: "john.doe@example.com",
      displayName: null,
      photoURL: null,
    } as unknown as User;

    await ensureUserDocument(userWithoutDisplayName);

    expect(mockAuthenticatedFetch).toHaveBeenCalledWith("/api/users/ensure", {
      method: "POST",
      body: JSON.stringify({}),
    });
  });

  it("should handle users without email or displayName", async () => {
    const userWithoutEmail: User = {
      uid: "test-uid-3",
      email: null,
      displayName: null,
      photoURL: null,
    } as unknown as User;

    await ensureUserDocument(userWithoutEmail);

    expect(mockAuthenticatedFetch).toHaveBeenCalled();
  });

  it("should handle existing documents (API returns updated action)", async () => {
    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, action: "updated" }),
    } as unknown as Response);

    await ensureUserDocument(mockUser);

    expect(mockAuthenticatedFetch).toHaveBeenCalled();
  });

  it("should handle authenticatedFetch errors gracefully without throwing", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    mockAuthenticatedFetch.mockRejectedValue(new Error("User not authenticated"));

    await expect(ensureUserDocument(mockUser)).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to ensure users document"),
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it("should handle API errors gracefully without throwing", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: "Internal server error" }),
    } as unknown as Response);

    await expect(ensureUserDocument(mockUser)).resolves.toBeUndefined();

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

    mockAuthenticatedFetch.mockRejectedValue(new Error("Network error"));

    await expect(ensureUserDocument(mockUser)).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to ensure users document"),
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });
});
