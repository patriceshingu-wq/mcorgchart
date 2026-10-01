import React, { useState } from 'react';
import { Church } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { signInWithEmail, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (forgotPassword) {
      const err = await requestPasswordReset(email);
      if (err) {
        setError(err);
      } else {
        setMessage(
          'If an account exists for this email, a password reset link has been sent.',
        );
      }
    } else {
      const err = await signInWithEmail(email, password);
      if (err) setError(err);
    }

    setLoading(false);
  }

  function showPasswordReset() {
    setForgotPassword(true);
    setError(null);
    setMessage(null);
  }

  function showSignIn() {
    setForgotPassword(false);
    setError(null);
    setMessage(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-center mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Church className="h-7 w-7" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-900 text-center mb-1">Mont Carmel</h1>
        <p className="text-sm text-slate-500 text-center mb-8">
          {forgotPassword
            ? 'Enter your email to receive a password reset link'
            : 'Organization Chart'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setMessage(null);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          {!forgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600">
                  Password
                </label>
                <button
                  type="button"
                  onClick={showPasswordReset}
                  className="text-xs font-medium text-violet-700 hover:text-violet-900"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {message && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? forgotPassword
                ? 'Sending…'
                : 'Signing in…'
              : forgotPassword
                ? 'Send reset link'
                : 'Sign in'}
          </button>

          {forgotPassword && (
            <button
              type="button"
              onClick={showSignIn}
              className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
