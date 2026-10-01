import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession } },
  isSupabaseConfigured: () => true,
}));

import { sendPasswordResetEmail } from './dataService';

describe('user management', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    getSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('asks the admin edge function to send a password reset email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendPasswordResetEmail('user-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/manage-users',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-access-token',
          apikey: 'test-anon-key',
        },
        body: JSON.stringify({ action: 'resetPassword', userId: 'user-123' }),
      }),
    );
  });

  it('surfaces a password reset error from the edge function', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Unable to send recovery email' }),
      }),
    );

    await expect(sendPasswordResetEmail('user-123')).rejects.toThrow(
      'Unable to send recovery email',
    );
  });
});
