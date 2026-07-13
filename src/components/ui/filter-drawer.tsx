'use client';

import { useEffect, type PropsWithChildren } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface FilterDrawerProps extends PropsWithChildren {
  open: boolean;
  title: string;
  summary?: string;
  onClose: () => void;
}

export default function FilterDrawer({
  open,
  title,
  summary,
  onClose,
  children,
}: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[150]">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close filters"
      />
      <aside className="absolute left-0 top-0 flex h-dvh w-[min(24rem,calc(100vw-1rem))] animate-fade-up flex-col border-r border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[var(--color-surface)] shadow-2xl">
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Filters
            </p>
            <h2 className="mt-1 font-display text-2xl text-[var(--color-heading)]">
              {title}
            </h2>
            {summary ? (
              <p className="mt-1 text-xs text-[var(--color-muted-text)]">{summary}</p>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Close filters">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </aside>
    </div>
  );
}
