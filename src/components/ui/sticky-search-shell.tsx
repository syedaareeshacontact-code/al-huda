'use client';

import { useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

interface StickySearchShellProps extends PropsWithChildren {
  className?: string;
}

export default function StickySearchShell({ children, className }: StickySearchShellProps) {
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setVisible(true);
    lastScrollYRef.current = Math.max(window.scrollY, 0);

    const syncVisibility = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 16) {
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
  }, []);

  return (
    <div
      className={cn(
        'sticky top-[var(--site-header-visible-offset,0px)] z-[80] transform-gpu border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 py-2 backdrop-blur-xl transition-[top,transform] duration-300 ease-out will-change-transform',
        !visible && '-translate-y-full pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
}
