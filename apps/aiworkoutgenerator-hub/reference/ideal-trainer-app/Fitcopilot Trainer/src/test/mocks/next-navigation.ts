// Mock for Next.js navigation in tests
import { vi } from 'vitest';

export const useRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
});

export const usePathname = () => '/';

export const useSearchParams = () => new URLSearchParams();

export default {
  useRouter,
  usePathname,
  useSearchParams,
};
