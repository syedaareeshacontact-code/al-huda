'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

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

    const deviceId = getSiteDeviceId();

    const syncGrantedSubscription = async () => {
      const storedOwner = window.localStorage.getItem(OWNER_KEY);
      if (!isAuthenticated && storedOwner === 'user') {
        return;
      }

      await syncPushSubscription(deviceId, pathname);
    };

    const reconcileDisabledPermission = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      await removeGuestDevice(deviceId, subscription?.endpoint);

      const storedOwner = window.localStorage.getItem(OWNER_KEY);
      if (storedOwner === 'guest' || isAuthenticated) {
        window.localStorage.removeItem(OWNER_KEY);
      }
    };

    const reconcile = async () => {
      if (Notification.permission === 'granted') {
        await syncGrantedSubscription();
        return;
      }

      if (Notification.permission === 'denied') {
        await reconcileDisabledPermission();
      }
    };

    void reconcile();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcile();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, pathname, sessionReady]);

  return null;
}
