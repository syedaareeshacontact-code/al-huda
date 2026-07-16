'use client';

import { useEffect, useState, type ComponentType } from 'react';
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
} from '@/components/providers/analytics-consent';

const ANALYTICS_DELAY_MS = 60_000;

export default function DeferredAnalytics({ gaId }: { gaId: string }) {
  const [Analytics, setAnalytics] = useState<ComponentType<{ gaId: string }> | null>(null);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setConsented(window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'accepted');
    };
    syncConsent();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncConsent);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    if (!gaId || !consented) return;

    let active = true;
    let requested = false;
    const enable = () => {
      if (!active || requested) return;
      requested = true;

      void import('@next/third-parties/google').then((module) => {
        if (active) setAnalytics(() => module.GoogleAnalytics);
      }).catch(() => undefined);
    };

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
    ];
    events.forEach((eventName) =>
      window.addEventListener(eventName, enable, { once: true, passive: true })
    );
    const timer = window.setTimeout(enable, ANALYTICS_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, enable));
    };
  }, [consented, gaId]);

  return Analytics ? <Analytics gaId={gaId} /> : null;
}
