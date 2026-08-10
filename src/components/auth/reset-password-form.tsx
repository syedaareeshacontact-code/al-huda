'use client';

import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { Input } from '@/components/ui/input';

interface ResetPasswordFormProps {
  token: string;
}

interface ResetResponse {
  message?: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('This password reset link is invalid or incomplete.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as ResetResponse;
      if (!response.ok) {
        setError(data.message ?? 'Unable to reset your password.');
        return;
      }

      setComplete(true);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Unable to reset your password right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (complete) {
    return (
      <div className="text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--color-success),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-success),transparent_88%)] text-[var(--color-success)]">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-5 font-display text-3xl text-[var(--color-heading)]">
          Password updated
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--color-muted-text)]">
          Your new password is active and you are securely signed in.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)]"
        >
          Continue to Read al Quran
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent-soft)]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Secure account recovery
          </p>
          <h1 className="mt-1 font-display text-3xl text-[var(--color-heading)]">
            Create a new password
          </h1>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-[var(--color-muted-text)]">
        Use at least 8 characters. Your other signed-in sessions will be invalidated for security.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-danger),transparent_92%)] px-3.5 py-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="reset-password"
            className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-text)]"
          >
            New password
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
            <Input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
              className="h-11 px-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-muted-text)] hover:text-[var(--color-heading)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-reset-password"
            className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-text)]"
          >
            Confirm password
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
            <Input
              id="confirm-reset-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
              className="h-11 pl-9"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !token}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {submitting ? 'Updating password…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
