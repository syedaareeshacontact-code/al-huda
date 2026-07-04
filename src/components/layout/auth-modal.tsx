'use client';

import {
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { AUTH_CHANGED_EVENT } from '@/lib/quran-user-state';
import { cn } from '@/lib/utils';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  imageUrl?: string | null;
  isAdmin?: boolean;
}

interface AuthPayload {
  user?: SessionUser;
  message?: string;
}

type AuthTab = 'signin' | 'signup';

export const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';

interface OpenAuthModalDetail {
  tab?: AuthTab;
  reason?: string;
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: SessionUser) => void;
  initialTab?: AuthTab;
  reason?: string | null;
}

export default function AuthModal({
  open,
  onClose,
  onAuthenticated,
  initialTab = 'signin',
  reason = null,
}: AuthModalProps) {
  const [authTab, setAuthTab] = useState<AuthTab>(initialTab);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (open) {
      setAuthTab(initialTab);
      setAuthError(null);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        setAuthError('Google sign-in failed.');
        setGoogleLoading(false);
        return;
      }

      setAuthSubmitting(true);
      setGoogleLoading(true);
      setAuthError(null);

      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential }),
        });
        const data = (await res.json()) as AuthPayload;
        if (!res.ok) {
          setAuthError(data.message ?? 'Unable to sign in with Google.');
          return;
        }
        if (data.user) {
          onAuthenticated(data.user);
          onClose();
          window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
          window.location.reload();
        }
      } catch {
        setAuthError('Unable to sign in with Google right now.');
      } finally {
        setAuthSubmitting(false);
        setGoogleLoading(false);
      }
    },
    [onAuthenticated, onClose]
  );

  useEffect(() => {
    if (!googleClientId || !open) return;

    const initializeGoogle = () => {
      const google = (window as Window & { google?: { accounts?: { id?: { initialize: (config: object) => void; prompt: () => void } } } }).google;
      if (!google?.accounts?.id) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        ux_mode: 'popup',
      });
      setGoogleReady(true);
    };

    if ((window as Window & { google?: unknown }).google) {
      initializeGoogle();
      return;
    }

    const existingScript = document.getElementById('google-identity-service');
    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogle);
      return () => existingScript.removeEventListener('load', initializeGoogle);
    }

    const script = document.createElement('script');
    script.id = 'google-identity-service';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);
  }, [googleClientId, open, handleGoogleCredentialResponse]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });
      const data = (await res.json()) as AuthPayload;
      if (!res.ok) {
        setAuthError(data.message ?? 'Unable to sign in.');
        return;
      }
      if (data.user) {
        onAuthenticated(data.user);
        onClose();
        window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
        window.location.reload();
      }
    } catch {
      setAuthError('Unable to sign in right now.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signUpName, email: signUpEmail, password: signUpPassword }),
      });
      const data = (await res.json()) as AuthPayload;
      if (!res.ok) {
        setAuthError(data.message ?? 'Unable to create account.');
        return;
      }
      if (data.user) {
        onAuthenticated(data.user);
        onClose();
        window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
        window.location.reload();
      }
    } catch {
      setAuthError('Unable to create account right now.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!googleClientId) {
      setAuthError('Google sign-in is not configured.');
      return;
    }
    if (!googleReady) {
      setAuthError('Google sign-in is still loading.');
      return;
    }

    setAuthError(null);
    setGoogleLoading(true);

    try {
      const google = (window as Window & { google?: { accounts?: { id?: { prompt: () => void } } } }).google;
      google?.accounts?.id?.prompt();
      window.setTimeout(() => setGoogleLoading(false), 4500);
    } catch {
      setAuthError('Unable to start Google sign-in.');
      setGoogleLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        onClick={() => !authSubmitting && onClose()}
        aria-label="Close authentication dialog"
        className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-black/60 backdrop-blur-[2px]"
      />

      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className="animate-fade-up w-full max-w-md rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_42%)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                Account Access
              </p>
              <h3 id="auth-modal-title" className="mt-1 font-display text-2xl text-[var(--color-heading)]">
                Welcome to Read al Quran
              </h3>
              <p className="mt-1 text-sm text-[var(--color-muted-text)]">
                {reason ? `Please sign in to ${reason}.` : 'Sign in or create an account to continue.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={authSubmitting}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted-text)] hover:text-[var(--color-heading)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
            {(['signin', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setAuthTab(tab);
                  setAuthError(null);
                }}
                className={cn(
                  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition',
                  authTab === tab
                    ? 'border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent-soft)] shadow-[var(--shadow-soft)]'
                    : 'border border-transparent text-[var(--color-muted-text)]'
                )}
              >
                {tab === 'signin' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {tab === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={!googleReady || authSubmitting}
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm font-bold text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {googleLoading ? 'Opening Google...' : 'Continue with Google'}
          </button>

          <div className="mb-4 flex items-center gap-3 text-xs text-[var(--color-muted-text)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            <span>or</span>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          {authError && (
            <div className="mb-3 rounded-xl border border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-surface),white_8%)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
              {authError}
            </div>
          )}

          {authTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <div>
                <label htmlFor="auth-si-email" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-si-email" type="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} autoComplete="email" required className="pl-9" />
                </div>
              </div>
              <div>
                <label htmlFor="auth-si-pass" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-si-pass" type="password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} autoComplete="current-password" required className="pl-9" />
                </div>
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--color-accent),transparent_30%)] disabled:opacity-70"
              >
                {authSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="flex flex-col gap-3">
              <div>
                <label htmlFor="auth-su-name" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Name
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-su-name" type="text" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} autoComplete="name" required className="pl-9" />
                </div>
              </div>
              <div>
                <label htmlFor="auth-su-email" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-su-email" type="email" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} autoComplete="email" required className="pl-9" />
                </div>
              </div>
              <div>
                <label htmlFor="auth-su-pass" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-su-pass" type="password" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} autoComplete="new-password" minLength={8} required className="pl-9" />
                </div>
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--color-accent),transparent_30%)] disabled:opacity-70"
              >
                {authSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export type { SessionUser, AuthTab, OpenAuthModalDetail };
