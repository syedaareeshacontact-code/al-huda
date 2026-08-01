'use client';

import { useEffect } from 'react';

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

const DEVICE_ID_KEY = 'alhuda:guest-push-device-id';
const OWNER_KEY = 'alhuda:push-subscription-owner';
const PROMPT_ATTEMPT_KEY = 'alhuda:guest-push-prompt-attempted';
const PUSH_ENDPOINT_KEY = 'alhuda:push-subscription-endpoint';

function createDeviceId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

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

async function saveSubscription(
  subscription: PushSubscription,
  deviceId: string
) {
  window.localStorage.setItem(PUSH_ENDPOINT_KEY, subscription.endpoint);

  const response = await fetch('/api/push/guest-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      ...subscription.toJSON(),
      timeZone: getBrowserTimeZone(),
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GuestSubscriptionResponse;
  if (payload.owner === 'guest' || payload.owner === 'user') {
    window.localStorage.setItem(OWNER_KEY, payload.owner);
  }
  return payload.owner ?? null;
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
    let promptTimer: number | null = null;
    let removeGestureListeners = () => {};
    const deviceId = getDeviceId();

    const syncGrantedSubscription = async () => {
      const storedOwner = window.localStorage.getItem(OWNER_KEY);
      if (!isAuthenticated && storedOwner === 'user') {
        return;
      }

      const publicKey = await loadPushConfig();
      if (!publicKey || cancelled) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      if (cancelled) {
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      if (!cancelled) {
        await saveSubscription(subscription, deviceId);
      }
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

    const requestPermissionAndSync = async (fromGesture: boolean) => {
      if (cancelled || Notification.permission !== 'default') {
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'default' || fromGesture) {
          window.localStorage.setItem(
            PROMPT_ATTEMPT_KEY,
            `${permission}:${new Date().toISOString()}`
          );
        }

        if (permission === 'granted' && !cancelled) {
          await syncGrantedSubscription();
        } else if (permission === 'denied' && !cancelled) {
          await reconcileDisabledPermission();
        }
      } catch {
        if (fromGesture) {
          window.localStorage.setItem(
            PROMPT_ATTEMPT_KEY,
            `failed:${new Date().toISOString()}`
          );
        }
      }
    };

    const installGestureFallback = () => {
      const onGesture = () => {
        removeGestureListeners();
        void requestPermissionAndSync(true);
      };

      window.addEventListener('pointerdown', onGesture, { once: true, capture: true });
      window.addEventListener('keydown', onGesture, { once: true, capture: true });
      removeGestureListeners = () => {
        window.removeEventListener('pointerdown', onGesture, true);
        window.removeEventListener('keydown', onGesture, true);
      };
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

      if (
        isAuthenticated ||
        window.localStorage.getItem(OWNER_KEY) === 'user' ||
        window.localStorage.getItem(PROMPT_ATTEMPT_KEY)
      ) {
        return;
      }

      const publicKey = await loadPushConfig();
      if (!publicKey || cancelled) {
        return;
      }

      promptTimer = window.setTimeout(async () => {
        await requestPermissionAndSync(false);
        if (
          !cancelled &&
          Notification.permission === 'default' &&
          !window.localStorage.getItem(PROMPT_ATTEMPT_KEY)
        ) {
          installGestureFallback();
        }
      }, 1200);
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
      if (promptTimer !== null) {
        window.clearTimeout(promptTimer);
      }
      removeGestureListeners();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, sessionReady]);

  return null;
}
