'use client';

import Link from 'next/link';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  getInitialBannerIndex,
  getTimeBasedGreeting,
  ISLAMIC_BANNER_ITEMS,
} from '@/lib/islamic-banner-content';
import { cn } from '@/lib/utils';

const ROTATE_MS = 9000;

export default function IslamicTopBanner() {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    setIndex(getInitialBannerIndex());

    try {
      setDismissed(sessionStorage.getItem('islamic-banner-dismissed') === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || dismissed) return;

    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % ISLAMIC_BANNER_ITEMS.length);
        setVisible(true);
      }, 350);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [mounted, dismissed]);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('islamic-banner-dismissed', '1');
    } catch {
      // ignore storage errors
    }
  };

  if (dismissed) {
    return null;
  }

  const item = ISLAMIC_BANNER_ITEMS[index];
  const greeting = mounted ? getTimeBasedGreeting() : 'Daily inspiration';

  return (
    <div
      className="relative overflow-x-hidden border-b border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-accent),#0b2017_88%)_0%,color-mix(in_oklab,var(--color-accent-soft),#13382b_82%)_50%,color-mix(in_oklab,var(--color-accent),#1a1408_88%)_100%)] text-[var(--color-accent-foreground)]"
      role="region"
      aria-label="Islamic inspiration banner"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.45\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="relative mx-auto flex h-12 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] sm:flex">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{greeting}</span>
        </div>

        <div
          className={cn(
            'flex h-10 min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3 transition-all duration-300',
            visible ? 'translate-y-0 opacity-100' : 'translate-y-0.5 opacity-0'
          )}
        >
          {item.arabic ? (
            <>
              <p
                dir="rtl"
                lang="ar"
                className="max-w-[46%] shrink-0 truncate font-arabic-amiri text-sm leading-normal sm:max-w-[40%] sm:text-[15px]"
              >
                {item.arabic}
              </p>
              <span
                className="h-3.5 w-px shrink-0 bg-white/25"
                aria-hidden="true"
              />
            </>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <p className="min-w-0 truncate text-[11px] font-medium text-white/90 sm:text-sm">
              {item.text}
            </p>
            <span
              className={cn(
                'shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] text-white/70 sm:text-[11px]',
                item.arabic ? 'hidden sm:inline-flex' : 'inline-flex'
              )}
            >
              {item.source}
            </span>
          </div>
        </div>

        {item.href && item.cta && (
          <Link
            href={item.href}
            prefetch={false}
            className="hidden shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 sm:inline-flex"
          >
            {item.cta}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
