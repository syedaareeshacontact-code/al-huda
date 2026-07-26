'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

export default function HadithTopSearchShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const pathSegments = pathname.split('/').filter(Boolean);
  const shouldStick = pathSegments[0] === 'hadith';

  useEffect(() => {
    setVisible(true);
    lastScrollYRef.current = Math.max(window.scrollY, 0);

    if (!shouldStick) {
      return;
    }

    const syncVisibility = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollYRef.current;
      const shell = shellRef.current;
      const headerOffset = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--site-header-visible-offset'
        )
      );
      const stickyStartY = shell
        ? Math.max(0, shell.offsetTop - (Number.isFinite(headerOffset) ? headerOffset : 0))
        : 0;
      const keepInFlowY = stickyStartY + (shell?.offsetHeight ?? 0);

      if (currentScrollY <= 16 || currentScrollY <= keepInFlowY) {
        setVisible(true);
        lastScrollYRef.current = currentScrollY;
      } else if (scrollDelta >= 8) {
        setVisible(true);
        lastScrollYRef.current = currentScrollY;
      } else if (scrollDelta <= -8) {
        setVisible(false);
        lastScrollYRef.current = currentScrollY;
      }

      scrollFrameRef.current = null;
    };

    const onScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(syncVisibility);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [pathname, shouldStick]);

  useEffect(() => {
    if (!shouldStick) {
      document.documentElement.style.removeProperty('--hadith-top-search-height');
      document.documentElement.style.removeProperty('--hadith-top-search-visible-offset');
      return;
    }

    const shell = shellRef.current;
    if (!shell) return;

    const syncShellOffset = () => {
      const shellHeight = `${shell.offsetHeight}px`;
      document.documentElement.style.setProperty('--hadith-top-search-height', shellHeight);
      document.documentElement.style.setProperty(
        '--hadith-top-search-visible-offset',
        visible ? shellHeight : '0px'
      );
    };

    syncShellOffset();
    const observer = new ResizeObserver(syncShellOffset);
    observer.observe(shell);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--hadith-top-search-height');
      document.documentElement.style.removeProperty('--hadith-top-search-visible-offset');
    };
  }, [shouldStick, visible]);

  return (
    <div
      ref={shellRef}
      className={cn(
        'relative overflow-visible border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md',
        shouldStick &&
          'sticky top-[var(--site-header-visible-offset,0px)] z-[90] transform-gpu transition-transform duration-300 ease-out will-change-transform',
        shouldStick && !visible && '-translate-y-full pointer-events-none'
      )}
    >
      <span
        className="pointer-events-none absolute inset-y-0 right-0 block w-28 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--color-accent-soft),transparent_78%))] lg:hidden"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-y-2 right-0 block w-px bg-[linear-gradient(180deg,transparent,var(--color-accent-soft),transparent)] lg:hidden"
        aria-hidden="true"
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
