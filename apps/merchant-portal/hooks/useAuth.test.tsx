import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  currentUser: null as { uid: string; email: string; displayName?: string | null } | null,
  listener: null as ((user: { uid: string; email: string; displayName?: string | null } | null) => void) | null,
}));

vi.mock('../services/authService', () => ({
  getCurrentUser: () => auth.currentUser,
  logout: vi.fn(),
  onAuthStateChange: vi.fn((callback) => {
    auth.listener = callback;
    return vi.fn();
  }),
}));

import { useAuth } from './useAuth';

describe('useAuth session readiness', () => {
  beforeEach(() => {
    auth.currentUser = null;
    auth.listener = null;
  });

  it('keeps route guards loading until the persisted session check completes', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    act(() => auth.listener?.(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('uses an already cached user without waiting for session priming', () => {
    auth.currentUser = { uid: 'merchant-1', email: 'owner@bookglow.my' };

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
