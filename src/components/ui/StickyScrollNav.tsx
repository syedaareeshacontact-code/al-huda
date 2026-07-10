'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StickyScrollNavProps {
  position?: 'left' | 'right';
  minScroll?: number;
  bottomClassName?: string;
  compact?: boolean;
}

export default function StickyScrollNav({
  position = 'right',
  minScroll = 400,
  bottomClassName,
  compact = false,
}: StickyScrollNavProps = {}) {
  const [isVisible, setIsVisible] = useState(minScroll === 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > minScroll);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [minScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  const positionClassName =
    bottomClassName ??
    (position === 'left' ? 'bottom-24 left-4 sm:left-6' : 'bottom-8 right-8');

  const buttonClassName = compact
    ? 'h-8 w-8 rounded-full bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)] border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] text-[var(--color-accent)] shadow-lg hover:bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_15%)] hover:text-[color-mix(in_oklab,var(--color-accent),white_15%)] transition-all duration-200 sm:h-10 sm:w-10'
    : 'h-10 w-10 rounded-full bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)] border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] text-[var(--color-accent)] shadow-lg hover:bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_15%)] hover:text-[color-mix(in_oklab,var(--color-accent),white_15%)] transition-all duration-200';

  const iconClassName = compact ? 'size-4 sm:size-5' : 'size-5';

  return (
    <div
      className={`fixed z-[65] flex flex-col gap-1.5 sm:gap-2 ${positionClassName}`}
      aria-label="Scroll navigation"
    >
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToTop}
        className={buttonClassName}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <ArrowUp className={iconClassName} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToBottom}
        className={buttonClassName}
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
      >
        <ArrowDown className={iconClassName} />
      </Button>
    </div>
  );
}
