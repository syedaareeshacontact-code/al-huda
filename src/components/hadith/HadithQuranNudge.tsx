'use client';

import Link from 'next/link';
import { ArrowRight, BookOpenText, Headphones, Languages, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
} from '@/components/providers/analytics-consent';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'hadith-quran-nudge-dismissed-v1';
const SHOW_DELAY_MS = 6000;

export interface HadithQuranNudgeLink {
  label: string;
  arabicLabel: string;
  href: string;
}

interface HadithQuranNudgeProps {
  links: HadithQuranNudgeLink[];
}

function hasDismissedNudge() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function hasAnalyticsChoice() {
  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return stored === 'accepted' || stored === 'declined';
  } catch {
    return true;
  }
}

export default function HadithQuranNudge({ links }: HadithQuranNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: number | null = null;

    const scheduleNudge = () => {
      if (timer !== null || hasDismissedNudge() || !hasAnalyticsChoice()) {
        return;
      }

      timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    scheduleNudge();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, scheduleNudge);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, scheduleNudge);
    };
  }, []);

  const rememberDismissal = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <aside
      aria-label="Quran reading suggestion"
      className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-[24rem] animate-fade-up sm:inset-x-auto sm:right-5 sm:mx-0"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_48%)] bg-[color-mix(in_oklab,var(--color-surface),transparent_4%)] shadow-[0_24px_70px_-36px_rgb(0_0_0_/_0.62)] backdrop-blur-xl">
        <span
          className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-accent-soft),transparent)]"
          aria-hidden="true"
        />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_44%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
              <BookOpenText className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Quran Companion
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug text-[var(--color-heading)]">
                Continue with the Quran
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted-text)]">
                Read Arabic, Urdu translation, tafseer, and audio tilawat in one focused reader.
              </p>
            </div>

            <button
              type="button"
              onClick={rememberDismissal}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-text)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              aria-label="Close Quran suggestion"
              title="Close"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {links.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  onClick={rememberDismissal}
                  className="group min-w-0 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_32%)] px-2.5 py-2 text-center transition hover:border-[var(--color-accent-soft)] hover:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_91%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  <span
                    dir="rtl"
                    lang="ar"
                    className="block truncate font-arabic text-base leading-none text-[var(--color-heading)] transition group-hover:text-[var(--color-accent-soft)]"
                  >
                    {link.arabicLabel}
                  </span>
                  <span className="mt-1 block truncate text-[0.68rem] font-semibold text-[var(--color-muted-text)]">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" className="h-9 flex-1 rounded-lg px-3 text-xs">
              <Link href="/surah" prefetch={false} onClick={rememberDismissal}>
                Open Quran
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-lg px-3 text-xs"
            >
              <Link href="/tafsir" prefetch={false} onClick={rememberDismissal}>
                <Languages className="size-3.5" aria-hidden="true" />
                Tafseer
              </Link>
            </Button>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] leading-5 text-[var(--color-muted-text)]">
            <Headphones className="size-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            Listen, read, and reflect after this Hadith.
          </p>
        </div>
      </div>
    </aside>
  );
}
