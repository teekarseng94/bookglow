import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());

vi.mock('@bookglow/supabase', () => ({
  createBrowserSupabaseClient: () => ({ functions: { invoke } }),
}));

import {
  disconnectGoogleReviews,
  getGoogleConnection,
  listGoogleLocations,
  refreshGoogleReviews,
  selectGoogleLocation,
  setGoogleReviewsVisibility,
  startGoogleAuthorization,
} from './googleReviewsService';

const ok = (data: unknown) => ({ data, error: null });

beforeEach(() => {
  invoke.mockReset();
});

describe('google reviews merchant service', () => {
  it('scopes every action to a single outlet', async () => {
    invoke.mockResolvedValue(ok({ connection: { configured: true, status: 'connected', showOnBookingPage: true } }));
    await getGoogleConnection('outlet_002');
    expect(invoke).toHaveBeenCalledWith('google-business', {
      body: { action: 'status', outletId: 'outlet_002' },
    });
  });

  it('reports a setup-required connection without throwing', async () => {
    invoke.mockResolvedValue(
      ok({
        connection: {
          configured: false,
          missingConfig: ['clientId', 'clientSecret'],
          status: 'setup_required',
          showOnBookingPage: false,
        },
      }),
    );
    const connection = await getGoogleConnection('outlet_002');
    expect(connection.status).toBe('setup_required');
    expect(connection.missingConfig).toEqual(['clientId', 'clientSecret']);
  });

  it('returns a Google authorization URL rather than performing the redirect itself', async () => {
    invoke.mockResolvedValue(ok({ authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=abc' }));
    await expect(startGoogleAuthorization('outlet_002')).resolves.toContain('accounts.google.com');
    expect(invoke.mock.calls[0][1].body.action).toBe('oauth_start');
  });

  it('never carries a client secret or token in the request body', async () => {
    invoke.mockResolvedValue(ok({ authorizationUrl: 'https://accounts.google.com/x' }));
    await startGoogleAuthorization('outlet_002');
    const body = JSON.stringify(invoke.mock.calls[0][1].body).toLowerCase();
    expect(body).not.toContain('secret');
    expect(body).not.toContain('refresh_token');
  });

  it('lists selectable locations and leaves the choice to the merchant', async () => {
    invoke.mockResolvedValue(
      ok({
        locations: [
          {
            accountName: 'accounts/1',
            accountLabel: 'Sohokaki',
            locationName: 'locations/9',
            title: 'Sohokaki Razak Residence',
            address: '1 Jalan Razak, Kuala Lumpur',
            mapsUri: null,
          },
        ],
      }),
    );
    const locations = await listGoogleLocations('outlet_002');
    expect(locations).toHaveLength(1);
    expect(locations[0].title).toBe('Sohokaki Razak Residence');
  });

  it('sends the chosen account and location when saving the mapping', async () => {
    invoke.mockResolvedValue(ok({ connection: { configured: true, status: 'connected', showOnBookingPage: false } }));
    await selectGoogleLocation('outlet_002', 'accounts/1', 'locations/9');
    expect(invoke.mock.calls[0][1].body).toEqual({
      action: 'select_location',
      outletId: 'outlet_002',
      accountName: 'accounts/1',
      locationName: 'locations/9',
    });
  });

  it('passes the booking page toggle through as a boolean', async () => {
    invoke.mockResolvedValue(ok({ connection: { configured: true, status: 'connected', showOnBookingPage: true } }));
    const connection = await setGoogleReviewsVisibility('outlet_002', true);
    expect(invoke.mock.calls[0][1].body).toEqual({ action: 'visibility', outletId: 'outlet_002', enabled: true });
    expect(connection.showOnBookingPage).toBe(true);
  });

  it('returns a disconnected summary after disconnecting', async () => {
    invoke.mockResolvedValue(ok({ connection: { configured: true, status: 'disconnected', showOnBookingPage: false } }));
    const connection = await disconnectGoogleReviews('outlet_002');
    expect(invoke.mock.calls[0][1].body.action).toBe('disconnect');
    expect(connection.status).toBe('disconnected');
  });

  it('surfaces the real authorization error instead of a generic message', async () => {
    invoke.mockResolvedValue({
      data: { error: 'Only an outlet admin can manage this integration.' },
      error: { message: 'Edge Function returned a non-2xx status code' },
    });
    await expect(getGoogleConnection('outlet_002')).rejects.toThrow('Only an outlet admin can manage this integration.');
  });

  it('reads the error body from the function response when the payload is empty', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: { clone: () => ({ json: async () => ({ error: 'Google authorization expired. Reconnect Google.' }) }) },
      },
    });
    await expect(refreshGoogleReviews('outlet_002')).rejects.toThrow('Google authorization expired. Reconnect Google.');
  });

  it('falls back to the transport message when no error body is readable', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
    await expect(refreshGoogleReviews('outlet_002')).rejects.toThrow('Failed to fetch');
  });
});
