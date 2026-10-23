import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { checkIsAdmin, errorMessage } from '../lib/api';

/**
 * loading    – restoring the session from storage
 * signed_out – no Supabase Auth session
 * checking   – signed in, verifying admin_users.user_id
 * admin      – signed in and present in admin_users
 * not_admin  – signed in but not present in admin_users
 * error      – the admin check itself failed (network, RLS, …)
 */
export type AuthStatus = 'loading' | 'signed_out' | 'checking' | 'admin' | 'not_admin' | 'error';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  recheck: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restored, setRestored] = useState(false);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setRestored(true);
    });
    // Keep this callback synchronous — no Supabase calls inside it.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setRestored(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!restored) return;
    if (!userId) {
      setStatus('signed_out');
      setError(null);
      return;
    }
    let cancelled = false;
    setStatus('checking');
    setError(null);
    checkIsAdmin(userId)
      .then((ok) => !cancelled && setStatus(ok ? 'admin' : 'not_admin'))
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err, 'We could not verify admin access.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [restored, userId, nonce]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      if (/invalid login credentials/i.test(err.message)) return 'That email and password combination doesn’t match our records.';
      if (/email not confirmed/i.test(err.message)) return 'Please confirm your email address before signing in.';
      return err.message || 'Sign in failed. Please try again.';
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const recheck = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo<AuthState>(
    () => ({ status, user: session?.user ?? null, error, signIn, signOut, recheck }),
    [status, session, error, signIn, signOut, recheck],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
