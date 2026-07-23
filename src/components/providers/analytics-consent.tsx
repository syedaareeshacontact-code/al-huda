'use client';

import { useEffect, useState } from 'react';

export const ANALYTICS_CONSENT_KEY = 'alhuda:analytics-consent';
export const ANALYTICS_CONSENT_EVENT = 'alhuda:analytics-consent-changed';

type ConsentValue = 'accepted' | 'declined' | null;

function isLocalhost() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export default function AnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [localMode, setLocalMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocalMode(isLocalhost());
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    setConsent(stored === 'accepted' || stored === 'declined' ? stored : null);
    setReady(true);
  }, []);

  const choose = (value: Exclude<ConsentValue, null>) => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    setConsent(value);
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
  };

  if (!ready || !localMode || consent) {
    return null;
  }

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-card)] sm:p-5"
      aria-label="Local analytics control"
    >
      <p className="font-semibold text-[var(--color-heading)]">Local analytics control</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-text)]">
        Allow analytics only if you want localhost testing to appear in Google Analytics.
        Decline to keep your development work out of tracking.
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
