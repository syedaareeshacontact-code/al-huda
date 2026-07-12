'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface AppErrorRecoveryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const RECOVERABLE_ASSET_ERROR =
  /chunkloaderror|loading chunk|dynamically imported module|module factory|is not a function/i;

async function clearStaleAppCaches() {
  if ('caches' in window) {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('alhuda-'))
        .map((key) => window.caches.delete(key))
    );
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.update().catch(() => undefined))
    );
  }
}

export default function AppErrorRecovery({ error, reset }: AppErrorRecoveryProps) {
  const [recovering, setRecovering] = useState(false);
  const isAssetMismatch = useMemo(
    () => RECOVERABLE_ASSET_ERROR.test(`${error.name} ${error.message}`),
    [error.message, error.name]
  );

  const refreshLatestVersion = useCallback(async () => {
    if (recovering) return;
    setRecovering(true);

    try {
      await clearStaleAppCaches();
    } finally {
      window.location.reload();
    }
  }, [recovering]);

  useEffect(() => {
    console.error(error);

    if (!isAssetMismatch) return;

    const recoveryKey = `alhuda:error-recovery:${
      process.env.NEXT_PUBLIC_APP_VERSION || 'v3'
    }:${window.location.pathname}`;

    try {
      if (window.sessionStorage.getItem(recoveryKey) === '1') return;
      window.sessionStorage.setItem(recoveryKey, '1');
    } catch {
      // Continue with a single best-effort recovery if storage is unavailable.
    }

    const timer = window.setTimeout(() => void refreshLatestVersion(), 250);
    return () => window.clearTimeout(timer);
  }, [error, isAssetMismatch, refreshLatestVersion]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-16">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-card)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          {recovering ? 'Updating website' : 'Page recovery'}
        </p>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-heading)]">
          {recovering ? 'Loading the latest version…' : 'This page could not load'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)]">
          {isAssetMismatch
            ? 'A newer website version is available. We are clearing the old cached files and refreshing safely.'
            : 'A temporary error occurred. Try the page again, or refresh its cached files.'}
        </p>
        {!recovering ? (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-heading)]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => void refreshLatestVersion()}
              className="rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-accent-foreground)]"
            >
              Refresh safely
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
