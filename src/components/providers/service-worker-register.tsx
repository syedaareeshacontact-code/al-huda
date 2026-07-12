'use client';

import { useEffect } from 'react';

async function clearAppCaches() {
  if (!('caches' in window)) {
    return;
  }

  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith('alhuda-'))
      .map((key) => caches.delete(key))
  );
}

async function unregisterServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      const cleanupDevState = async () => {
        try {
          await unregisterServiceWorkers();
          await clearAppCaches();
        } catch {
          // keep local development resilient even if cleanup fails
        }
      };

      void cleanupDevState();
      return;
    }

    let cancelled = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const buildVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v3';

    const reloadAfterUpgrade = () => {
      if (!hadController || cancelled) return;

      const reloadKey = `alhuda:sw-reload:${buildVersion}`;
      try {
        if (window.sessionStorage.getItem(reloadKey) === '1') return;
        window.sessionStorage.setItem(reloadKey, '1');
      } catch {
        // A reload is still safe when session storage is unavailable.
      }

      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', reloadAfterUpgrade);

    const register = async () => {
      if (cancelled) return;

      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${encodeURIComponent(buildVersion)}`,
          { updateViaCache: 'none' }
        );
        await registration.update();
      } catch {
        // service worker is optional
      }
    };

    const scheduleRegistration = () => {
      if (cancelled) return;

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => void register(), { timeout: 5000 });
        return;
      }

      globalThis.setTimeout(() => void register(), 1500);
    };

    if (document.readyState === 'complete') {
      scheduleRegistration();
    } else {
      window.addEventListener('load', scheduleRegistration, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', scheduleRegistration);
      navigator.serviceWorker.removeEventListener('controllerchange', reloadAfterUpgrade);
    };
  }, []);

  return null;
}
