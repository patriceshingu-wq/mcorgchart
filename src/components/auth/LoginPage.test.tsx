import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const { signInWithEmail, requestPasswordReset } = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ signInWithEmail, requestPasswordReset }),
}));

describe('LoginPage password recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithEmail.mockResolvedValue(null);
    requestPasswordReset.mockResolvedValue(null);
  });

  it('lets a signed-out user request a password reset email', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'patrice@montcarmel.org',
    );
    await user.click(
      screen.getByRole('button', { name: 'Forgot password?' }),
    );

    expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Send reset link' }),
    );

    expect(requestPasswordReset).toHaveBeenCalledWith('patrice@montcarmel.org');
    expect(
      await screen.findByText(
        'If an account exists for this email, a password reset link has been sent.',
      ),
    ).toBeInTheDocument();
  });

  it('allows returning to the sign-in form', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(
      screen.getByRole('button', { name: 'Forgot password?' }),
    );
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));

    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
