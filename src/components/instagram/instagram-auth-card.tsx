'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  LockKeyhole,
  MoonStar,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import InstagramGoogleSignin from '@/components/instagram/instagram-google-signin';
import InstagramEmailAuth from '@/components/instagram/instagram-email-auth';
import { trackClientEvent } from '@/lib/analytics/client-events';
import {
  getClientSession,
  invalidateClientSession,
  type ClientSessionUser,
} from '@/lib/client-session';
import {
  GOOGLE_SIGNIN_SUCCESS_EVENT,
  type GoogleSigninSuccessDetail,
} from '@/lib/auth/events';
import { getCanonicalSurahPathById } from '@/lib/quran-index';
import { AUTH_CHANGED_EVENT } from '@/lib/quran-user-state';
import type { LastReadEntry } from '@/types/quran';

export type InstagramAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

function attributionParams(attribution: InstagramAttribution) {
  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
  };
}

export default function InstagramAuthCard({
  attribution,
}: {
  attribution: InstagramAttribution;
}) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [lastRead, setLastRead] = useState<LastReadEntry | null>(null);
  const [showSigninNotice, setShowSigninNotice] = useState(false);
  const viewTrackedRef = useRef(false);
  const analyticsParams = useMemo(() => attributionParams(attribution), [attribution]);
  const trackGoogleSigninStart = useCallback(() => {
    trackClientEvent('google_signin_click', analyticsParams);
  }, [analyticsParams]);

  const handleEmailAuthenticated = useCallback((authenticatedUser: ClientSessionUser) => {
    invalidateClientSession();
    setUser(authenticatedUser);
    setStatus('signed-in');
    setShowSigninNotice(false);
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
  }, []);

  useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackClientEvent('instagram_landing_view', analyticsParams);
  }, [analyticsParams]);

  useEffect(() => {
    let active = true;

    const loadQuranState = async () => {
      try {
        const response = await fetch('/api/auth/quran-state', { cache: 'no-store' });
        if (!response.ok) throw new Error('Quran state unavailable');
        const payload = (await response.json()) as { lastRead?: LastReadEntry | null };
        if (active) setLastRead(payload.lastRead ?? null);
      } catch {
        if (active) setLastRead(null);
      }
    };

    const loadSession = async (force = false) => {
      try {
        const payload = await getClientSession(force ? { force: true } : undefined);
        if (!active) return;

        setUser(payload.user);
        setStatus(payload.user ? 'signed-in' : 'signed-out');
        if (payload.user) {
          void loadQuranState();
        } else {
          setLastRead(null);
        }
      } catch {
        if (active) {
          setUser(null);
          setLastRead(null);
          setStatus('signed-out');
        }
      }
    };

    const handleAuthChanged = () => void loadSession(true);
    const handleGoogleSuccess = (event: Event) => {
      const detail = (event as CustomEvent<GoogleSigninSuccessDetail>).detail;
      if (detail?.user && active) {
        setUser(detail.user);
        setStatus('signed-in');
        setShowSigninNotice(false);
      }
      trackClientEvent('google_signin_success', analyticsParams);
    };

    void loadSession();
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener(GOOGLE_SIGNIN_SUCCESS_EVENT, handleGoogleSuccess);

    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener(GOOGLE_SIGNIN_SUCCESS_EVENT, handleGoogleSuccess);
    };
  }, [analyticsParams]);

  const continuePath = lastRead
    ? `${getCanonicalSurahPathById(lastRead.surahId) ?? '/surah'}#ayah-${lastRead.ayahNumber}`
    : null;

  const trackReading = (destination: string) => {
    trackClientEvent('start_reading_click', {
      ...analyticsParams,
      content_destination: destination,
    });
  };

  if (status === 'signed-in' && user) {
    const firstName = user.name.trim().split(/\s+/)[0] || 'Friend';
    const listeningPath = getCanonicalSurahPathById(1) ?? '/surah';

    return (
      <section
        className="rounded-[1.65rem] border border-[var(--ig-border-strong)] bg-[var(--ig-card)] p-5 shadow-[var(--ig-card-shadow)] backdrop-blur-xl sm:p-6"
        aria-labelledby="instagram-welcome-heading"
        aria-live="polite"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,var(--ig-accent),var(--ig-accent-deep))] text-white shadow-[0_14px_30px_-16px_var(--ig-accent)]">
          <MoonStar className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--ig-accent)]">
          You&apos;re all set
        </p>
        <h2
          id="instagram-welcome-heading"
          className="mt-2 font-display text-3xl font-semibold leading-tight text-[var(--ig-heading)]"
        >
          Welcome, {firstName}! <span aria-hidden="true">🌙</span>
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ig-muted)]">
          Begin today&apos;s journey with the Quran.
        </p>

        <div className="mt-6 grid gap-2.5">
          <Link
            href="/surah"
            onClick={() => trackReading('surah_index')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--ig-accent),var(--ig-accent-deep))] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_32px_-18px_var(--ig-accent)] outline-none hover:-translate-y-0.5 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Read the Quran
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={listeningPath}
            onClick={() => trackReading('quran_audio')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--ig-border-strong)] bg-[var(--ig-surface-solid)] px-4 py-3 text-sm font-bold text-[var(--ig-heading)] outline-none hover:border-[var(--ig-accent)] hover:text-[var(--ig-accent)] focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
          >
            <Headphones className="h-4 w-4" aria-hidden="true" />
            Listen to the Quran
          </Link>
          {continuePath ? (
            <Link
              href={continuePath}
              onClick={() => trackReading('continue_reading')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--ig-accent)] outline-none hover:bg-[var(--ig-icon-bg)] focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Continue Reading
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-[1.65rem] border border-[var(--ig-border-strong)] bg-[var(--ig-card)] p-5 shadow-[var(--ig-card-shadow)] backdrop-blur-xl sm:p-6"
      aria-labelledby="instagram-signin-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--ig-accent)]">
            One peaceful step
          </p>
          <h2
            id="instagram-signin-heading"
            className="mt-2 font-display text-3xl font-semibold leading-tight text-[var(--ig-heading)] sm:text-[2rem]"
          >
            Start Your Quran Journey
          </h2>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--ig-border)] bg-[var(--ig-icon-bg)] text-[var(--ig-accent)]">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--ig-muted)]">
        Continue securely with your Google account.
      </p>

      <div className="mt-5">
        {status === 'loading' ? (
          <div className="mx-auto flex min-h-11 w-full max-w-[400px] items-center justify-center rounded border border-[#dadce0] bg-white text-sm font-medium text-[#3c4043] opacity-75">
            Checking secure session…
          </div>
        ) : (
          <InstagramGoogleSignin
            onSigninStart={trackGoogleSigninStart}
          />
        )}
      </div>

      {status !== 'loading' ? (
        <InstagramEmailAuth onAuthenticated={handleEmailAuthenticated} />
      ) : null}

      <div className="mt-4 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ig-heading)]">
          <LockKeyhole className="h-3.5 w-3.5 text-[var(--ig-accent)]" aria-hidden="true" />
          Secure Google Sign-In
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-[var(--ig-muted)]">
          We never access your Google password.
        </p>
        <p className="mt-2 text-[11px] text-[var(--ig-muted)]">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="font-semibold underline underline-offset-2 hover:text-[var(--ig-accent)]">
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy-policy"
            className="font-semibold underline underline-offset-2 hover:text-[var(--ig-accent)]"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--ig-border)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ig-muted)]">
          or
        </span>
        <span className="h-px flex-1 bg-[var(--ig-border)]" />
      </div>

      <button
        type="button"
        aria-disabled="true"
        aria-describedby={showSigninNotice ? 'instagram-signin-required' : undefined}
        onClick={() => {
          setShowSigninNotice(true);
          trackClientEvent('continue_without_signin', {
            ...analyticsParams,
            content_destination: 'surah_index',
            access_state: 'signin_required',
          });
        }}
        className="group inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--ig-muted)] opacity-75 outline-none hover:bg-[var(--ig-icon-bg)] focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
      >
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        Explore the website
      </button>

      {showSigninNotice ? (
        <div
          id="instagram-signin-required"
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-[var(--ig-border-strong)] bg-[var(--ig-icon-bg)] px-3.5 py-3 text-left text-xs leading-5 text-[var(--ig-text)] animate-fade-in"
        >
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ig-accent)]" aria-hidden="true" />
          <span>
            <strong className="block text-[var(--ig-heading)]">Please sign in first.</strong>
            Sign in with Google to explore the Read Al Quran website.
          </span>
        </div>
      ) : null}
    </section>
  );
}
