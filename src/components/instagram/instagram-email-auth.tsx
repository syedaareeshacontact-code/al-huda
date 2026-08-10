'use client';

import {
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { ClientSessionUser } from '@/lib/client-session';

type AuthMode = 'signin' | 'signup';

type AuthPayload = {
  user?: ClientSessionUser;
  message?: string;
  code?: string;
  email?: string;
  verificationRequired?: boolean;
};

type InstagramEmailAuthProps = {
  onAuthenticated: (user: ClientSessionUser) => void;
};

const inputClassName =
  'h-11 w-full rounded-xl border border-[var(--ig-border)] bg-[var(--ig-surface-solid)] px-3 text-sm text-[var(--ig-text)] outline-none transition placeholder:text-[var(--ig-muted)] focus:border-[var(--ig-accent)] focus:ring-2 focus:ring-[var(--ig-ring)]';

export default function InstagramEmailAuth({
  onAuthenticated,
}: InstagramEmailAuthProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'signup'
            ? { name, email, password }
            : { email, password }
        ),
      });
      const payload = (await response.json()) as AuthPayload;

      if (payload.verificationRequired) {
        setNotice(
          payload.message ??
            `Check ${payload.email ?? email} for a verification link to activate your account.`
        );
        setPassword('');
        return;
      }

      if (!response.ok) {
        setError(payload.message ?? 'Unable to complete this request.');
        return;
      }

      if (payload.user) {
        onAuthenticated(payload.user);
      }
    } catch {
      setError(
        mode === 'signin'
          ? 'Unable to sign in right now. Please try again.'
          : 'Unable to create your account right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-5 border-t border-[var(--ig-border)] pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-[var(--ig-heading)]">Or continue with email</p>
        <span className="text-[10px] text-[var(--ig-muted)]">No Google account needed</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--ig-border)] bg-[var(--ig-icon-bg)] p-1">
        {(['signin', 'signup'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchMode(tab)}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)] ${
              mode === tab
                ? 'bg-[var(--ig-surface-solid)] text-[var(--ig-accent)] shadow-sm'
                : 'text-[var(--ig-muted)] hover:text-[var(--ig-heading)]'
            }`}
          >
            {tab === 'signin' ? (
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mb-3 rounded-xl border border-[var(--ig-border-strong)] bg-[var(--ig-icon-bg)] px-3 py-2 text-xs leading-5 text-[var(--ig-text)]"
        >
          {notice}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-3">
        {mode === 'signup' ? (
          <div>
            <label
              htmlFor="instagram-signup-name"
              className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ig-muted)]"
            >
              Name
            </label>
            <div className="relative">
              <UserRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ig-muted)]"
                aria-hidden="true"
              />
              <input
                id="instagram-signup-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
                className={`${inputClassName} pl-9`}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="instagram-auth-email"
            className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ig-muted)]"
          >
            Email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ig-muted)]"
              aria-hidden="true"
            />
            <input
              id="instagram-auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={320}
              required
              className={`${inputClassName} pl-9`}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="instagram-auth-password"
            className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ig-muted)]"
          >
            Password
          </label>
          <div className="relative">
            <KeyRound
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ig-muted)]"
              aria-hidden="true"
            />
            <input
              id="instagram-auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={mode === 'signup' ? 8 : undefined}
              maxLength={128}
              required
              className={`${inputClassName} pl-9`}
            />
          </div>
          {mode === 'signup' ? (
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--ig-muted)]">
              Minimum 8 characters. We&apos;ll send a verification link to your email.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--ig-accent),var(--ig-accent-deep))] px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_32px_-18px_var(--ig-accent)] outline-none transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
        >
          {mode === 'signin'
            ? submitting
              ? 'Signing in…'
              : 'Sign in with email'
            : submitting
              ? 'Creating account…'
              : 'Create account'}
        </button>
      </form>
    </div>
  );
}
