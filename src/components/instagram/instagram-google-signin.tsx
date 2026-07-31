'use client';

import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  GOOGLE_SIGNIN_SUCCESS_EVENT,
  type GoogleSigninSuccessDetail,
} from '@/lib/auth/events';
import { invalidateClientSession, type ClientSessionUser } from '@/lib/client-session';
import { AUTH_CHANGED_EVENT } from '@/lib/quran-user-state';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentity = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode: 'popup';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: 'standard';
      theme: 'outline';
      size: 'large';
      text: 'signin_with';
      shape: 'rectangular';
      logo_alignment: 'left';
      width: number;
    }
  ) => void;
};

type GoogleWindow = Window & {
  google?: {
    accounts?: {
      id?: GoogleIdentity;
    };
  };
};

type AuthPayload = {
  user?: ClientSessionUser;
  message?: string;
};

export default function InstagramGoogleSignin({ onSigninStart }: { onSigninStart: () => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    onSigninStart();

    if (!response.credential) {
      setError('Google sign-in could not be completed. Please try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const authResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential, source: 'instagram' }),
      });
      const payload = (await authResponse.json()) as AuthPayload;

      if (!authResponse.ok || !payload.user) {
        setError(payload.message ?? 'Google sign-in is currently unavailable.');
        return;
      }

      invalidateClientSession();
      window.dispatchEvent(
        new CustomEvent<GoogleSigninSuccessDetail>(GOOGLE_SIGNIN_SUCCESS_EVENT, {
          detail: { user: payload.user },
        })
      );
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
    } catch {
      setError('Google sign-in is currently unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [onSigninStart]);

  useEffect(() => {
    if (!googleClientId) {
      setError('Google sign-in is not configured.');
      return;
    }

    let active = true;
    const renderGoogleButton = () => {
      if (!active || !buttonRef.current) return;

      const identity = (window as GoogleWindow).google?.accounts?.id;
      if (!identity) {
        setError('Google sign-in could not load. Refresh the page and try again.');
        return;
      }

      identity.initialize({
        client_id: googleClientId,
        callback: handleCredential,
        ux_mode: 'popup',
      });

      const buttonWidth = Math.min(400, Math.max(240, Math.floor(buttonRef.current.clientWidth)));
      buttonRef.current.replaceChildren();
      identity.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonWidth,
      });
      setReady(true);
    };

    if ((window as GoogleWindow).google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        active = false;
      };
    }

    const existingScript = document.getElementById('google-identity-service');
    if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton);
      return () => {
        active = false;
        existingScript.removeEventListener('load', renderGoogleButton);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-identity-service';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', renderGoogleButton);
    script.addEventListener('error', () => {
      if (active) setError('Google sign-in could not load. Check your internet connection.');
    });
    document.head.appendChild(script);

    return () => {
      active = false;
      script.removeEventListener('load', renderGoogleButton);
    };
  }, [googleClientId, handleCredential]);

  return (
    <div>
      <div className="relative mx-auto min-h-11 w-full max-w-[400px]" aria-label="Sign in with Google">
        <div
          ref={buttonRef}
          className={submitting ? 'pointer-events-none opacity-55' : undefined}
        />
        {!ready && !error ? (
          <div className="absolute inset-0 flex min-h-11 items-center justify-center gap-2 rounded border border-[#dadce0] bg-white text-sm font-medium text-[#3c4043]">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading Google sign-in…
          </div>
        ) : null}
        {submitting ? (
          <div className="absolute inset-0 flex min-h-11 items-center justify-center gap-2 rounded bg-white/90 text-sm font-medium text-[#3c4043]">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Signing in securely…
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_65%)] bg-[var(--ig-surface-solid)] px-3 py-2 text-center text-xs leading-5 text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
