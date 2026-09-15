import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ loading: false, isAuthenticated: true }));
const user = vi.hoisted(() => ({
  loading: false,
  outletId: null as string | null,
  error: null as string | null,
  onboardingRequired: false,
  isPlatformAdmin: false,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ loading: auth.loading, isAuthenticated: auth.isAuthenticated }),
}));

vi.mock('../contexts/UserContext', () => ({
  useUserContext: () => user,
}));

import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    auth.loading = false;
    auth.isAuthenticated = true;
    user.loading = false;
    user.outletId = null;
    user.error = null;
    user.onboardingRequired = false;
    user.isPlatformAdmin = false;
  });

  it('sends accounts without an outlet to onboarding instead of permission denied', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/onboarding" element={<div>Resume onboarding</div>} />
          <Route path="/dashboard" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Resume onboarding')).toBeTruthy();
    expect(screen.queryByText('Permission denied')).toBeNull();
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('keeps unfinished owners in onboarding even after a workspace is assigned', async () => {
    user.outletId = 'outlet-pending';
    user.onboardingRequired = true;
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/onboarding" element={<div>Resume onboarding</div>} />
          <Route path="/dashboard" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Resume onboarding')).toBeTruthy();
    expect(screen.queryByText('Dashboard')).toBeNull();
  });
});
