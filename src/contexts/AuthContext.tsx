import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type UserRole = 'admin' | 'viewer';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  needsPasswordSet: boolean;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Fake user for local/unauthenticated mode when Supabase is not configured
const LOCAL_ADMIN_USER = {
  id: 'local-admin',
  email: 'admin@localhost',
  app_metadata: { role: 'admin' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

// Extract role from user's app_metadata (set via Supabase dashboard or SQL)
function getRoleFromUser(user: User | null): UserRole | null {
  if (!user) return null;
  const role = user.app_metadata?.role;
  return role === 'admin' ? 'admin' : 'viewer';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordSet, setNeedsPasswordSet] = useState(false);

  useEffect(() => {
    // When Supabase is not configured, bypass auth and use local admin
    if (!isSupabaseConfigured()) {
      setUser(LOCAL_ADMIN_USER);
      setRole('admin');
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Detect invite or recovery link in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setNeedsPasswordSet(true);
    }

    // Get initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setRole(getRoleFromUser(session?.user ?? null));
      setLoading(false);
    });

    // Listen for subsequent auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordSet(true);
      }
      setUser(session?.user ?? null);
      setRole(getRoleFromUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Not configured';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function updatePassword(password: string): Promise<string | null> {
    if (!supabase) return 'Not configured';
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setNeedsPasswordSet(false);
    return error?.message ?? null;
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, needsPasswordSet, signInWithEmail, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
