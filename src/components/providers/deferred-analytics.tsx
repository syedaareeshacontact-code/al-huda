'use client';

import { useEffect, useState, type ComponentType } from 'react';

const ANALYTICS_DELAY_MS = 60_000;

export default function DeferredAnalytics({ gaId }: { gaId: string }) {
  const [Analytics, setAnalytics] = useState<ComponentType<{ gaId: string }> | null>(null);

  useEffect(() => {
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
  }, []);

  return Analytics ? <Analytics gaId={gaId} /> : null;
}
