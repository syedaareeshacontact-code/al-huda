'use client';

import { BellRing, Loader2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getSiteDeviceId } from '@/lib/engagement/client-device-id';
import { getPushContentPreferenceFromPath } from '@/lib/push/engagement-types';

interface GuestPushEnrollmentProps {
  isAuthenticated: boolean;
  sessionReady: boolean;
}

interface WebPushConfig {
  enabled?: boolean;
  publicKey?: string;
}

interface GuestSubscriptionResponse {
  owner?: 'guest' | 'user';
}

const OWNER_KEY = 'alhuda:push-subscription-owner';
const PUSH_ENDPOINT_KEY = 'alhuda:push-subscription-endpoint';
const PUSH_OPEN_TOKEN_QUERY_PARAM = 'push_open_token';
const PENDING_PUSH_OPEN_TOKEN_KEY = 'alhuda:pending-push-open-token';
const PUSH_PROMPT_DISMISSED_AT_KEY = 'alhuda:push-prompt-dismissed-at';
const PUSH_PROMPT_DELAY_MS = 4_000;
const PUSH_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

async function loadPushConfig() {
  const response = await fetch('/api/push/public-key', { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as WebPushConfig;
  if (!payload.enabled || !payload.publicKey) {
    return null;
  }

  return payload.publicKey;
}

function takePushOpenTokenFromUrl() {
  const url = new URL(window.location.href);
  const fragmentParams = new URLSearchParams(url.hash.slice(1));
  const trackingToken = (
    url.searchParams.get(PUSH_OPEN_TOKEN_QUERY_PARAM) ??
    fragmentParams.get(PUSH_OPEN_TOKEN_QUERY_PARAM)
  )?.trim();
  if (!trackingToken) {
    return null;
  }

  url.searchParams.delete(PUSH_OPEN_TOKEN_QUERY_PARAM);
  if (fragmentParams.has(PUSH_OPEN_TOKEN_QUERY_PARAM)) {
    const originalHash = fragmentParams.get('target_hash')?.trim();
    url.hash = originalHash ? `#${originalHash}` : '';
  }
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`
  );
  return trackingToken;
}

function shouldShowPushPrompt() {
  try {
    const dismissedAt = Number(
      window.localStorage.getItem(PUSH_PROMPT_DISMISSED_AT_KEY)
    );

    return (
      !Number.isFinite(dismissedAt) ||
      dismissedAt <= 0 ||
      Date.now() - dismissedAt >= PUSH_PROMPT_SNOOZE_MS
    );
  } catch {
    return true;
  }
}

function snoozePushPrompt() {
  try {
    window.localStorage.setItem(
      PUSH_PROMPT_DISMISSED_AT_KEY,
      String(Date.now())
    );
  } catch {
    // The prompt can still be closed for the current page session.
  }
}

function clearPushPromptSnooze() {
  try {
    window.localStorage.removeItem(PUSH_PROMPT_DISMISSED_AT_KEY);
  } catch {
    // Notification enrollment still succeeds when storage is unavailable.
  }
}

async function saveSubscription(
  subscription: PushSubscription,
  deviceId: string,
  pathname: string
) {
  const response = await fetch('/api/push/guest-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      ...subscription.toJSON(),
      timeZone: getBrowserTimeZone(),
      contentPreference: getPushContentPreferenceFromPath(pathname),
    }),
  });

  if (!response.ok) {
    return null;
  }

  window.localStorage.setItem(PUSH_ENDPOINT_KEY, subscription.endpoint);

  const payload = (await response.json()) as GuestSubscriptionResponse;
  if (payload.owner === 'guest' || payload.owner === 'user') {
    window.localStorage.setItem(OWNER_KEY, payload.owner);
  }
  return payload.owner ?? null;
}

async function syncPushSubscription(deviceId: string, pathname: string) {
  const publicKey = await loadPushConfig();
  if (!publicKey) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const owner = await saveSubscription(subscription, deviceId, pathname);
  return Boolean(owner);
}

async function removeGuestDevice(deviceId: string, endpoint?: string) {
  const storedEndpoint = window.localStorage.getItem(PUSH_ENDPOINT_KEY) ?? undefined;
  const subscriptionEndpoint = endpoint ?? storedEndpoint;

  await fetch('/api/push/guest-subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      currentBrowser: true,
      ...(subscriptionEndpoint ? { endpoint: subscriptionEndpoint } : {}),
    }),
  }).catch(() => undefined);
  window.localStorage.removeItem(PUSH_ENDPOINT_KEY);
}

export default function GuestPushEnrollment({
  isAuthenticated,
  sessionReady,
}: GuestPushEnrollmentProps) {
  const pathname = usePathname();
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const promptTimerRef = useRef<number | null>(null);

  const clearPromptTimer = useCallback(() => {
    if (promptTimerRef.current !== null) {
      window.clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') {
      return;
    }

    const tokenFromUrl = takePushOpenTokenFromUrl();
    if (tokenFromUrl) {
      try {
        window.sessionStorage.setItem(PENDING_PUSH_OPEN_TOKEN_KEY, tokenFromUrl);
      } catch {
        // The URL token is still used for this page load when storage is unavailable.
      }
    }

    const trackingToken =
      tokenFromUrl ??
      (() => {
        try {
          return window.sessionStorage.getItem(PENDING_PUSH_OPEN_TOKEN_KEY);
        } catch {
          return null;
        }
      })();
    if (!trackingToken) {
      return;
    }

    let cancelled = false;

    const recordOpen = async () => {
      try {
        const response = await fetch('/api/push/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          keepalive: true,
          body: JSON.stringify({ token: trackingToken }),
        });

        if (!cancelled && (response.ok || response.status === 400 || response.status === 401)) {
          try {
            window.sessionStorage.removeItem(PENDING_PUSH_OPEN_TOKEN_KEY);
          } catch {
            // The backend deduplicates delivery IDs if this cleanup is unavailable.
          }
        }
      } catch {
        // Keep the token in session storage and retry when the browser reconnects.
      }
    };

    void recordOpen();
    window.addEventListener('online', recordOpen);

    return () => {
      cancelled = true;
      window.removeEventListener('online', recordOpen);
    };
  }, []);

  useEffect(() => {
    if (
      !sessionReady ||
      process.env.NODE_ENV !== 'production' ||
      typeof window === 'undefined' ||
      !window.isSecureContext ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return;
    }

    let cancelled = false;
    const deviceId = getSiteDeviceId();

    const hidePrompt = () => {
      clearPromptTimer();
      setPromptVisible(false);
      setPromptMessage('');
    };

    const syncGrantedSubscription = async () => {
      const storedOwner = window.localStorage.getItem(OWNER_KEY);
      if (!isAuthenticated && storedOwner === 'user') {
        hidePrompt();
        return;
      }

      const saved = await syncPushSubscription(deviceId, pathname);
      if (!cancelled && saved) {
        clearPushPromptSnooze();
        hidePrompt();
      }
    };

    const reconcileDisabledPermission = async () => {
      hidePrompt();
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      await removeGuestDevice(deviceId, subscription?.endpoint);

      const storedOwner = window.localStorage.getItem(OWNER_KEY);
      if (storedOwner === 'guest' || isAuthenticated) {
        window.localStorage.removeItem(OWNER_KEY);
      }
    };

    const schedulePrompt = async () => {
      if (!shouldShowPushPrompt()) {
        return;
      }

      const publicKey = await loadPushConfig().catch(() => null);
      if (!publicKey || cancelled || Notification.permission !== 'default') {
        return;
      }

      clearPromptTimer();
      promptTimerRef.current = window.setTimeout(() => {
        if (!cancelled && Notification.permission === 'default') {
          setPromptVisible(true);
        }
        promptTimerRef.current = null;
      }, PUSH_PROMPT_DELAY_MS);
    };

    const reconcile = async () => {
      if (Notification.permission === 'granted') {
        await syncGrantedSubscription();
        return;
      }

      if (Notification.permission === 'denied') {
        await reconcileDisabledPermission();
        return;
      }

      await schedulePrompt();
    };

    void reconcile();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcile();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearPromptTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearPromptTimer, isAuthenticated, pathname, sessionReady]);

  const dismissPrompt = () => {
    snoozePushPrompt();
    setPromptVisible(false);
    setPromptMessage('');
  };

  const enableNotifications = async () => {
    if (promptBusy || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      setPromptBusy(true);
      setPromptMessage('');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPromptMessage(
          permission === 'denied'
            ? 'Notifications are blocked. Allow them from your browser site settings.'
            : 'Permission was not allowed. You can try again when ready.'
        );
        return;
      }

      const saved = await syncPushSubscription(getSiteDeviceId(), pathname);
      if (!saved) {
        setPromptMessage('We could not save this device. Please try again.');
        return;
      }

      clearPushPromptSnooze();
      setPromptVisible(false);
    } catch {
      setPromptMessage('Notifications could not be enabled on this browser.');
    } finally {
      setPromptBusy(false);
    }
  };

  if (!promptVisible || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="push-opt-in-title"
      aria-describedby="push-opt-in-description"
      className="fixed bottom-4 left-1/2 z-[220] w-[min(26rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:bottom-5 sm:left-auto sm:right-5 sm:translate-x-0"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-accent),transparent)] opacity-70" />

      <button
        type="button"
        onClick={dismissPrompt}
        aria-label="Close notification prompt"
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-text)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex gap-3 p-4 pr-12 sm:p-5 sm:pr-12">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent)]">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
            Quran reminders
          </p>
          <h2
            id="push-opt-in-title"
            className="mt-1 font-display text-lg font-semibold text-[var(--color-heading)]"
          >
            Stay connected with the Quran
          </h2>
          <p
            id="push-opt-in-description"
            className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted-text)]"
          >
            Get gentle Quran, Hadith and prayer reminders, even when this tab is closed.
            You can turn them off anytime.
          </p>

          {promptMessage ? (
            <p
              role="status"
              className="mt-2 rounded-lg border border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-danger),transparent_92%)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--color-danger)]"
            >
              {promptMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void enableNotifications();
              }}
              disabled={promptBusy || Notification.permission === 'denied'}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {promptBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {Notification.permission === 'denied'
                ? 'Blocked in browser'
                : promptBusy
                  ? 'Enabling'
                  : 'Enable notifications'}
            </button>

            <button
              type="button"
              onClick={dismissPrompt}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-muted-text)] transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </aside>,
    document.body
  );
}
