import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React from "react";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock session tracker so SessionProvider doesn't run real hooks (avoids duplicate-React
// "Cannot read properties of null (reading 'useState')" in Vitest). Tests get a stable
// session value; override useSession in a test if you need different behavior.
const mockSessionValue = {
  sessionId: "test-session-id",
  startSession: () => "test-session-id",
  endSession: () => {},
};
vi.mock("@/lib/session-tracker", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => mockSessionValue,
}));

// Mock AuthProvider so it doesn't run real hooks (same duplicate-React issue).
// Tests that need specific user state can mock @/lib/auth useUser or the auth module.
vi.mock("@/components/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null, loading: false }),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement("img", props);
  },
}));
