'use client';

import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LogIn,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { GOOGLE_SIGNIN_SUCCESS_EVENT } from '@/lib/auth/events';
import { invalidateClientSession } from '@/lib/client-session';
import { resumePendingProtectedDownload } from '@/lib/protected-download-client';
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
  code?: string;
  email?: string;
  verificationRequired?: boolean;
}

type AuthTab = 'signin' | 'signup';
type AuthPanel = 'auth' | 'forgot' | 'forgot-sent' | 'verify-sent';

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
  reloadOnAuthenticated?: boolean;
}

const primaryButtonClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--color-accent),transparent_30%)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65';

const secondaryButtonClass =
  'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] disabled:cursor-not-allowed disabled:opacity-65';

export default function AuthModal({
  open,
  onClose,
  onAuthenticated,
  initialTab = 'signin',
  reason = null,
  reloadOnAuthenticated = true,
}: AuthModalProps) {
  const [authTab, setAuthTab] = useState<AuthTab>(initialTab);
  const [authPanel, setAuthPanel] = useState<AuthPanel>('auth');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);
  const renderedGoogleButtonContainerRef = useRef<HTMLElement | null>(null);

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const completeAuthentication = useCallback(
    (user: SessionUser) => {
      invalidateClientSession();
      onAuthenticated(user);
      const resumedDownload = resumePendingProtectedDownload();
      onClose();
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));

      if (!resumedDownload && reloadOnAuthenticated) {
        window.location.reload();
      }
    },
    [onAuthenticated, onClose, reloadOnAuthenticated]
  );

  useEffect(() => {
    if (!open) return;
    setAuthTab(initialTab);
    setAuthPanel('auth');
    setAuthError(null);
    setAuthNotice(null);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !authSubmitting) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [authSubmitting, open, onClose]);

  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        setAuthError('Google sign-in failed.');
        return;
      }

      setAuthSubmitting(true);
      setAuthError(null);
      setAuthNotice(null);

      try {
        const result = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential }),
        });
        const data = (await result.json()) as AuthPayload;
        if (!result.ok) {
          setAuthError(data.message ?? 'Unable to sign in with Google.');
          return;
        }
        if (data.user) {
          window.dispatchEvent(
            new CustomEvent(GOOGLE_SIGNIN_SUCCESS_EVENT, {
              detail: { user: data.user },
            })
          );
          completeAuthentication(data.user);
        }
      } catch {
        setAuthError('Unable to sign in with Google right now.');
      } finally {
        setAuthSubmitting(false);
      }
    },
    [completeAuthentication]
  );

  useEffect(() => {
    if (!googleClientId || !open || authPanel !== 'auth') {
      setGoogleReady(false);
      renderedGoogleButtonContainerRef.current = null;
      return;
    }

    setGoogleReady(false);

    const initializeGoogle = () => {
      const google = (window as Window & {
        google?: {
          accounts?: {
            id?: {
              initialize: (config: object) => void;
              renderButton: (parent: HTMLElement, options: object) => void;
            };
          };
        };
      }).google;
      const buttonContainer = googleButtonContainerRef.current;
      if (!google?.accounts?.id || !buttonContainer) return;

      if (renderedGoogleButtonContainerRef.current === buttonContainer) {
        setGoogleReady(true);
        return;
      }

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        ux_mode: 'popup',
      });
      buttonContainer.replaceChildren();
      google.accounts.id.renderButton(buttonContainer, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.max(
          200,
          Math.min(400, Math.round(buttonContainer.getBoundingClientRect().width))
        ),
      });
      renderedGoogleButtonContainerRef.current = buttonContainer;
      setGoogleReady(true);
    };

    const handleScriptError = () => {
      setAuthError('Google sign-in could not load. Check your connection and try again.');
    };

    if ((window as Window & { google?: unknown }).google) {
      initializeGoogle();
      return;
    }

    const existingScript = document.getElementById('google-identity-service');
    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogle);
      existingScript.addEventListener('error', handleScriptError);
      return () => {
        existingScript.removeEventListener('load', initializeGoogle);
        existingScript.removeEventListener('error', handleScriptError);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-identity-service';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = handleScriptError;
    document.body.appendChild(script);
  }, [authPanel, googleClientId, handleGoogleCredentialResponse, open]);

  const showPanel = (panel: AuthPanel) => {
    setAuthPanel(panel);
    setAuthError(null);
    setAuthNotice(null);
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });
      const data = (await response.json()) as AuthPayload;
      if (!response.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setVerificationEmail(data.email ?? signInEmail.trim());
          setAuthPanel('verify-sent');
          setAuthNotice(data.message ?? 'Verify your email address to continue.');
          return;
        }
        setAuthError(data.message ?? 'Unable to sign in.');
        return;
      }
      if (data.user) completeAuthentication(data.user);
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
    setAuthNotice(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName,
          email: signUpEmail,
          password: signUpPassword,
        }),
      });
      const data = (await response.json()) as AuthPayload;

      if (data.verificationRequired) {
        setVerificationEmail(data.email ?? signUpEmail.trim());
        setAuthPanel('verify-sent');
        if (response.ok) {
          setAuthNotice(data.message ?? 'Check your inbox to verify your account.');
          setSignUpPassword('');
        } else {
          setAuthError(data.message ?? 'Your account needs email verification.');
        }
        return;
      }

      if (!response.ok) {
        setAuthError(data.message ?? 'Unable to create account.');
        return;
      }
    } catch {
      setAuthError('Unable to create account right now.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = (await response.json()) as AuthPayload;
      if (!response.ok) {
        setAuthError(data.message ?? 'Unable to send a password reset email.');
        return;
      }
      setAuthNotice(data.message ?? 'Check your inbox for a password reset link.');
      setAuthPanel('forgot-sent');
    } catch {
      setAuthError('Unable to process this request right now.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const data = (await response.json()) as AuthPayload;
      if (!response.ok) {
        setAuthError(data.message ?? 'Unable to resend the verification email.');
        return;
      }
      setAuthNotice(data.message ?? 'A fresh verification link has been sent.');
    } catch {
      setAuthError('Unable to resend the verification email right now.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (!open) return null;

  const heading =
    authPanel === 'forgot'
      ? 'Reset your password'
      : authPanel === 'forgot-sent'
        ? 'Check your inbox'
        : authPanel === 'verify-sent'
          ? 'Verify your email'
          : 'Welcome to Read al Quran';

  return (
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        onClick={() => !authSubmitting && onClose()}
        aria-label="Close authentication dialog"
        className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-black/65 backdrop-blur-[3px]"
      />

      <div className="absolute inset-0 grid place-items-center p-3 sm:p-4">
        <div
          className="animate-fade-up max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_42%)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:max-h-[calc(100dvh-2rem)] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                {authPanel === 'auth' ? 'Account access' : 'Account security'}
              </p>
              <h3
                id="auth-modal-title"
                className="mt-1 font-display text-2xl text-[var(--color-heading)]"
              >
                {heading}
              </h3>
              <p className="mt-1 text-sm leading-5 text-[var(--color-muted-text)]">
                {authPanel === 'auth'
                  ? reason
                    ? `Please sign in to ${reason}.`
                    : 'Sign in or create an account to continue.'
                  : authPanel === 'forgot'
                    ? 'We will send a secure reset link to your email.'
                    : 'Follow the secure link sent to your email address.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={authSubmitting}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted-text)] transition hover:text-[var(--color-heading)] disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {authPanel === 'auth' && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
                {(['signin', 'signup'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setAuthTab(tab);
                      setAuthError(null);
                      setAuthNotice(null);
                    }}
                    className={cn(
                      'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition',
                      authTab === tab
                        ? 'border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent-soft)] shadow-[var(--shadow-soft)]'
                        : 'border border-transparent text-[var(--color-muted-text)]'
                    )}
                  >
                    {tab === 'signin' ? (
                      <LogIn className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <div className="relative mb-3 min-h-12 w-full" aria-busy={!googleReady}>
                <div
                  ref={googleButtonContainerRef}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-center',
                    !googleReady && 'opacity-0',
                    authSubmitting && 'pointer-events-none opacity-55'
                  )}
                  aria-label="Sign in with Google"
                />
                {!googleReady && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm font-bold text-[var(--color-muted-text)]">
                    Loading Google sign-in…
                  </div>
                )}
              </div>

              <div className="mb-4 flex items-center gap-3 text-xs text-[var(--color-muted-text)]">
                <span className="h-px flex-1 bg-[var(--color-border)]" />
                <span>or continue with email</span>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
            </>
          )}

          {authError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-danger),transparent_92%)] px-3.5 py-3 text-sm leading-5 text-[var(--color-danger)]"
            >
              {authError}
            </div>
          )}

          {authNotice && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--color-success),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-success),transparent_93%)] px-3.5 py-3 text-sm leading-5 text-[var(--color-text)]"
            >
              {authNotice}
            </div>
          )}

          {authPanel === 'auth' && authTab === 'signin' && (
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <div>
                <label htmlFor="auth-si-email" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-si-email" type="email" value={signInEmail} onChange={(event) => setSignInEmail(event.target.value)} autoComplete="email" maxLength={320} required className="h-11 pl-9" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label htmlFor="auth-si-pass" className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(signInEmail);
                      showPanel('forgot');
                    }}
                    className="text-xs font-semibold text-[var(--color-accent-soft)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-si-pass" type="password" value={signInPassword} onChange={(event) => setSignInPassword(event.target.value)} autoComplete="current-password" maxLength={128} required className="h-11 pl-9" />
                </div>
              </div>
              <button type="submit" disabled={authSubmitting} className={primaryButtonClass}>
                {authSubmitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {authPanel === 'auth' && authTab === 'signup' && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-3">
              <div>
                <label htmlFor="auth-su-name" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Name
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-su-name" type="text" value={signUpName} onChange={(event) => setSignUpName(event.target.value)} autoComplete="name" minLength={2} maxLength={80} required className="h-11 pl-9" />
                </div>
              </div>
              <div>
                <label htmlFor="auth-su-email" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-su-email" type="email" value={signUpEmail} onChange={(event) => setSignUpEmail(event.target.value)} autoComplete="email" maxLength={320} required className="h-11 pl-9" />
                </div>
              </div>
              <div>
                <label htmlFor="auth-su-pass" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-su-pass" type="password" value={signUpPassword} onChange={(event) => setSignUpPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required className="h-11 pl-9" />
                </div>
                <p className="mt-1.5 text-xs text-[var(--color-muted-text)]">
                  Minimum 8 characters. Your account activates after email verification.
                </p>
              </div>
              <button type="submit" disabled={authSubmitting} className={primaryButtonClass}>
                {authSubmitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          {authPanel === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button
                type="button"
                onClick={() => showPanel('auth')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted-text)] hover:text-[var(--color-heading)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                <ShieldCheck className="h-6 w-6 text-[var(--color-accent-soft)]" />
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)]">
                  Enter your account email. The secure reset link will expire after 60 minutes.
                </p>
              </div>
              <div>
                <label htmlFor="auth-forgot-email" className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Account email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input id="auth-forgot-email" type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} autoComplete="email" maxLength={320} required autoFocus className="h-11 pl-9" />
                </div>
              </div>
              <button type="submit" disabled={authSubmitting} className={primaryButtonClass}>
                {authSubmitting ? 'Sending reset link…' : 'Send reset link'}
              </button>
            </form>
          )}

          {authPanel === 'forgot-sent' && (
            <div className="text-center">
              <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--color-success),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-success),transparent_90%)] text-[var(--color-success)]">
                <MailCheck className="h-8 w-8" />
              </span>
              <p className="mt-5 text-sm leading-6 text-[var(--color-muted-text)]">
                If an account exists for <span className="font-semibold text-[var(--color-text)]">{forgotEmail}</span>, its reset link is on the way. Check Spam if it is not in your inbox.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signin');
                  showPanel('auth');
                }}
                className={cn(secondaryButtonClass, 'mt-6')}
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </button>
            </div>
          )}

          {authPanel === 'verify-sent' && (
            <div className="text-center">
              <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_50%)] bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent-soft)]">
                <MailCheck className="h-8 w-8" />
              </span>
              <h4 className="mt-5 font-display text-2xl text-[var(--color-heading)]">
                One secure step remaining
              </h4>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
                Open the verification link sent to{' '}
                <span className="break-all font-semibold text-[var(--color-text)]">
                  {verificationEmail}
                </span>
                . The link expires after 24 hours.
              </p>
              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={authSubmitting}
                  className={primaryButtonClass}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', authSubmitting && 'animate-spin')} />
                  {authSubmitting ? 'Sending…' : 'Resend verification email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signin');
                    setSignInEmail(verificationEmail);
                    showPanel('auth');
                  }}
                  className={secondaryButtonClass}
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </button>
              </div>
              <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted-text)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" />
                Check Inbox, Promotions, and Spam folders.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { SessionUser, AuthTab, OpenAuthModalDetail };
