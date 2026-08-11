'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BookCheck, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SmartAyahScrollNavProps {
  ayahNumbers?: number[];
  totalAyahs?: number;
  activeAudioAyahNumber?: number | null;
  lastReadAyahNumber?: number | null;
  isPlaying?: boolean;
  hasAudioPlayer?: boolean;
  onLastReadShortcut?: () => void;
  onViewportAyahChange?: (ayahNumber: number | null) => void;
}

function getViewportCenterAyah(ayahNumbers: number[]) {
  const viewportCenter = window.scrollY + window.innerHeight / 2;
  let closestAyah: number | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  ayahNumbers.forEach((ayahNumber) => {
    const element = document.getElementById(`ayah-${ayahNumber}`);
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const elementCenter = rect.top + window.scrollY + rect.height / 2;
    const distance = Math.abs(elementCenter - viewportCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestAyah = ayahNumber;
    }
  });

  return closestAyah;
}

function isAyahInViewport(ayahNumber: number) {
  const element = document.getElementById(`ayah-${ayahNumber}`);
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const margin = window.innerHeight * 0.2;
  return rect.top >= -margin && rect.bottom <= window.innerHeight + margin;
}

export default function SmartAyahScrollNav({
  ayahNumbers = [],
  totalAyahs,
  activeAudioAyahNumber = null,
  lastReadAyahNumber = null,
  isPlaying = false,
  hasAudioPlayer = false,
  onLastReadShortcut,
  onViewportAyahChange,
}: SmartAyahScrollNavProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [userScrolledAway, setUserScrolledAway] = useState(false);
  const [lastReadScrolledAway, setLastReadScrolledAway] = useState(false);
  const [viewportAyahNumber, setViewportAyahNumber] = useState<number | null>(null);
  const audioAnchorRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);
  const scrollResetTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(false);
  const userScrolledAwayRef = useRef(false);
  const lastReadScrolledAwayRef = useRef(false);
  const viewportAyahNumberRef = useRef<number | null>(null);
  const onViewportAyahChangeRef = useRef(onViewportAyahChange);

  const sortedAyahNumbers = useMemo(
    () => [...ayahNumbers].sort((left, right) => left - right),
    [ayahNumbers]
  );
  onViewportAyahChangeRef.current = onViewportAyahChange;

  const hasAyahNav = sortedAyahNumbers.length > 0;

  const scrollToAyah = useCallback((ayahNumber: number) => {
    const target = document.getElementById(`ayah-${ayahNumber}`);
    if (!target) {
      return;
    }

    programmaticScrollRef.current = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (scrollResetTimerRef.current) {
      window.clearTimeout(scrollResetTimerRef.current);
    }

    scrollResetTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 700);
  }, []);

  useEffect(() => {
    if (!isPlaying || !activeAudioAyahNumber) {
      return;
    }

    audioAnchorRef.current = activeAudioAyahNumber;
    if (userScrolledAwayRef.current) {
      userScrolledAwayRef.current = false;
      setUserScrolledAway(false);
    }
  }, [activeAudioAyahNumber, isPlaying]);

  useEffect(() => {
    const updateFromScroll = () => {
      frameRef.current = null;
      const nextViewportAyah = getViewportCenterAyah(sortedAyahNumbers);
      if (nextViewportAyah !== viewportAyahNumberRef.current) {
        viewportAyahNumberRef.current = nextViewportAyah;
        setViewportAyahNumber(nextViewportAyah);
        onViewportAyahChangeRef.current?.(nextViewportAyah);
      }

      const nextVisible = window.scrollY > 200;
      if (nextVisible !== isVisibleRef.current) {
        isVisibleRef.current = nextVisible;
        setIsVisible(nextVisible);
      }

      const nextLastReadScrolledAway = Boolean(
        nextVisible &&
          lastReadAyahNumber &&
          !isAyahInViewport(lastReadAyahNumber)
      );

      if (nextLastReadScrolledAway !== lastReadScrolledAwayRef.current) {
        lastReadScrolledAwayRef.current = nextLastReadScrolledAway;
        setLastReadScrolledAway(nextLastReadScrolledAway);
      }

      if (
        !isPlaying ||
        !audioAnchorRef.current ||
        programmaticScrollRef.current
      ) {
        return;
      }

      const anchorAyah = audioAnchorRef.current;
      if (!isAyahInViewport(anchorAyah) && !userScrolledAwayRef.current) {
        userScrolledAwayRef.current = true;
        setUserScrolledAway(true);
      }
    };

    const handleScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isPlaying, lastReadAyahNumber, sortedAyahNumbers]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      if (scrollResetTimerRef.current) {
        window.clearTimeout(scrollResetTimerRef.current);
      }
    };
  }, []);

  const scrollToPreviousAyah = () => {
    if (!hasAyahNav) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const currentAyah = getViewportCenterAyah(sortedAyahNumbers) ?? sortedAyahNumbers[0];
    const currentIndex = sortedAyahNumbers.indexOf(currentAyah);
    const previousAyah =
      currentIndex > 0 ? sortedAyahNumbers[currentIndex - 1] : sortedAyahNumbers[0];

    scrollToAyah(previousAyah);
  };

  const scrollToNextAyah = () => {
    if (!hasAyahNav) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      });
      return;
    }

    const currentAyah =
      getViewportCenterAyah(sortedAyahNumbers) ??
      sortedAyahNumbers[sortedAyahNumbers.length - 1];
    const currentIndex = sortedAyahNumbers.indexOf(currentAyah);
    const nextAyah =
      currentIndex >= 0 && currentIndex < sortedAyahNumbers.length - 1
        ? sortedAyahNumbers[currentIndex + 1]
        : sortedAyahNumbers[sortedAyahNumbers.length - 1];

    scrollToAyah(nextAyah);
  };

  const scrollBackToAudio = () => {
    if (!audioAnchorRef.current) {
      return;
    }

    scrollToAyah(audioAnchorRef.current);
    userScrolledAwayRef.current = false;
    setUserScrolledAway(false);
  };

  const scrollBackToLastRead = () => {
    if (!lastReadAyahNumber) {
      return;
    }

    if (onLastReadShortcut) {
      onLastReadShortcut();
    } else {
      scrollToAyah(lastReadAyahNumber);
    }

    lastReadScrolledAwayRef.current = false;
    setLastReadScrolledAway(false);
  };

  if (!isVisible) {
    return null;
  }

  const showBackToAudio =
    isPlaying && userScrolledAway && audioAnchorRef.current !== null;
  const showBackToLastRead = Boolean(lastReadAyahNumber && lastReadScrolledAway);
  const progressTotal = Math.max(totalAyahs ?? sortedAyahNumbers.length, 1);
  const viewportAyahPosition = viewportAyahNumber
    ? sortedAyahNumbers.indexOf(viewportAyahNumber) + 1
    : 0;
  const viewportProgress = viewportAyahPosition
    ? Math.min(100, Math.max(0, (viewportAyahPosition / progressTotal) * 100))
    : 0;

  return (
    <div
      className={cn(
        'fixed right-3 z-[68] flex flex-col gap-2 md:right-4',
        hasAudioPlayer
          ? 'bottom-[calc(13.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[12.25rem]'
          : 'bottom-8'
      )}
      aria-label="Ayah scroll navigation"
    >
      {showBackToLastRead ? (
        <Button
          variant="default"
          size="icon"
          onClick={scrollBackToLastRead}
          className="size-10 rounded-full shadow-lg"
          aria-label={`Back to last read ayah ${lastReadAyahNumber}`}
          title={`Back to last read Ayah ${lastReadAyahNumber}`}
        >
          <BookCheck className="size-5" />
        </Button>
      ) : null}

      {showBackToAudio ? (
        <Button
          variant="default"
          size="icon"
          onClick={scrollBackToAudio}
          className="size-10 rounded-full shadow-lg"
          aria-label={`Back to playing ayah ${audioAnchorRef.current}`}
          title={`Back to Ayah ${audioAnchorRef.current}`}
        >
          <MapPin className="size-5" />
        </Button>
      ) : null}

      <Button
        variant="outline"
        size="icon"
        onClick={scrollToPreviousAyah}
        className="hidden size-10 rounded-full border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)] text-[var(--color-accent)] shadow-lg hover:bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_15%)] md:inline-flex"
        aria-label={hasAyahNav ? 'Previous ayah' : 'Scroll to top'}
        title={hasAyahNav ? 'Previous ayah' : 'Scroll to top'}
      >
        <ArrowUp className="size-5" />
      </Button>

      {viewportAyahNumber ? (
        <div
          className="hidden w-16 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)] px-2 py-1.5 text-center shadow-lg md:block"
          aria-label={`Viewport ayah ${viewportAyahNumber}, position ${viewportAyahPosition} of ${progressTotal}`}
        >
          <p className="text-[0.62rem] font-bold leading-none text-[var(--color-heading)]">
            Ayah {viewportAyahNumber}
          </p>
          <p className="mt-1 text-[0.58rem] font-semibold leading-none tabular-nums text-[var(--color-muted-text)]">
            {viewportAyahPosition} / {progressTotal}
          </p>
          <div
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-border),transparent_25%)]"
            role="progressbar"
            aria-label="Ayah reading progress"
            aria-valuemin={0}
            aria-valuemax={progressTotal}
            aria-valuenow={viewportAyahPosition}
          >
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
              style={{ width: `${viewportProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      <Button
        variant="outline"
        size="icon"
        onClick={scrollToNextAyah}
        className="hidden size-10 rounded-full border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)] text-[var(--color-accent)] shadow-lg hover:bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_15%)] md:inline-flex"
        aria-label={hasAyahNav ? 'Next ayah' : 'Scroll to bottom'}
        title={hasAyahNav ? 'Next ayah' : 'Scroll to bottom'}
      >
        <ArrowDown className="size-5" />
      </Button>
    </div>
  );
}
