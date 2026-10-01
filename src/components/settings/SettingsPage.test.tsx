import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '../../data/translations';
import { SettingsPage } from './SettingsPage';

const { loadUsers, sendPasswordResetEmail, showToast } = vi.hoisted(() => ({
  loadUsers: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' }, role: 'admin' }),
}));

vi.mock('../../lib/dataService', () => ({
  loadUsers,
  setUserRole: vi.fn(),
  inviteUser: vi.fn(),
  sendPasswordResetEmail,
  deleteUser: vi.fn(),
}));

vi.mock('../ui/Toast', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('./AuditLogViewer', () => ({
  AuditLogViewer: () => null,
}));

describe('SettingsPage password reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadUsers.mockResolvedValue([
      {
        id: 'pastor-p',
        email: 'patrice@montcarmel.org',
        role: 'admin',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastSignInAt: null,
      },
    ]);
    sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  it('confirms before sending a password reset email', async () => {
    const user = userEvent.setup();

    render(
      <SettingsPage
        settings={{
          churchName: 'Mont Carmel',
          appTitle: 'Organization Chart',
          language: 'en',
        }}
        nodes={[]}
        onUpdateSettings={vi.fn()}
        t={translations.en}
        onReset={vi.fn()}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Send password reset email to patrice@montcarmel.org',
      }),
    );

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'patrice@montcarmel.org',
    );
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Send reset email' }),
    );

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('pastor-p');
    });
    expect(showToast).toHaveBeenCalledWith(
      'Password reset email sent to patrice@montcarmel.org',
    );
  });
});
