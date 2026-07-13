'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Loader2, Menu, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface StickyNavigatorMenuButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
  isNavigatorOpen?: boolean;
  surahName?: string;
  surahArabicName?: string;
  surahMeta?: string;
  showAudioShortcut?: boolean;
  audioShortcutPending?: boolean;
  audioShortcutDisabled?: boolean;
  onAudioShortcut?: () => void;
}

export default function StickyNavigatorMenuButton({
  targetRef,
  onOpen,
  isNavigatorOpen = false,
  surahName = 'Surah navigator',
  surahArabicName,
  surahMeta,
  showAudioShortcut = false,
  audioShortcutPending = false,
  audioShortcutDisabled = false,
  onAudioShortcut,
}: StickyNavigatorMenuButtonProps) {
  const [targetHidden, setTargetHidden] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setTargetHidden(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-8px 0px 0px 0px',
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  useEffect(() => {
    let lastScrollY = Math.max(window.scrollY, 0);
    let frame: number | null = null;

    const syncDirection = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY <= 16) {
        setIsScrollingDown(false);
      } else if (delta >= 6) {
        setIsScrollingDown(true);
        lastScrollY = currentScrollY;
      } else if (delta <= -6) {
        setIsScrollingDown(false);
        lastScrollY = currentScrollY;
      }

      frame = null;
    };

    const onScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(syncDirection);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  const showSticky = targetHidden && isScrollingDown && !isNavigatorOpen;

  if (!showSticky) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[99] animate-fade-up">
      <div className="flex h-12 w-full items-center gap-2 border-y border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_48%)] bg-[color-mix(in_oklab,var(--color-surface),transparent_4%)] px-2 shadow-[var(--shadow-card)] backdrop-blur-xl sm:h-[3.25rem] sm:px-4">
        {showAudioShortcut && onAudioShortcut ? (
          <Button
            type="button"
            size="icon"
            variant="default"
            onClick={onAudioShortcut}
            disabled={audioShortcutDisabled}
            aria-label="Play Surah audio"
            title="Play Surah audio"
            className="size-8 shrink-0 rounded-full sm:size-9"
          >
            {audioShortcutPending ? (
              <Loader2 className="size-3.5 animate-spin sm:size-4" />
            ) : (
              <Play className="ml-0.5 size-3.5 fill-current sm:size-4" />
            )}
          </Button>
        ) : null}

        {surahArabicName ? (
          <p className="arabic-font min-w-0 max-w-[36vw] truncate text-left text-lg leading-none text-[var(--color-accent-soft)] sm:max-w-[18rem] sm:text-xl" dir="rtl" lang="ar">
            {surahArabicName}
          </p>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold text-[var(--color-heading)] sm:text-base">
              {surahName}
            </p>
            {surahMeta ? (
              <span className="hidden shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-text)] sm:inline-flex">
                {surahMeta}
              </span>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onOpen}
          aria-label="Open Surah navigator"
          title="Surah navigator"
          className="size-9 shrink-0 animate-pulse-border rounded-lg border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)]"
        >
          <Menu className="size-4" />
        </Button>
      </div>
    </div>
  );
}
