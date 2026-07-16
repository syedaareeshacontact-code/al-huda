'use client';

import { useEffect, useState } from 'react';

export const ANALYTICS_CONSENT_KEY = 'alhuda:analytics-consent';
export const ANALYTICS_CONSENT_EVENT = 'alhuda:analytics-consent-changed';

type ConsentValue = 'accepted' | 'declined' | null;

export default function AnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    setConsent(stored === 'accepted' || stored === 'declined' ? stored : null);
    setReady(true);
  }, []);

  const choose = (value: Exclude<ConsentValue, null>) => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    setConsent(value);
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
  };

  if (!ready || consent) {
    return null;
  }

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-card)] sm:p-5"
      aria-label="Analytics consent"
    >
      <p className="font-semibold text-[var(--color-heading)]">Optional analytics</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-text)]">
        Allow anonymous usage analytics to help improve reading and performance. Core Quran,
        account, and prayer features work without analytics.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose('accepted')}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-foreground)]"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => choose('declined')}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-heading)]"
        >
          Decline
        </button>
      </div>
    </aside>
  );
}
