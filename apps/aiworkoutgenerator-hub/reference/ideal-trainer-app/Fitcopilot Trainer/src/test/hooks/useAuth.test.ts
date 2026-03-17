import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/dbService';
import type { User, Session } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('../../../services/dbService', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock hubSync
vi.mock('../../../services/hubSync', () => ({
  syncProfileToHub: vi.fn(),
}));

describe('useAuth', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2025-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
  } as User;

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  } as Session;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with loading state', () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
    });

    it('should load initial session', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isSignedIn).toBe(true);
    });

    it('should handle no initial session', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isSignedIn).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signIn('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error on failed sign in', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const mockError = { message: 'Invalid credentials' };
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.signIn('test@example.com', 'wrong-password')).rejects.toEqual(
        mockError,
      );
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const mockError = { message: 'Sign out failed' };
      (supabase.auth.signOut as any).mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.signOut()).rejects.toEqual(mockError);
    });
  });

  describe('Auth State Changes', () => {
    it('should update user on SIGNED_IN event', async () => {
      let authStateChangeCallback: (event: string, session: Session | null) => void;

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate SIGNED_IN event
      act(() => {
        authStateChangeCallback!('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should clear user on SIGNED_OUT event', async () => {
      let authStateChangeCallback: (event: string, session: Session | null) => void;

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
      });

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate SIGNED_OUT event
      act(() => {
        authStateChangeCallback!('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn();

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const { unmount } = renderHook(() => useAuth());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
