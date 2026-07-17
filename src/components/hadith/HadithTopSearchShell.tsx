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

  return (
    <div
      ref={shellRef}
      className={cn(
        'border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md',
        shouldStick &&
          'sticky top-[var(--site-header-visible-offset,0px)] z-[80] transform-gpu transition-transform duration-300 ease-out will-change-transform',
        shouldStick && !visible && '-translate-y-full pointer-events-none'
      )}
    >
      {children}
    </div>
  );
}
